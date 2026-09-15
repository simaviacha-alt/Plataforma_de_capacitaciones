import { UserProgress } from '../types';
import { INITIAL_VIDEOS } from '../data/videos';

const STORAGE_API_KEY = 'soboce_sima_appscript_url';
const DEFAULT_URL = 'https://script.google.com/macros/s/AKfycbzy2Z49636byOM2n5reQkkWFanxRmFvCPEjgiIbnF9PtfqwbRLtPPMauoZ4k_LLq_zz/exec';

// Get current endpoint URL
export function getAppsScriptUrl(): string {
  const url = localStorage.getItem(STORAGE_API_KEY);
  return url ? url.trim() : DEFAULT_URL;
}

// Set new endpoint URL
export function setAppsScriptUrl(url: string): void {
  localStorage.setItem(STORAGE_API_KEY, url.trim());
}

// Sync object format
export interface SyncData {
  timestamp: string;
  action: string;
  sheetName: string;
  ci: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  empresa: string;
  planta: string;
  rol: string;
  videoCount: number | string;
  totalProgressPct: number;
  lastExamScore: string;
  examPassed: boolean;
  lockoutState: string;
  rawProgress: string;
  rawExamAttempts: string;
  videoCompletedTitle?: string;
  completedVideosList?: string;
  videoCountNumber?: number;
  totalAssignedVideos?: number;
}

/**
 * Returns the list of video IDs required for a user based on their role and contractor type.
 */
export function getAssignedVideoIds(user: UserProgress): string[] {
  if (user.rol === 'visita') return ['v_visita_1'];
  if (user.rol === 'conductor') return ['v_conductor_1'];
  if (user.rol === 'autorizante') {
    return [
      'v_autorizante_1', 'v_autorizante_2', 'v_autorizante_3_1', 
      'v_autorizante_3_2', 'v_autorizante_4', 'v_autorizante_5', 'v_autorizante_6'
    ];
  }

  // General induction videos (Safety, Environment, Solicitante PAEP)
  const generalVids = ['v_general_1', 'v_general_2', 'v_solicitante_1'];
  const type = user.contratistaTipo || 'III';
  if (type === 'I' || type === 'II' || user.rol === 'soboce' || user.rol === 'contratista') {
    const contratistaVids = [
      'v_contratista_1', 'v_contratista_2', 'v_contratista_3', 'v_contratista_4',
      'v_contratista_5', 'v_contratista_6', 'v_contratista_7', 'v_contratista_8', 'v_contratista_9'
    ];
    return [...generalVids, ...contratistaVids];
  }
  return generalVids;
}

/**
 * Returns detailed list of completed videos (at 100%) with their exact names
 */
export function getCompletedVideosList(user: UserProgress): {
  titles: string[];
  formatted: string;
  count: number;
  total: number;
} {
  const assignedIds = getAssignedVideoIds(user);
  const vProgress = user.videoProgress || {};
  const completedTitles: string[] = [];

  assignedIds.forEach(id => {
    if ((vProgress[id] || 0) >= 100) {
      const vidObj = INITIAL_VIDEOS.find(v => v.id === id);
      if (vidObj) {
        completedTitles.push(vidObj.title);
      } else {
        completedTitles.push(id);
      }
    }
  });

  return {
    titles: completedTitles,
    formatted: completedTitles.length > 0 ? completedTitles.join(' | ') : 'NINGUNO AL 100%',
    count: completedTitles.length,
    total: assignedIds.length
  };
}

/**
 * Sends a robust webhook payload to the Google Apps Script Web App.
 * We send standard query parameters + raw JSON body so that the Apps Script e.parameter 
 * or e.postData works perfectly depending on the script's exact implementation!
 */
