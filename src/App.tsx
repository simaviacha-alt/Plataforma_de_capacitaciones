import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserProgress } from './types';
import RegistrationForm from './components/RegistrationForm';
import MainDashboard from './components/MainDashboard';
import AdminPanel from './components/AdminPanel';
import { ShieldCheck, Video, HelpCircle, HardDrive, Heart, UserCheck } from 'lucide-react';
import { 
  syncUserToGoogleSheets, 
  fetchUsersFromServer, 
  saveUserToServer, 
  syncBulkUsersToServer, 
  deleteUserFromServer, 
  resetServerUsers 
} from './utils/syncService';
// @ts-ignore
import logoViacha from './assets/images/logo_viacha_1784075276927.jpg';

const LOCAL_STORAGE_KEY = 'soboce_sima_users';

// Starting baseline
const INITIAL_PEOPLE: UserProgress[] = [];

// Helper to merge two lists of users by CI without losing progress
function mergeUserLists(primary: UserProgress[], secondary: UserProgress[]): UserProgress[] {
  const map = new Map<string, UserProgress>();

  // Add all primary
  primary.forEach(u => {
    if (u && u.ci) {
      map.set(u.ci.trim().toUpperCase(), { ...u });
    }
  });

  // Merge with secondary
  secondary.forEach(u => {
    if (!u || !u.ci) return;
    const ci = u.ci.trim().toUpperCase();
    if (map.has(ci)) {
      const existing = map.get(ci)!;
      // Merge progress ensuring video percentages never downgrade
      const mergedVideoProgress = { ...(existing.videoProgress || {}) };
      if (u.videoProgress) {
        Object.keys(u.videoProgress).forEach(vidKey => {
          const existingVal = Number(mergedVideoProgress[vidKey]) || 0;
          const incomingVal = Number(u.videoProgress[vidKey]) || 0;
          mergedVideoProgress[vidKey] = Math.max(existingVal, incomingVal);
        });
      }
      const mergedExamAttempts = { ...(existing.examAttempts || {}) };
      if (u.examAttempts) {
        Object.keys(u.examAttempts).forEach(k => {
          const listA = existing.examAttempts?.[k] || [];
          const listB = u.examAttempts?.[k] || [];
          const combined = [...listA];
          listB.forEach(item => {
            if (!combined.some(c => c.date === item.date && c.score === item.score)) {
              combined.push(item);
            }
          });
          mergedExamAttempts[k] = combined;
        });
      }
      map.set(ci, {
        ...existing,
        ...u,
        videoProgress: mergedVideoProgress,
        examAttempts: mergedExamAttempts
      });
    } else {
      map.set(ci, { ...u });
    }
  });

  return Array.from(map.values());
}

