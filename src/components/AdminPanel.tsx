import React, { useState } from 'react';
import { UserProgress, Video } from '../types';
import { INITIAL_VIDEOS } from '../data/videos';
import { 
  X, Shield, FileSpreadsheet, Download, RefreshCw, BarChart3, Users, 
  Search, Unlock, Trash2, Calendar, HardDrive, Check, AlertCircle, Plus,
  Link, CheckCircle2, CloudUpload, ExternalLink, HelpCircle, Copy, Code, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  getAppsScriptUrl, 
  setAppsScriptUrl, 
  testGoogleSheetsConnection, 
  syncAllUsersToGoogleSheets 
} from '../utils/syncService';

const GOOGLE_APPS_SCRIPT_CODE = `/**
 * SISTEMA DE SINCRONIZACIÓN SIMA - SOBOCE S.A.
 * Copie y pegue este código completo en 'Código.gs' de su Apps Script.
 */

function doPost(e) {
  try {
    var rawData = e.postData ? e.postData.contents : null;
    var data = rawData ? JSON.parse(rawData) : e.parameter;
    if (data.payload) {
      data = data.payload;
    }
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.sheetName || "REGISTROS_SIMA";
    var sheet = ss.getSheetByName(sheetName);
    
    // Si la hoja no existe, la crea automáticamente con encabezados
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "FECHA REGISTRO",
        "ACCIÓN",
        "C.I.",
        "NOMBRES",
        "APELLIDO PATERNO",
        "APELLIDO MATERNO",
        "EMPRESA",
        "PLANTA",
        "ROL",
        "AVANCE %",
        "VIDEOS COMPLETADOS AL 100%",
        "ÚLTIMO VIDEO VISTO",
        "NOTA ÚLTIMO EXAMEN",
        "ESTADO EXAMEN",
        "ESTADO BLOQUEO"
      ]);
      sheet.getRange(1, 1, 1, 15).setBackground("#134e4a").setFontColor("#ffffff").setFontWeight("bold");
    }
    
    if (data.action === "TEST_CONEXION") {
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Conexión verificada exitosamente con Google Sheets" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var ci = (data.ci || "").toString().trim().toUpperCase();
    var fecha = data.timestamp ? new Date(data.timestamp).toLocaleString("es-BO") : new Date().toLocaleString("es-BO");
    var videosCompletados = data.completedVideosList || data.videoCount || "NINGUNO";
    var ultimoVideo = data.videoCompletedTitle || "";
    var rowData = [
      fecha,
      data.action || "REGISTRO",
      ci,
      data.nombres || "",
      data.apellidoPaterno || "",
      data.apellidoMaterno || "",
      data.empresa || "",
      data.planta || "PLANTA VIACHA",
      data.rol || "",
      (data.totalProgressPct !== undefined ? data.totalProgressPct + "%" : "0%"),
      videosCompletados,
      ultimoVideo,
      data.lastExamScore || "N/A",
      data.examPassed ? "APROBADO" : (data.lastExamScore !== "N/A" ? "REPROBADO" : "PENDIENTE"),
      data.lockoutState || "ACTIVO"
    ];
    
    // Buscar si ya existe la fila por C.I. para actualizarla o agregar nueva
    var lastRow = sheet.getLastRow();
    var foundRow = -1;
    if (lastRow > 1) {
      var ciValues = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
      for (var i = 0; i < ciValues.length; i++) {
        if (ciValues[i][0].toString().trim().toUpperCase() === ci) {
          foundRow = i + 2;
          break;
        }
      }
    }
    
    if (foundRow > 0) {
      sheet.getRange(foundRow, 1, 1, rowData.length).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Guardado para C.I. " + ci }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.ci) {
    return doPost(e);
  }
  return ContentService.createTextOutput(JSON.stringify({ 
    success: true, 
    status: "online", 
    message: "Servicio Web App Google Sheets SIMA activo" 
  })).setMimeType(ContentService.MimeType.JSON);
}`;

interface AdminPanelProps {
  onClose: () => void;
  users: UserProgress[];
  onResetDatabase: () => void;
  onClearLockout: (ci: string) => void;
  onDeleteUser: (ci: string) => void;
  onAddManualUser: (user: UserProgress) => void;
  onRefreshUsers?: () => Promise<void> | void;
}

type SheetTab = 
  | 'induccion_visualizaciones'
  | 'autorizante_visualizaciones'
  | 'visitas' 
  | 'general_aprobados' 
  | 'general_reprobados' 
  | 'conductores_aprobados' 
  | 'conductores_reprobados' 
  | 'solicitante_paep' 
  | 'autorizante_aprobados' 
  | 'autorizante_reprobados' 
  | 'contratistas_ruc';