export async function syncUserToGoogleSheets(
  action: 'PROMEDIO_AVANCE' | 'REGISTRO_INICIAL' | 'EXAMEN_FINAL' | 'DESBLOQUEO' | 'ELIMINADO' | 'TEST_CONEXION' | 'RECLASIFICACION' | 'INDUCCION_VISUALIZACIONES' | 'AUTORIZANTE_PAEP_VISUALIZACIONES' | 'VIDEO_COMPLETADO',
  user: UserProgress,
  targetSheetName?: string,
  videoCompletedTitle?: string
): Promise<{ success: boolean; message: string }> {
  const url = getAppsScriptUrl();
  if (!url) {
    return { success: false, message: 'Google Apps Script URL is empty' };
  }

  // Determine explicit sheet name according to requirements
  let sheetName = targetSheetName;
  if (!sheetName) {
    if (action === 'INDUCCION_VISUALIZACIONES' || (action === 'VIDEO_COMPLETADO' && user.rol !== 'autorizante')) {
      sheetName = 'INDUCCION VISUALIZACIONES';
    } else if (action === 'AUTORIZANTE_PAEP_VISUALIZACIONES' || (action === 'VIDEO_COMPLETADO' && user.rol === 'autorizante')) {
      sheetName = 'AUTORIZANTE PAEP';
    } else {
      sheetName = 'REGISTROS_SIMA';
    }
  }

  // Calculate detailed helper fields to make the spreadsheet mapping extremely accurate
  let lastScore = 'N/A';
  let passed = false;

  const allAttempts: { score: number; passed: boolean; date: string }[] = [];
  Object.keys(user.examAttempts || {}).forEach(k => {
    const atts = user.examAttempts[k] || [];
    atts.forEach(a => allAttempts.push(a));
  });
  allAttempts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (allAttempts.length > 0) {
    lastScore = `${allAttempts[0].score}%`;
    passed = allAttempts[0].passed;
  }

  // Calculate overall videos finished accurately based on assigned program videos
  const assignedIds = getAssignedVideoIds(user);
  const vProgress = user.videoProgress || {};
  let sumPct = 0;
  assignedIds.forEach(id => {
    const p = Math.min(100, Math.max(0, vProgress[id] || 0));
    sumPct += p;
  });
  const totalAssigned = assignedIds.length || 1;
  const avgProgressPct = Math.min(100, Math.round(sumPct / totalAssigned));
  
  // Obtain exact list of video titles completed at 100%
  const completedInfo = getCompletedVideosList(user);
  const resolvedVideoCompletedTitle = videoCompletedTitle || (completedInfo.titles.length > 0 ? completedInfo.titles[completedInfo.titles.length - 1] : '');

  const payload: SyncData = {
    timestamp: new Date().toISOString(),
    action,
    sheetName,
    ci: user.ci,
    nombres: user.nombres,
    apellidoPaterno: user.apellidoPaterno,
    apellidoMaterno: user.apellidoMaterno || '',
    empresa: user.empresa,
    planta: user.planta,
    rol: user.rol,
    // videoCount will contain the exact list of completed videos for full transparency in column 11 of Google Sheets!
    videoCount: completedInfo.formatted,
    videoCountNumber: completedInfo.count,
    totalAssignedVideos: totalAssigned,
    videoCompletedTitle: resolvedVideoCompletedTitle,
    completedVideosList: completedInfo.formatted,
    totalProgressPct: avgProgressPct,
    lastExamScore: lastScore,
    examPassed: passed,
    lockoutState: user.lockoutUntil ? `SANCIONADO (Hasta ${new Date(user.lockoutUntil).toLocaleString()})` : 'ACTIVO / SIN BLOQUEO',
    rawProgress: JSON.stringify(vProgress),
    rawExamAttempts: JSON.stringify(user.examAttempts)
  };

  try {
    // Standard approach: HTTP POST via standard fetch with mode: 'no-cors' 
    // to bypass CORS redirects on script.google.com safely, ensuring delivery!
    // Call our server proxy endpoint to perform the request safe from CORS/iframe policies
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url,
        payload
      })
    });

    if (response.ok) {
      const parsedJson = await response.json();
      if (parsedJson.success) {
        console.log(`Success: Data synchronized via proxy to Google Sheets (${action}) for CI: ${user.ci}`);
        return { success: true, message: parsedJson.message || `Sincronizado con éxito.` };
      } else {
        console.error('Proxy reported failure:', parsedJson);
        return { success: false, message: parsedJson.message || 'El servidor de Google rechazó el registro.' };
      }
    } else {
      let errText = 'Error de comunicación local.';
      try {
        const errJson = await response.json();
        if (errJson && errJson.message) errText = errJson.message;
      } catch (e) {}
      return { success: false, message: errText };
    }
  } catch (error: any) {
    console.error('Error synchronizing with Google Sheets via proxy:', error);
    return { success: false, message: error.message || 'Error de red con el servidor local.' };
  }
}