export default function App() {
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProgress | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Sync users back to localStorage and server
  const saveToStorage = useCallback((updatedUsers: UserProgress[]) => {
    setUsers(updatedUsers);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedUsers));
    // Persist to central server
    syncBulkUsersToServer(updatedUsers).catch(console.error);
  }, []);

  // Initial load and sync with server
  useEffect(() => {
    // 1. First load from local storage
    let localUsers: UserProgress[] = [];
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localUsers = parsed;
          setUsers(parsed);
        }
      } catch (e) {
        console.error("Error parsing users from storage", e);
      }
    }

    // 2. Fetch from central server database
    fetchUsersFromServer().then(serverUsers => {
      if (serverUsers) {
        const merged = mergeUserLists(serverUsers, localUsers);
        setUsers(merged);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
        // If local had records the server didn't, send them
        if (localUsers.length > 0) {
          syncBulkUsersToServer(merged).catch(console.error);
        }
      } else if (localUsers.length > 0) {
        syncBulkUsersToServer(localUsers).catch(console.error);
      }
    }).catch(console.error);

    // 3. Periodic background refresh every 10 seconds to keep all devices in sync
    const interval = setInterval(() => {
      fetchUsersFromServer().then(serverUsers => {
        if (serverUsers && Array.isArray(serverUsers)) {
          setUsers(prevUsers => {
            const merged = mergeUserLists(serverUsers, prevUsers);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      }).catch(() => {});
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleRegisterOrResume = (user: UserProgress) => {
    const cleanCi = user.ci.trim().toUpperCase();
    const existing = users.find(u => u.ci.toUpperCase() === cleanCi);
    
    let updatedUsers = [...users];

    if (existing) {
      // Check if this is an explicit reclassification (different role, contractor type, company, plant, or empty progress while existing had progress)
      const hasDifferentRole = existing.rol !== user.rol || existing.contratistaTipo !== user.contratistaTipo;
      const hasDifferentCompanyOrPlant = existing.empresa !== user.empresa || existing.planta !== user.planta;
      const isExplicitReclassification = Object.keys(user.videoProgress || {}).length === 0 && (Object.keys(existing.videoProgress || {}).length > 0 || Object.keys(existing.examAttempts || {}).length > 0);

      if (hasDifferentRole || hasDifferentCompanyOrPlant || isExplicitReclassification) {
        // It's a reclassification! Update it in the database and reset progress
        // But preserve general induction progress (videos & exams) for contractor types I, II, and III
        const isContractorType = (user.contratistaTipo && ['I', 'II', 'III'].includes(user.contratistaTipo)) || 
                                 (existing.contratistaTipo && ['I', 'II', 'III'].includes(existing.contratistaTipo)) ||
                                 user.rol === 'soboce' || existing.rol === 'soboce' ||
                                 user.rol === 'contratista' || existing.rol === 'contratista';

        const preservedVideoProgress: { [key: string]: number } = {};
        const preservedExamAttempts: { [key: string]: any[] } = {};

        if (isContractorType) {
          const generalVideoIds = ['v_general_1', 'v_general_2', 'v_solicitante_1'];
          const generalExamIds = ['general_induction', 'solicitante_paep'];

          generalVideoIds.forEach(vid => {
            if (existing.videoProgress && existing.videoProgress[vid] !== undefined) {
              preservedVideoProgress[vid] = existing.videoProgress[vid];
            }
          });

          generalExamIds.forEach(examId => {
            if (existing.examAttempts && existing.examAttempts[examId] !== undefined) {
              preservedExamAttempts[examId] = existing.examAttempts[examId];
            }
          });
        }

        const reclassifiedUser: UserProgress = {
          ...existing,
          rol: user.rol,
          contratistaTipo: user.contratistaTipo,
          empresa: user.empresa,
          planta: user.planta,
          videoProgress: preservedVideoProgress,
          examAttempts: preservedExamAttempts,
          lockoutUntil: null
        };
        const updatedList = users.map(u => 
          u.ci.toUpperCase() === cleanCi ? reclassifiedUser : u
        );
        saveToStorage(updatedList);
        setCurrentUser(reclassifiedUser);
        saveUserToServer(reclassifiedUser).catch(console.error);
        syncUserToGoogleSheets('RECLASIFICACION', reclassifiedUser).catch(console.error);
      } else {
        // Resume existing session
        setCurrentUser(existing);
        saveUserToServer(existing).catch(console.error);
        syncUserToGoogleSheets('REGISTRO_INICIAL', existing).catch(console.error);
      }
    } else {
      // Register new student and log to database
      updatedUsers = [...users, user];
      saveToStorage(updatedUsers);
      setCurrentUser(user);
      saveUserToServer(user).catch(console.error);
      syncUserToGoogleSheets('REGISTRO_INICIAL', user).catch(console.error);
    }
  };

  const getAttemptCount = (u: UserProgress) => {
    let count = 0;
    Object.values(u.examAttempts || {}).forEach(arr => {
      count += arr.length;
    });
    return count;
  };

  const syncDebounceRef = useRef<{ [ci: string]: NodeJS.Timeout }>({});

  const handleUpdateUserProgress = (updatedUser: UserProgress) => {
    const exists = users.some(u => u.ci.toUpperCase() === updatedUser.ci.toUpperCase());
    const updatedList = exists
      ? users.map(u => u.ci.toUpperCase() === updatedUser.ci.toUpperCase() ? updatedUser : u)
      : [...users, updatedUser];
    
    saveToStorage(updatedList);
    
    // Check if an exam attempt was added
    const oldAttemptCount = currentUser ? getAttemptCount(currentUser) : 0;
    const newAttemptCount = getAttemptCount(updatedUser);
    const isExamAttempt = newAttemptCount > oldAttemptCount;
    const action: 'EXAMEN_FINAL' | 'PROMEDIO_AVANCE' = isExamAttempt ? 'EXAMEN_FINAL' : 'PROMEDIO_AVANCE';
    
    setCurrentUser(updatedUser);
    saveUserToServer(updatedUser).catch(console.error);

    const userCi = updatedUser.ci.toUpperCase();
    if (syncDebounceRef.current[userCi]) {
      clearTimeout(syncDebounceRef.current[userCi]);
      delete syncDebounceRef.current[userCi];
    }

    // Detect if a video just reached 100%
    const hadAnyNew100Video = Object.keys(updatedUser.videoProgress || {}).some(vidId => {
      const oldPct = currentUser?.videoProgress?.[vidId] || 0;
      const newPct = updatedUser.videoProgress?.[vidId] || 0;
      return newPct >= 100 && oldPct < 100;
    });

    if (isExamAttempt) {
      // Exams sync immediately to Google Sheets
      syncUserToGoogleSheets(action, updatedUser).catch(console.error);
    } else if (hadAnyNew100Video) {
      // Completed video syncs immediately to visualization sheet and general sheet
      const visSheet = updatedUser.rol === 'autorizante' ? 'AUTORIZANTE PAEP' : 'INDUCCION VISUALIZACIONES';
      syncUserToGoogleSheets('VIDEO_COMPLETADO', updatedUser, visSheet).catch(console.error);
      syncUserToGoogleSheets('PROMEDIO_AVANCE', updatedUser, 'REGISTROS_SIMA').catch(console.error);
    } else {
      // Debounce video incremental watching progress to Google Sheets by 8 seconds to prevent spamming while video plays
      syncDebounceRef.current[userCi] = setTimeout(() => {
        syncUserToGoogleSheets(action, updatedUser).catch(console.error);
        delete syncDebounceRef.current[userCi];
      }, 8000);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // Administration resets and unlocking triggers
  const handleResetDatabase = () => {
    if (window.confirm("⚠️ ¿Está seguro que desea reiniciar toda la plataforma de capacitación? Se borrarán todos los historiales de avance y exámenes de los trabajadores en todos los dispositivos.")) {
      saveToStorage(INITIAL_PEOPLE);
      setCurrentUser(null);
      resetServerUsers().catch(console.error);
      alert("La base de datos original ha sido restablecida en el servidor y localmente.");
    }
  };

  const handleClearLockout = (ci: string) => {
    let unlockedUser: UserProgress | null = null;
    const updatedList = users.map(u => {
      if (u.ci.toUpperCase() === ci.toUpperCase()) {
        unlockedUser = { ...u, lockoutUntil: null };
        return unlockedUser;
      }
      return u;
    });
    saveToStorage(updatedList);
    
    // Sync current session if unlocked CI matches active user
    if (currentUser && currentUser.ci.toUpperCase() === ci.toUpperCase()) {
      setCurrentUser({ ...currentUser, lockoutUntil: null });
    }
    
    if (unlockedUser) {
      saveUserToServer(unlockedUser).catch(console.error);
      syncUserToGoogleSheets('DESBLOQUEO', unlockedUser).catch(console.error);
    }
    alert(`La sanción para el C.I. ${ci} ha sido revocada.`);
  };

  const handleDeleteUser = (ci: string) => {
    if (window.confirm(`¿Seguro que desea eliminar el registro de trabajador de C.I.: ${ci}?`)) {
      const targetUser = users.find(u => u.ci.toUpperCase() === ci.toUpperCase());
      const filtered = users.filter(u => u.ci.toUpperCase() !== ci.toUpperCase());
      saveToStorage(filtered);
      deleteUserFromServer(ci).catch(console.error);
      if (currentUser && currentUser.ci.toUpperCase() === ci.toUpperCase()) {
        setCurrentUser(null);
      }
      if (targetUser) {
        syncUserToGoogleSheets('ELIMINADO', targetUser).catch(console.error);
      }
    }
  };

  const handleAddManualUser = (user: UserProgress) => {
    // Check if CI already exists to prevent duplicate
    const cleanCi = user.ci.toUpperCase();
    if (users.some(u => u.ci.toUpperCase() === cleanCi)) {
      alert(`Error: Ya existe un registro con la Cédula ${user.ci}.`);
      return;
    }
    const updated = [...users, user];
    saveToStorage(updated);
    saveUserToServer(user).catch(console.error);
    syncUserToGoogleSheets('REGISTRO_INICIAL', user).catch(console.error);
  };

  return (
    <div className="min-h-screen bg-slate-200 flex flex-col justify-between font-sans antialiased text-slate-900 selection:bg-emerald-100 relative">
      
      {/* Background Watermark Logo - Centered on the entire page, larger and beautifully transparent */}
      <div className="fixed inset-0 flex items-center justify-center opacity-[0.16] pointer-events-none select-none z-[0]">
        <img 
          src={logoViacha} 
          alt="Watermark SOBOCE S.A." 
          className="w-[min(650px,95vw)] h-[min(650px,95vh)] object-contain"
          referrerPolicy="no-referrer"
        />
      </div>
      
      {/* Top Navigation / Brand Banner with Professional Polish Theme */}
      <header className="bg-slate-900 border-b-2 border-emerald-600 sticky top-0 z-30 shadow-lg shrink-0">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div>
              <span className="block text-[10px] font-mono font-bold tracking-widest text-emerald-400 uppercase leading-none mb-1">
                SOBOCE S.A. • Planta Viacha
              </span>
              <h1 className="text-xs md:text-sm font-bold font-display text-white tracking-wide uppercase leading-none animate-fade-in">
                Plataforma de Capacitación Integral
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-4">
                <div className="text-right border-r border-slate-700 pr-4 hidden md:block">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider font-mono">USUARIO IDENTIFICADO</p>
                  <p className="text-xs font-semibold text-slate-200 font-mono">
                    {currentUser.nombres} {currentUser.apellidoPaterno} | CI: {currentUser.ci}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">SESIÓN ACTIVA</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-right hidden md:block">
                  <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider font-mono">ACCESO OFICIAL</p>
                  <p className="text-xs font-semibold text-slate-200 font-mono">REGISTRO DE PERSONAL</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-200 tracking-wider uppercase font-mono">IDENTIFICACIÓN</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Core Router View */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-2 sm:p-4 md:p-8 flex items-center justify-center">
        {currentUser ? (
          <MainDashboard 
            user={currentUser}
            onUpdateUserProgress={handleUpdateUserProgress}
            onLogout={handleLogout}
          />
        ) : (
          <RegistrationForm 
            onRegister={handleRegisterOrResume}
            onAdminOpen={() => setIsAdminOpen(true)}
            existingUsers={users}
          />
        )}
      </main>

      {/* Admin Panel Tracker */}
      {isAdminOpen && (
        <AdminPanel 
          onClose={() => setIsAdminOpen(false)}
          users={users}
          onResetDatabase={handleResetDatabase}
          onClearLockout={handleClearLockout}
          onDeleteUser={handleDeleteUser}
          onAddManualUser={handleAddManualUser}
          onRefreshUsers={async () => {
            const serverUsers = await fetchUsersFromServer();
            if (serverUsers) {
              const merged = mergeUserLists(serverUsers, users);
              setUsers(merged);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            }
          }}
        />
      )}

      {/* GLOBAL FOOTER - MUST INCLUDE DETAILED UNALTERABLE SIGNATURE STAMP */}
      <footer className="bg-white border-t border-slate-100 py-4 px-6 mt-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          
          {/* CRITICAL: SELLO DE AUTORÍA INALTERABLE BOTTOM LEFT */}
          <div className="font-sans text-slate-600 font-medium">
            <span id="sello_autoria_footer" className="font-mono font-bold text-slate-500 tracking-wider flex items-center gap-1 select-none pointer-events-auto">
              Por: <span className="text-slate-800 underline font-extrabold select-all">Carla Callizaya</span>
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[10px]">
            <span>© 2026 Sociedad Boliviana de Cemento S.A.</span>
            <span>•</span>
            <span>Seguridad Industrial y Medio Ambiente (SIMA)</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