export default function AdminPanel({
  onClose,
  users,
  onResetDatabase,
  onClearLockout,
  onDeleteUser,
  onAddManualUser,
  onRefreshUsers
}: AdminPanelProps) {
  const [activeSheet, setActiveSheet] = useState<SheetTab>('induccion_visualizaciones');
  const [searchTerm, setSearchTerm] = useState('');

  // Google Sheets configuration and diagnostic state
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState(getAppsScriptUrl());
  const [testState, setTestState] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testResultMsg, setTestResultMsg] = useState('');
  const [testErrorCode, setTestErrorCode] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);
  const [syncResult, setSyncResult] = useState<{ success: number; fail: number; errors: string[] } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [urlSaveSuccess, setUrlSaveSuccess] = useState(false);
  const [showScriptCode, setShowScriptCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyScriptCode = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleTestConnection = async () => {
    setTestState('testing');
    setTestResultMsg('');
    setTestErrorCode(null);
    const res = await testGoogleSheetsConnection(sheetsUrl);
    if (res.success) {
      setTestState('success');
      setTestResultMsg(res.message);
    } else {
      setTestState('error');
      setTestResultMsg(res.message);
      setTestErrorCode(res.code || null);
    }
  };

  const handleSaveUrl = () => {
    setAppsScriptUrl(sheetsUrl);
    setUrlSaveSuccess(true);
    setTimeout(() => setUrlSaveSuccess(false), 3000);
  };

  const handleSyncAll = async () => {
    if (users.length === 0) {
      alert("No hay trabajadores registrados en la base de datos para sincronizar.");
      return;
    }
    setIsSyncingAll(true);
    setSyncProgress({ current: 0, total: users.length });
    setSyncResult(null);

    const res = await syncAllUsersToGoogleSheets(users, (curr, tot) => {
      setSyncProgress({ current: curr, total: tot });
    });

    setSyncResult({ success: res.successCount, fail: res.failCount, errors: res.errors });
    setIsSyncingAll(false);
    setSyncProgress(null);
  };

  const handleRefreshClick = async () => {
    if (onRefreshUsers) {
      setIsRefreshing(true);
      await onRefreshUsers();
      setIsRefreshing(false);
    }
  };

  // Dynamic list of unique company names from registered workers, with SOBOCE S.A. and MEDMIN as baseline
  const adminCompanies = Array.from(
    new Set([
      'SOBOCE S.A.',
      'MEDMIN',
      ...users.map(u => u.empresa?.trim().toUpperCase()).filter(Boolean)
    ])
  ).sort();
  
  // Registration manual input fields
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCI, setNewCI] = useState('');
  const [newNombres, setNewNombres] = useState('');
  const [newPaterno, setNewPaterno] = useState('');
  const [newMaterno, setNewMaterno] = useState('');
  const [newEmpresa, setNewEmpresa] = useState('');
  const [newPlanta, setNewPlanta] = useState('PLANTA VIACHA');
  const [newRol, setNewRol] = useState<'visita' | 'general' | 'conductor' | 'autorizante' | 'contratista' | 'soboce'>('general');

  const getUserAssignedVideos = (u: UserProgress): Video[] => {
    if (u.rol === 'visita') {
      return INITIAL_VIDEOS.filter(v => v.roleRequirement === 'visita');
    }
    if (u.rol === 'conductor') {
      return INITIAL_VIDEOS.filter(v => v.roleRequirement === 'conductor');
    }
    if (u.rol === 'autorizante') {
      return INITIAL_VIDEOS.filter(v => v.roleRequirement === 'autorizante');
    }

    // Contratistas (general/contratista) and SOBOCE
    const isContratista = u.rol === 'contratista' || u.rol === 'general';
    const isSoboce = u.rol === 'soboce';

    if (isContratista || isSoboce) {
      const type = u.contratistaTipo || 'III';
      // They always get Inducción SIMA General videos (first 2 videos)
      const videos: Video[] = INITIAL_VIDEOS.filter(v => v.roleRequirement === 'general');

      // If Tipo I, Tipo II, or SOBOCE, we ALSO assign the 9 contractor videos
      if (type === 'I' || type === 'II' || isSoboce) {
        const capacVids = INITIAL_VIDEOS.filter(v => v.roleRequirement === 'contratista');
        capacVids.forEach(cv => {
          if (!videos.some(v => v.id === cv.id)) {
            videos.push(cv);
          }
        });
      }

      return videos;
    }

    return [];
  };

  // Compute stats per company for the "Gráficas de avance por empresa"
  const getCompanyStats = () => {
    const grouped: { [company: string]: { totalProgress: number; count: number } } = {};
    
    users.forEach(u => {
      const compName = u.empresa.trim().toUpperCase() || 'SOBOCE CONTRATISTA';
      
      // Calculate this user's overall progress across all assigned videos
      const roleVids = getUserAssignedVideos(u);
      
      if (roleVids.length === 0) return;
      
      let sumPct = 0;
      roleVids.forEach(v => {
        sumPct += u.videoProgress[v.id] || 0;
      });
      const avgUserProgress = sumPct / roleVids.length;

      if (!grouped[compName]) {
        grouped[compName] = { totalProgress: 0, count: 0 };
      }
      grouped[compName].totalProgress += avgUserProgress;
      grouped[compName].count += 1;
    });

    return Object.keys(grouped).map(company => ({
      name: company,
      averageProgress: Math.round(grouped[company].totalProgress / grouped[company].count),
      employeeCount: grouped[company].count
    }));
  };

  const companyStats = getCompanyStats();

  // Filter users that belong to each administrative list sheet
  const getSheetData = (): UserProgress[] => {
    const result = users.filter(u => {
      // Search matching first
      const rawSearch = searchTerm.toUpperCase();
      const matchesSearch = 
        u.ci.includes(searchTerm) || 
        u.nombres.toUpperCase().includes(rawSearch) || 
        u.apellidoPaterno.toUpperCase().includes(rawSearch) || 
        u.empresa.toUpperCase().includes(rawSearch);

      if (!matchesSearch) return false;

      const generalAttempts = u.examAttempts['general_induction'] || [];
      const condAttempts = u.examAttempts['conductor_induction'] || [];
      const autAttempts = u.examAttempts['autorizante_paep'] || [];

      switch (activeSheet) {
        case 'induccion_visualizaciones': {
          // INDUCCION VISUALIZACIONES: Shows all workers in induction roles
          const isInductionRole = u.rol === 'visita' || u.rol === 'conductor' || u.rol === 'general' || u.rol === 'contratista' || u.rol === 'soboce';
          return isInductionRole;
        }

        case 'autorizante_visualizaciones': {
          // AUTORIZANTE PAEP (VISUALIZACIONES): Shows all users registered as autorizantes
          return u.rol === 'autorizante';
        }

        case 'visitas':
          // 1. INDUCCION VISITAS: Completed video visualization
          return u.rol === 'visita' && (u.videoProgress['v_visita_1'] || 0) === 100;
          
        case 'general_aprobados':
          // 2. INDUCCION GRAL APROBADOS: safety and env videos at 100%, passed general exam, and completed v_solicitante_1
          const safetyComp1 = (u.videoProgress['v_general_1'] || 0) === 100;
          const envComp1 = (u.videoProgress['v_general_2'] || 0) === 100;
          const paepComp1 = (u.videoProgress['v_solicitante_1'] || 0) === 100;
          const examPassed1 = generalAttempts.some(a => a.passed);
          return (u.rol === 'general' || u.rol === 'contratista' || u.rol === 'soboce') && safetyComp1 && envComp1 && examPassed1 && paepComp1;
          
        case 'general_reprobados':
          // 3. INDUCCION GRAL REPROBADOS: safety and env videos at 100%, but failed general exam
          const safetyComp2 = (u.videoProgress['v_general_1'] || 0) === 100;
          const envComp2 = (u.videoProgress['v_general_2'] || 0) === 100;
          const examFailed2 = generalAttempts.length > 0 && !generalAttempts.some(a => a.passed);
          return (u.rol === 'general' || u.rol === 'contratista' || u.rol === 'soboce') && safetyComp2 && envComp2 && examFailed2;
          
        case 'solicitante_paep':
          // 4. SOLICITANTE PAEP: Completed v_solicitante_1 and passed general exam
          const paepComp3 = (u.videoProgress['v_solicitante_1'] || 0) === 100;
          const examPassed3 = generalAttempts.some(a => a.passed);
          return (u.rol === 'general' || u.rol === 'contratista' || u.rol === 'soboce') && paepComp3 && examPassed3;
          
        case 'conductores_aprobados':
          // 5. INDUCCION PARA CONDUCTORES APROBADOS: Completed conductor video and approved conductor exam
          const condComp4 = (u.videoProgress['v_conductor_1'] || 0) === 100;
          const examPassed4 = condAttempts.some(a => a.passed);
          return u.rol === 'conductor' && condComp4 && examPassed4;
          
        case 'conductores_reprobados':
          // 6. INDUCCION PARA CONDUCTORES REPROBADOS: Completed conductor video and failed conductor exam
          const condComp5 = (u.videoProgress['v_conductor_1'] || 0) === 100;
          const examFailed5 = condAttempts.length > 0 && !condAttempts.some(a => a.passed);
          return u.rol === 'conductor' && condComp5 && examFailed5;
          
        case 'autorizante_aprobados':
          // 7. AUTORIZANTE PAEP APROBADOS: Completed all autorizante videos and approved exam
          const autComp6 = [
            'v_autorizante_1', 'v_autorizante_2', 'v_autorizante_3_1', 
            'v_autorizante_3_2', 'v_autorizante_4', 'v_autorizante_5', 'v_autorizante_6'
          ].every(vid => (u.videoProgress[vid] || 0) === 100);
          const examPassed6 = autAttempts.some(a => a.passed);
          return u.rol === 'autorizante' && autComp6 && examPassed6;
          
        case 'autorizante_reprobados':
          // 8. AUTORIZANTE PAEP REPROBADOS: Completed all autorizante videos and failed exam
          const autComp7 = [
            'v_autorizante_1', 'v_autorizante_2', 'v_autorizante_3_1', 
            'v_autorizante_3_2', 'v_autorizante_4', 'v_autorizante_5', 'v_autorizante_6'
          ].every(vid => (u.videoProgress[vid] || 0) === 100);
          const examFailed7 = autAttempts.length > 0 && !autAttempts.some(a => a.passed);
          return u.rol === 'autorizante' && autComp7 && examFailed7;
          
        case 'contratistas_ruc':
          // 9. CONTRATISTAS RUTINARIOS: Role contratista/general and completed at least 1 video training (no exam required)
          const hasCompVideo = [
            'v_contratista_1', 'v_contratista_2', 'v_contratista_3', 'v_contratista_4',
            'v_contratista_5', 'v_contratista_6', 'v_contratista_7', 'v_contratista_8', 'v_contratista_9'
          ].some(vid => (u.videoProgress[vid] || 0) === 100);
          return (u.rol === 'contratista' || u.rol === 'general') && hasCompVideo;
          
        default:
          return false;
      }
    });

    // Sort list: students with completed videos or higher progress appear first
    if (activeSheet === 'induccion_visualizaciones' || activeSheet === 'autorizante_visualizaciones') {
      return result.sort((a, b) => {
        const countA = INITIAL_VIDEOS.filter(v => (a.videoProgress[v.id] || 0) === 100).length;
        const countB = INITIAL_VIDEOS.filter(v => (b.videoProgress[v.id] || 0) === 100).length;
        if (countB !== countA) return countB - countA;
        return a.apellidoPaterno.localeCompare(b.apellidoPaterno);
      });
    }

    return result;
  };

  const filteredData = getSheetData();

  // Export spreadsheet as CSV standard text file download
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      alert("No hay registros en esta hoja para exportar.");
      return;
    }

    const isContratistas = activeSheet === 'contratistas_ruc';
    const isInduccionVis = activeSheet === 'induccion_visualizaciones';
    const isAutorizanteVis = activeSheet === 'autorizante_visualizaciones';

    let csvContent = "";
    // CSV Header headers
    let headers = "";
    if (isInduccionVis) {
      headers = "C.I.,NOMBRES,APELLIDO PATERNO,APELLIDO MATERNO,EMPRESA,PLANTA,ROL,ESTADO VISUALIZACION,VIDEOS VISTOS COMPLETOS (100%),AVANCE TOTAL %,FECHA REGISTRO\r\n";
    } else if (isAutorizanteVis) {
      headers = "C.I.,NOMBRES,APELLIDO PATERNO,APELLIDO MATERNO,EMPRESA,PLANTA,ESTADO VISUALIZACION,MODULOS AUTORIZANTE COMPLETOS (100%),AVANCE TOTAL %,FECHA REGISTRO\r\n";
    } else if (isContratistas) {
      headers = "C.I.,NOMBRES,APELLIDO PATERNO,APELLIDO MATERNO,EMPRESA,PLANTA,ESTADO,CAPACITACIONES COMPLETADAS,FECHA REGISTRO\r\n";
    } else {
      headers = "C.I.,NOMBRES,APELLIDO PATERNO,APELLIDO MATERNO,EMPRESA,PLANTA,ESTADO,NOTA EXAMEN,FECHA REGISTRO\r\n";
    }
    csvContent += headers;

    filteredData.forEach(u => {
      let examScoreText = "N/A";
      let statusText = "COMPLETADO";
      
      const generalAttempts = u.examAttempts['general_induction'] || [];
      const condAttempts = u.examAttempts['conductor_induction'] || [];
      const autAttempts = u.examAttempts['autorizante_paep'] || [];

      if (isInduccionVis) {
        // Collect exact video titles completed by this user
        const completedVids = INITIAL_VIDEOS.filter(v => (u.videoProgress[v.id] || 0) === 100);
        const videoTitles = completedVids.length > 0 
          ? completedVids.map(v => v.title).join(" | ")
          : "NINGUNO AL 100%";
        
        const roleVids = getUserAssignedVideos(u);
        const isComplete = roleVids.length > 0 && roleVids.every(v => (u.videoProgress[v.id] || 0) === 100);
        statusText = isComplete ? "VISUALIZACION COMPLETA (100%)" : `EN PROGRESO (${completedVids.length}/${roleVids.length} videos completos)`;
        
        let sumPct = 0;
        roleVids.forEach(v => { sumPct += u.videoProgress[v.id] || 0; });
        const avgPct = roleVids.length > 0 ? Math.round(sumPct / roleVids.length) : 0;

        const row = `"${u.ci}","${u.nombres}","${u.apellidoPaterno}","${u.apellidoMaterno}","${u.empresa}","${u.planta}","${u.rol.toUpperCase()}","${statusText}","${videoTitles}","${avgPct}%","${new Date().toLocaleDateString('es-BO')}"\r\n`;
        csvContent += row;
        return;
      }

      if (isAutorizanteVis) {
        const completedAutVids = INITIAL_VIDEOS.filter(v => v.roleRequirement === 'autorizante' && (u.videoProgress[v.id] || 0) === 100);
        const autTitles = completedAutVids.length > 0
          ? completedAutVids.map(v => v.title).join(" | ")
          : "NINGUNO AL 100%";
        const isComplete = completedAutVids.length === 7;
        statusText = isComplete ? "MODULOS PAEP COMPLETOS (100%)" : `EN PROGRESO (${completedAutVids.length}/7 módulos completos)`;
        
        const roleVids = getUserAssignedVideos(u);
        let sumPct = 0;
        roleVids.forEach(v => { sumPct += u.videoProgress[v.id] || 0; });
        const avgPct = roleVids.length > 0 ? Math.round(sumPct / roleVids.length) : 0;

        const row = `"${u.ci}","${u.nombres}","${u.apellidoPaterno}","${u.apellidoMaterno}","${u.empresa}","${u.planta}","${statusText}","${autTitles}","${avgPct}%","${new Date().toLocaleDateString('es-BO')}"\r\n`;
        csvContent += row;
        return;
      }

      if (isContratistas) {
        const completedVids = INITIAL_VIDEOS.filter(v => 
          v.roleRequirement === 'contratista' && u.videoProgress[v.id] === 100
        ).map(v => v.title.split('.')[0] || v.title);
        examScoreText = completedVids.length > 0 ? completedVids.join(" | ") : "NINGUNA";
        statusText = "CONTRATISTA REGISTRADO";
      } else {
        if (u.rol === 'general' || u.rol === 'contratista' || u.rol === 'soboce') {
          const best = generalAttempts[generalAttempts.length - 1];
          if (best) examScoreText = `${best.score}%`;
          statusText = generalAttempts.some(a => a.passed) ? "APROBADO GENERAL" : "REPROBADO";
        } else if (u.rol === 'conductor') {
          const best = condAttempts[condAttempts.length - 1];
          if (best) examScoreText = `${best.score}%`;
          statusText = condAttempts.some(a => a.passed) ? "APROBADO CONDUCTOR" : "REPROBADO";
        } else if (u.rol === 'autorizante') {
          const best = autAttempts[autAttempts.length - 1];
          if (best) examScoreText = `${best.score}%`;
          statusText = autAttempts.some(a => a.passed) ? "APROBADO AUTORIZANTE" : "REPROBADO";
        } else if (u.rol === 'visita') {
          statusText = "VISITA COMPLETADA";
        }
      }

      const row = `"${u.ci}","${u.nombres}","${u.apellidoPaterno}","${u.apellidoMaterno}","${u.empresa}","${u.planta}","${statusText}","${examScoreText}","2026-06-01"\r\n`;
      csvContent += row;
    });

    // We use a Blob with UTF-8 BOM so Excel opens special characters (accents, ñ, etc.) properly.
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `SOBOCE_SIMA_${activeSheet.toUpperCase()}_REPORT.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCreateManualUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCI.trim() || !newNombres.trim() || !newPaterno.trim() || !newEmpresa.trim()) {
      alert("Por favor llene los campos obligatorios.");
      return;
    }

    const newUser: UserProgress = {
      ci: newCI.trim().toUpperCase(),
      nombres: newNombres.trim().toUpperCase(),
      apellidoPaterno: newPaterno.trim().toUpperCase(),
      apellidoMaterno: newMaterno.trim().toUpperCase(),
      empresa: newRol === 'soboce' ? 'SOBOCE S.A.' : newEmpresa.trim().toUpperCase(),
      planta: newPlanta,
      rol: newRol,
      contratistaTipo: newRol === 'soboce' ? 'II' : (newRol === 'contratista' ? 'I' : null),
      videoProgress: {},
      examAttempts: {},
      lockoutUntil: null
    };

    onAddManualUser(newUser);

    // Reset fields
    setNewCI('');
    setNewNombres('');
    setNewPaterno('');
    setNewMaterno('');
    setNewEmpresa('');
    setShowAddForm(false);
    alert(`Trabajador con C.I. ${newUser.ci} registrado exitosamente.`);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden border border-slate-200/80 my-2 sm:my-8 flex flex-col max-h-[96vh] sm:max-h-[90vh]">
        
        {/* Admin Header - Styled to match Professional Polish */}
        <div className="bg-slate-950 border-b-2 border-emerald-600 px-4 sm:px-6 py-3 sm:py-4 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs shadow">
              ADM
            </div>
            <div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold font-display tracking-tight text-white uppercase leading-none">
                INFORME ADMIN - Seguimiento y Control SIMA
              </h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-1">
                Planta Viacha • SOBOCE S.A. • Gestión de Progreso y Evaluación
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Inner Content Split in Tabs and Lists */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-4 sm:space-y-6">
          
          {/* Company metrics section with SVG bar graphs */}
          <div className="bg-slate-50 border border-slate-150 p-5 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3 mb-4">
              <div>
                <h4 className="text-xs font-bold font-mono text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart3 className="w-4 h-4 text-slate-800" /> Gráficas de Avance General por Empresa
                </h4>
                <p className="text-[10px] text-slate-500">
                  Visualización de rendimiento promedio histórico agrupado por contratista.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Central Server indicator & refresh button */}
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono px-2.5 py-1.5 rounded-lg shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold">BD Central: {users.length}</span>
                  {onRefreshUsers && (
                    <button 
                      onClick={handleRefreshClick}
                      disabled={isRefreshing}
                      title="Refrescar datos del servidor central"
                      className="ml-1 hover:text-emerald-950 transition"
                    >
                      <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Google Sheets Sync & Diagnostic button */}
                <button
                  onClick={() => setShowSyncModal(true)}
                  className="bg-teal-700 hover:bg-teal-800 text-white font-bold font-sans uppercase text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                  title="Configurar y probar sincronización con Google Sheets"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Sincronización Sheets
                </button>

                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold font-sans uppercase text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Trabajador
                </button>
                <button 
                  onClick={onResetDatabase}
                  className="bg-rose-100 hover:bg-rose-200 text-rose-700 hover:text-rose-800 font-bold font-mono text-[10px] px-3 py-1.5 rounded-lg flex items-center gap-1 transition"
                  title="Resetea la base de datos a cero registros"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reiniciar BD
                </button>
              </div>
            </div>

            {/* Manual user creation popup modal nested block */}
            {showAddForm && (
              <form onSubmit={handleCreateManualUser} className="bg-white p-4 rounded-xl border border-dashed border-emerald-300 grid grid-cols-1 md:grid-cols-4 gap-3 mb-4 animate-fade-in">
                <div className="md:col-span-4 text-xs font-bold text-slate-805 uppercase pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span>Formulario Admin: Registro Rápido Directo</span>
                  <button type="button" onClick={() => setShowAddForm(false)} className="text-slate-400 hover:text-slate-600">×</button>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">C.I. (Llave)*</label>
                  <input type="text" required placeholder="Ej: 991283 LP" value={newCI} onChange={e => setNewCI(e.target.value.toUpperCase())} className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 font-mono uppercase" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Nombres*</label>
                  <input type="text" required placeholder="Nombres" value={newNombres} onChange={e => setNewNombres(e.target.value.toUpperCase())} className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 uppercase" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Paterno*</label>
                  <input type="text" required placeholder="Paterno" value={newPaterno} onChange={e => setNewPaterno(e.target.value.toUpperCase())} className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 uppercase" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Materno</label>
                  <input type="text" placeholder="Materno" value={newMaterno} onChange={e => setNewMaterno(e.target.value.toUpperCase())} className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 uppercase" />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Empresa Contratista*</label>
                  <input type="text" required list="admin-companies-list" placeholder="SOBOCE / CONTRATISTA" value={newEmpresa} onChange={e => setNewEmpresa(e.target.value.toUpperCase())} className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 uppercase font-medium bg-white" />
                  <datalist id="admin-companies-list">
                    {adminCompanies.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Roles de Ingreso</label>
                  <select value={newRol} onChange={e => setNewRol(e.target.value as any)} className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 bg-white text-slate-850">
                    <option value="visita">Visita Corta</option>
                    <option value="general">Inducción General Trabajos</option>
                    <option value="conductor">Conductor Externo</option>
                    <option value="autorizante">Autorizante PAEP</option>
                    <option value="contratista">Contratista Rutinario</option>
                    <option value="soboce">Personal Propio SOBOCE</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase font-mono">Planta</label>
                  <select value={newPlanta} onChange={e => setNewPlanta(e.target.value)} className="w-full text-xs p-1.5 border border-slate-200 rounded mt-0.5 bg-white">
                    <option value="PLANTA VIACHA">Planta Viacha</option>
                    <option value="PLANTA EL ALTO">Planta El Alto</option>
                    <option value="PLANTA WARNES">Planta Warnes</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-emerald-600 text-white font-bold font-mono text-[10px] py-2 rounded shadow hover:bg-emerald-700 uppercase">
                    Registrar BD
                  </button>
                </div>
              </form>
            )}

            {/* Corporate Average Progress Charts */}
            {companyStats.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs font-mono">
                [No hay registros de contratistas para graficar]
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Custom SVG Column Chart for Enterprises */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-2">Avance Promedio (%) por Contratista</span>
                  <div className="relative pt-4">
                    <svg viewBox="0 0 400 130" className="w-full h-32">
                      {/* Base Line */}
                      <line x1="10" y1="110" x2="390" y2="110" stroke="#cbd5e1" strokeWidth="1.5" />
                      
                      {companyStats.slice(0, 4).map((c, i) => {
                        const colWidth = 45;
                        const colGap = 45;
                        const startX = 40 + i * (colWidth + colGap);
                        const progressHeight = (c.averageProgress / 100) * 90;
                        const startY = 110 - progressHeight;

                        return (
                          <g key={c.name}>
                            {/* Color Block Pillar */}
                            <rect 
                              x={startX} 
                              y={startY} 
                              width={colWidth} 
                              height={progressHeight} 
                              fill={c.averageProgress >= 90 ? '#059669' : '#d97706'} 
                              rx="3" 
                            />
                            {/* Score Text above */}
                            <text x={startX + colWidth/2} y={startY - 6} textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a" className="font-mono">
                              {c.averageProgress}%
                            </text>
                            {/* Company code/name labels truncated below */}
                            <text x={startX + colWidth/2} y="123" textAnchor="middle" fontSize="8" fontWeight="600" fill="#475569" className="font-sans">
                              {c.name.slice(0, 8)}..
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                </div>

                {/* Legend list metrics */}
                <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col justify-center space-y-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500 font-mono tracking-wider block mb-1">Empresas Participantes</span>
                  <div className="max-h-28 overflow-y-auto space-y-1.5 pr-2">
                    {companyStats.map(c => (
                      <div key={c.name} className="flex justify-between items-center text-xs border-b border-dashed border-slate-100 pb-1">
                        <span className="font-bold text-slate-800 uppercase truncate max-w-[180px]">{c.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[10px] font-mono">({c.employeeCount} trab.)</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${c.averageProgress >= 90 ? 'bg-emerald-150/70 text-emerald-800' : 'bg-amber-150/70 text-amber-800'}`}>
                            {c.averageProgress}% promedio
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SPREADSHEET SELECTOR PANEL */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-mono font-bold uppercase text-slate-700 tracking-wider">
                  Listas / Hojas de Cálculo Generadas en Planta Viacha
                </span>
              </div>
              
              {/* Search input for filter */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filtrar por C.I. o nombres..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 w-full sm:w-56"
                />
              </div>
            </div>

            {/* TAB SHEET SELECTORS */}
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-2">
              <button 
                onClick={() => setActiveSheet('induccion_visualizaciones')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeSheet === 'induccion_visualizaciones' ? 'bg-emerald-700 text-white ring-2 ring-emerald-500' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}`}
              >
                📊 INDUCCION VISUALIZACIONES
              </button>
              <button 
                onClick={() => setActiveSheet('autorizante_visualizaciones')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeSheet === 'autorizante_visualizaciones' ? 'bg-sky-700 text-white ring-2 ring-sky-500' : 'bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100'}`}
              >
                🎓 AUTORIZANTE PAEP (VISUALIZACIONES)
              </button>
              <button 
                onClick={() => setActiveSheet('visitas')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'visitas' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                1. INDUCCION VISITAS
              </button>
              <button 
                onClick={() => setActiveSheet('general_aprobados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'general_aprobados' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                2. INDUCCION GRAL APROBADOS
              </button>
              <button 
                onClick={() => setActiveSheet('general_reprobados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'general_reprobados' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                3. INDUCCION GRAL REPROBADOS
              </button>
              <button 
                onClick={() => setActiveSheet('solicitante_paep')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'solicitante_paep' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                4. SOLICITANTE PAEP
              </button>
              <button 
                onClick={() => setActiveSheet('conductores_aprobados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'conductores_aprobados' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                5. INDUCCION PARA CONDUCTORES APROBADOS
              </button>
              <button 
                onClick={() => setActiveSheet('conductores_reprobados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'conductores_reprobados' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                6. INDUCCION PARA CONDUCTORES REPROBADOS
              </button>
              <button 
                onClick={() => setActiveSheet('autorizante_aprobados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'autorizante_aprobados' ? 'bg-sky-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                7. AUTORIZANTE PAEP APROBADOS
              </button>
              <button 
                onClick={() => setActiveSheet('autorizante_reprobados')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'autorizante_reprobados' ? 'bg-pink-650 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                8. AUTORIZANTE PAEP REPROBADOS
              </button>
              <button 
                onClick={() => setActiveSheet('contratistas_ruc')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide transition-all ${activeSheet === 'contratistas_ruc' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                9. CONTRATISTAS RUTINARIOS
              </button>
            </div>

            {/* SPREADSHEET GRID SHEET TABLE */}
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-inner flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-slate-500 uppercase">
                  <span>Hoja: {activeSheet.toUpperCase()}</span>
                  <span>• ({filteredData.length} registros hallados)</span>
                </div>
                <button
                  onClick={handleExportCSV}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition shadow"
                  title="Exportación compatible con Excel"
                >
                  <Download className="w-3.5 h-3.5" /> Exportar a Excel (CSV)
                </button>
              </div>

              {/* SpreadSheet table view */}
              <div className="overflow-x-auto rounded-xl border border-slate-250 bg-white">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 text-slate-700 font-mono text-[10px] uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3 border-r border-slate-200">C.I. (Llave)</th>
                      <th className="p-3 border-r border-slate-200">Apellido Paterno</th>
                      <th className="p-3 border-r border-slate-200">Apellido Materno</th>
                      <th className="p-3 border-r border-slate-200">Nombres</th>
                      <th className="p-3 border-r border-slate-200">Empresa</th>
                      <th className="p-3 border-r border-slate-200">Planta</th>
                      <th className="p-3 border-r border-slate-200 text-center">Video %</th>
                      <th className="p-3 border-r border-slate-200 text-center">
                        {activeSheet === 'contratistas_ruc' 
                          ? 'Capacitaciones Completadas' 
                          : (activeSheet === 'induccion_visualizaciones' || activeSheet === 'autorizante_visualizaciones' 
                            ? 'Videos Vistos al 100%' 
                            : 'Nota Ex.')}
                      </th>
                      <th className="p-3 text-center">Acciones / Taller</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-sans text-slate-800">
                    {filteredData.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400 font-mono">
                          No hay trabajadores calificados en esta lista generada
                        </td>
                      </tr>
                    ) : (
                      filteredData.map(u => {
                        // Calculate score
                        let lastScore: number | null = null;
                        const generalAttempts = u.examAttempts['general_induction'] || [];
                        const condAttempts = u.examAttempts['conductor_induction'] || [];
                        const autAttempts = u.examAttempts['autorizante_paep'] || [];

                        if ((u.rol === 'general' || u.rol === 'contratista' || u.rol === 'soboce') && generalAttempts.length > 0) {
                          lastScore = generalAttempts[generalAttempts.length - 1].score;
                        } else if (u.rol === 'conductor' && condAttempts.length > 0) {
                          lastScore = condAttempts[condAttempts.length - 1].score;
                        } else if (u.rol === 'autorizante' && autAttempts.length > 0) {
                          lastScore = autAttempts[autAttempts.length - 1].score;
                        }

                        // Calculate overall average video progress for this student
                        const roleVids = getUserAssignedVideos(u);
                        let sumPct = 0;
                        roleVids.forEach(v => {
                          sumPct += u.videoProgress[v.id] || 0;
                        });
                        const avgProgress = roleVids.length > 0 ? Math.round(sumPct / roleVids.length) : 0;

                        return (
                          <tr key={u.ci} className="hover:bg-slate-50/50">
                            <td className="p-3 font-mono font-bold text-slate-905 border-r border-slate-100 select-all">{u.ci}</td>
                            <td className="p-3 font-medium uppercase border-r border-slate-100">{u.apellidoPaterno}</td>
                            <td className="p-3 font-medium uppercase border-r border-slate-100">{u.apellidoMaterno || '-'}</td>
                            <td className="p-3 font-semibold uppercase border-r border-slate-100">{u.nombres}</td>
                            <td className="p-3 font-medium uppercase border-r border-slate-100 text-slate-600">{u.empresa}</td>
                            <td className="p-3 border-r border-slate-100 text-[11px] font-mono">{u.planta}</td>
                            
                            {/* Video progress status with nice label badge */}
                            <td className="p-3 border-r border-slate-100 text-center">
                              <span className={`inline-block px-1.5 py-0.5 rounded font-mono font-bold text-[10px] ${avgProgress === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                {avgProgress}%
                              </span>
                            </td>

                            {/* Score grade result / completed courses / videos visualizados */}
                            <td className="p-3 border-r border-slate-100 text-center">
                              {activeSheet === 'induccion_visualizaciones' || activeSheet === 'autorizante_visualizaciones' ? (
                                <div className="flex flex-col gap-1 items-start text-left max-w-[280px] mx-auto">
                                  {(() => {
                                    const relevantVids = activeSheet === 'autorizante_visualizaciones'
                                      ? INITIAL_VIDEOS.filter(v => v.roleRequirement === 'autorizante' && (u.videoProgress[v.id] || 0) === 100)
                                      : INITIAL_VIDEOS.filter(v => (u.videoProgress[v.id] || 0) === 100);

                                    if (relevantVids.length === 0) {
                                      return (
                                        <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-mono text-[10px] italic">
                                          En progreso ({avgProgress}%) - Ninguno al 100%
                                        </span>
                                      );
                                    }
                                    return (
                                      <div className="flex flex-col gap-1 w-full">
                                        {relevantVids.map(v => (
                                          <span 
                                            key={v.id} 
                                            className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-semibold"
                                            title={v.title}
                                          >
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                            <span className="truncate">{v.title}</span>
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              ) : activeSheet === 'contratistas_ruc' ? (
                                <div className="flex flex-wrap gap-1 justify-center max-w-[220px] mx-auto">
                                  {(() => {
                                    const completedVids = INITIAL_VIDEOS.filter(v => 
                                      v.roleRequirement === 'contratista' && (u.videoProgress[v.id] || 0) === 100
                                    );
                                    if (completedVids.length === 0) {
                                      return <span className="text-slate-400 font-mono text-[10px] italic">Ninguna</span>;
                                    }
                                    return completedVids.map(v => {
                                      const numPart = v.title.split('.')[0] || '';
                                      const namePart = v.title.split('.')[1]?.trim() || v.title;
                                      return (
                                        <span 
                                          key={v.id} 
                                          className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.5 rounded text-[8px] font-bold tracking-tight uppercase"
                                          title={v.title}
                                        >
                                          {numPart ? `Cap ${numPart}` : namePart.substring(0, 10)}
                                        </span>
                                      );
                                    });
                                  })()}
                                </div>
                              ) : (
                                <span className="font-mono font-bold text-slate-900">
                                  {lastScore !== null ? `${lastScore}%` : 'N/A'}
                                </span>
                              )}
                            </td>

                            {/* Student operation tools */}
                            <td className="p-2 text-center flex items-center justify-center gap-1.5">
                              {u.lockoutUntil && (
                                <button
                                  onClick={() => onClearLockout(u.ci)}
                                  className="p-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-bold font-mono uppercase flex items-center gap-0.5"
                                  title="Quita la sanción de 1 día inmediatamente"
                                >
                                  <Unlock className="w-3.5 h-3.5" /> Desbloquear
                                </button>
                              )}
                              <button
                                onClick={() => onDeleteUser(u.ci)}
                                className="p-1 rounded bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 transition"
                                title="Eliminar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Footer & Inalterable signature stamp */}
        <div className="bg-slate-50 px-4 sm:px-6 py-3.5 sm:py-4 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-center sm:text-left font-sans text-slate-500 text-[11px]">
            {/* INALTERABLE SIGNATURE STAMP ON LEFT BOTTOM CORNER */}
            <span className="font-mono font-bold text-slate-650 tracking-wider flex items-center justify-center sm:justify-start gap-1 select-none">
              Por: <span className="text-slate-800 underline font-semibold select-all pointer-events-auto font-mono">Carla Callizaya</span>
            </span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow-md"
          >
            Cerrar Vista de Seguimiento
          </button>
        </div>

      </div>

      {/* Google Sheets Sync & Diagnostic Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-6 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-teal-900 px-5 py-4 text-white flex items-center justify-between border-b-2 border-teal-500">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wide">Sincronización con Google Sheets</h4>
                  <p className="text-[10px] text-teal-200 font-mono">Diagnóstico en tiempo real y configuración del Webhook</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSyncModal(false)}
                className="p-1 rounded-lg text-teal-300 hover:text-white hover:bg-teal-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-slate-800 text-xs">
              
              {/* Database status banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950">Servidor Central Activo: </span>
                    <span className="text-emerald-800">{users.length} trabajadores registrados y resguardados en el servidor.</span>
                  </div>
                </div>
                {onRefreshUsers && (
                  <button 
                    onClick={handleRefreshClick}
                    disabled={isRefreshing}
                    className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 transition"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refrescar
                  </button>
                )}
              </div>

              {/* Endpoint URL Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700 uppercase font-mono">
                  URL de la Aplicación Web (Google Apps Script):
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={sheetsUrl}
                    onChange={(e) => setSheetsUrl(e.target.value.trim())}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 text-xs font-mono p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50"
                  />
                  <button 
                    onClick={handleSaveUrl}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition shrink-0"
                  >
                    {urlSaveSuccess ? '¡Guardada!' : 'Guardar'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Esta URL debe terminar en <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">/exec</code>.
                </p>
              </div>

              {/* Action Buttons: Test Connection & Bulk Sync */}
              <div className="flex flex-wrap gap-2 pt-1">
                <button 
                  onClick={handleTestConnection}
                  disabled={testState === 'testing' || isSyncingAll}
                  className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testState === 'testing' ? 'animate-spin' : ''}`} />
                  {testState === 'testing' ? 'Verificando con Google...' : 'Probar Conexión con Google Sheets'}
                </button>

                <button 
                  onClick={handleSyncAll}
                  disabled={isSyncingAll || users.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <CloudUpload className="w-3.5 h-3.5" />
                  {isSyncingAll 
                    ? `Sincronizando (${syncProgress?.current}/${syncProgress?.total})...` 
                    : `Sincronizar Todos (${users.length} trabajadores)`}
                </button>
              </div>

              {/* Test Result Feedback */}
              {testState === 'success' && (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 text-emerald-900 flex items-start gap-2 animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">¡Conexión Verificada con Google Sheets!</p>
                    <p className="text-[11px] text-emerald-800">{testResultMsg}</p>
                  </div>
                </div>
              )}

              {testState === 'error' && (
                <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3.5 text-amber-950 space-y-2 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-xs uppercase tracking-wide text-amber-900">
                        {testErrorCode === 'AUTH_REQUIRED' ? 'Error de Permisos en Google Apps Script (401 / Login Obligatorio)' : 'Fallo de Conexión con Google Sheets'}
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5">{testResultMsg}</p>
                    </div>
                  </div>

                  {/* Step-by-step Solution Guide */}
                  <div className="bg-white border border-amber-200 rounded-lg p-3 text-[11px] space-y-1.5 text-slate-700">
                    <p className="font-bold text-amber-900 flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                      Instrucciones para solucionar el Error 401 en Google Sheets:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-slate-700 pl-1 leading-relaxed">
                      <li>Abra la hoja de cálculo de Google Sheets de seguimiento.</li>
                      <li>Vaya al menú superior: <strong>Extensiones</strong> &gt; <strong>Apps Script</strong>.</li>
                      <li>Arriba a la derecha, haga clic en el botón azul <strong>Implementar</strong> &gt; <strong>Administrar implementaciones</strong>.</li>
                      <li>Haga clic en el icono del lápiz ✏️ (<strong>Editar</strong>) en la implementación activa.</li>
                      <li>En <strong>Quién tiene acceso (Who has access)</strong>, seleccione: <strong className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-300">Cualquiera (Anyone)</strong>. <em>(¡Si está en 'Solo yo', Google bloquea el registro!)</em>.</li>
                      <li>Haga clic en <strong>Implementar</strong>.</li>
                      <li>Copie la URL generada, péguela en el campo de arriba y haga clic en <strong>Guardar</strong> y luego <strong>Probar Conexión</strong>.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Bulk Sync Result Feedback */}
              {syncResult && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 animate-fade-in">
                  <p className="font-bold text-slate-800">Resultado de la sincronización:</p>
                  <p className="text-[11px] text-emerald-700 font-medium">✓ {syncResult.success} trabajadores sincronizados con éxito a Google Sheets.</p>
                  {syncResult.fail > 0 && (
                    <div>
                      <p className="text-[11px] text-rose-600 font-medium">✗ {syncResult.fail} no pudieron sincronizarse.</p>
                      {syncResult.errors.map((err, i) => (
                        <p key={i} className="text-[10px] text-slate-500 font-mono mt-0.5">• {err}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Expandable Google Apps Script Code Section */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <button
                  onClick={() => setShowScriptCode(!showScriptCode)}
                  className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-100 transition"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-teal-700" />
                    <div>
                      <span className="font-bold text-xs text-slate-800">Código Oficial para Google Apps Script (Código.gs)</span>
                      <p className="text-[10px] text-slate-500">¿No sabe qué código poner en su Apps Script? Haga clic aquí para copiarlo listo.</p>
                    </div>
                  </div>
                  {showScriptCode ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showScriptCode && (
                  <div className="p-4 bg-white border-t border-slate-200 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-600 font-bold uppercase">Archivo: Código.gs</span>
                      <button
                        onClick={handleCopyScriptCode}
                        className="bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            ¡Código Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Código al Portapapeles
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-[10px] font-mono bg-slate-900 text-emerald-300 p-3 rounded-lg overflow-x-auto max-h-56 select-all leading-relaxed">
                      {GOOGLE_APPS_SCRIPT_CODE}
                    </pre>
                    <div className="text-[10px] text-slate-600 bg-teal-50 p-2.5 rounded-lg border border-teal-200 space-y-1">
                      <p className="font-bold text-teal-950">Pasos rápidos para aplicarlo en su Google Sheet:</p>
                      <p>1. Pegue este código en <code>Código.gs</code> y presione el botón Guardar 💾.</p>
                      <p>2. Presione <strong>Implementar</strong> &gt; <strong>Nueva implementación</strong> (o Administrar implementaciones &gt; Editar).</p>
                      <p>3. En <strong>Quién tiene acceso</strong>, elija <strong>Cualquiera (Anyone)</strong>.</p>
                      <p>4. Copie la URL generada, péguela arriba y presione Guardar y Probar Conexión.</p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-5 py-3 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setShowSyncModal(false)}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-1.5 rounded-lg transition"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