/**
 * Persists a user to the central backend store so all devices see the user and progress
 */
export async function saveUserToServer(user: UserProgress): Promise<UserProgress[] | null> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (err) {
    console.warn('[Server Sync] No se pudo guardar en el servidor:', err);
  }
  return null;
}

/**
 * Saves multiple users to the central backend store in bulk
 */
export async function syncBulkUsersToServer(users: UserProgress[]): Promise<UserProgress[] | null> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ users })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (err) {
    console.warn('[Server Sync] Error al sincronizar masa con servidor:', err);
  }
  return null;
}

/**
 * Fetches all users from the central backend store
 */
export async function fetchUsersFromServer(): Promise<UserProgress[] | null> {
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (err) {
    console.warn('[Server Sync] No se pudo cargar usuarios del servidor:', err);
  }
  return null;
}

/**
 * Deletes a user by CI from the central backend store
 */
export async function deleteUserFromServer(ci: string): Promise<UserProgress[] | null> {
  try {
    const res = await fetch(`/api/users/${encodeURIComponent(ci)}`, {
      method: 'DELETE'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        return data.users;
      }
    }
  } catch (err) {
    console.warn('[Server Sync] No se pudo borrar usuario del servidor:', err);
  }
  return null;
}

/**
 * Resets the central backend database
 */
export async function resetServerUsers(): Promise<boolean> {
  try {
    const res = await fetch('/api/users/reset', { method: 'POST' });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Direct diagnostic test of Google Apps Script connection
 */
export async function testGoogleSheetsConnection(urlToTest?: string): Promise<{
  success: boolean;
  message: string;
  status?: number;
  code?: string;
}> {
  const url = urlToTest || getAppsScriptUrl();
  if (!url) {
    return { success: false, message: 'La URL de Google Apps Script está vacía.' };
  }

  try {
    const res = await fetch('/api/sync/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, message: `Error de red al probar conexión: ${err.message}` };
  }
}

/**
 * Syncs all users in the system to Google Sheets
 */
export async function syncAllUsersToGoogleSheets(
  users: UserProgress[],
  onProgress?: (current: number, total: number) => void
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    if (onProgress) onProgress(i + 1, users.length);
    const res = await syncUserToGoogleSheets('PROMEDIO_AVANCE', u, 'REGISTROS_SIMA');
    if (res.success) {
      successCount++;
    } else {
      failCount++;
      if (!errors.includes(res.message)) {
        errors.push(res.message);
      }
    }

    // If user has completed videos or visualizaciones activity, also ensure visualization sheet is up to date
    const completedInfo = getCompletedVideosList(u);
    if (completedInfo.count > 0 || (u.videoProgress && Object.values(u.videoProgress).some(p => p > 0))) {
      const visSheet = u.rol === 'autorizante' ? 'AUTORIZANTE PAEP' : 'INDUCCION VISUALIZACIONES';
      await syncUserToGoogleSheets('VIDEO_COMPLETADO', u, visSheet).catch(() => {});
    }
  }

  return { successCount, failCount, errors };
}
