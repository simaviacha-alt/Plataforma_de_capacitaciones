import React, { useState, useEffect } from 'react';
import { UserProgress, Video, Exam, ExamAttempt, Question } from '../types';
import { INITIAL_VIDEOS, MODULES_INFO } from '../data/videos';
import { EXAM_BANKS } from '../data/questions';
import YoutubePlayer from './YoutubePlayer';
import PaepBot from './PaepBot';
import { syncUserToGoogleSheets } from '../utils/syncService';
import { 
  BookOpen, Play, CheckCircle, HelpCircle, RefreshCw, XCircle, ChevronRight, ChevronDown, ChevronUp,
  Award, Clock, Lock, BarChart2, ShieldCheck, Heart, User, Building, LogOut,
  Bot, MessageSquare, Sparkles, CheckCheck
} from 'lucide-react';

interface MainDashboardProps {
  user: UserProgress;
  onUpdateUserProgress: (updatedUser: UserProgress) => void;
  onLogout: () => void;
}

export default function MainDashboard({
  user,
  onUpdateUserProgress,
  onLogout
}: MainDashboardProps) {
  // Selected Program state (defaults to registered role)
  const [activeProgram, setActiveProgram] = useState<'visita' | 'general' | 'conductor' | 'autorizante' | 'contratista' | 'soboce'>(user.rol);

  // Secure verification block for Autorizante
  const [isAutorizanteUnlocked, setIsAutorizanteUnlocked] = useState<boolean>(false);
  const [autorizantePass, setAutorizantePass] = useState<string>('');
  const [autorizanteError, setAutorizanteError] = useState<string>('');
  const [accordionPass, setAccordionPass] = useState<string>('');
  const [accordionError, setAccordionError] = useState<string>('');

  // PAEP Technical Assistant Bot view state
  const [showPaepBot, setShowPaepBot] = useState<boolean>(false);

  // Filter videos for the current user's active program
  const getRoleVideos = (): Video[] => {
    if (activeProgram === 'visita') {
      return INITIAL_VIDEOS.filter(v => v.roleRequirement === 'visita');
    }
    if (activeProgram === 'conductor') {
      return INITIAL_VIDEOS.filter(v => v.roleRequirement === 'conductor');
    }
    if (activeProgram === 'autorizante') {
      if (user.rol !== 'autorizante' && !isAutorizanteUnlocked) {
        return [];
      }
      return INITIAL_VIDEOS.filter(v => v.roleRequirement === 'autorizante');
    }

    // Contractors (contratista / general) and Personal SOBOCE
    if (activeProgram === 'contratista' || activeProgram === 'general' || activeProgram === 'soboce') {
      const type = user.contratistaTipo || 'III';
      // Inducción General includes: v_general_1 (Seguridad Industrial), v_general_2 (Medio Ambiente) and v_solicitante_1 (Solicitante PAEP)
      const generalVideos = INITIAL_VIDEOS.filter(v => v.roleRequirement === 'general');
      let videos = [...generalVideos];

      // If they are Tipo I, Tipo II or SOBOCE, we ALSO add the 9 contractor videos
      if (type === 'I' || type === 'II' || activeProgram === 'soboce' || activeProgram === 'contratista') {
        const capacVids = INITIAL_VIDEOS.filter(v => v.roleRequirement === 'contratista');
        videos = [...videos, ...capacVids];
      }

      // Si fue desbloqueado con la clave oficial de Autorizante PAEP, se añaden a la lista
      if (isAutorizanteUnlocked || user.rol === 'autorizante') {
        const autorizanteVids = INITIAL_VIDEOS.filter(v => v.roleRequirement === 'autorizante');
        videos = [...videos, ...autorizanteVids];
      }

      return videos;
    }

    return [];
  };

  const roleVideos = getRoleVideos();
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(roleVideos[0] || null);
  
  // Handle active program change
  useEffect(() => {
    const pVideos = getRoleVideos();
    setSelectedVideo(pVideos[0] || null);
    setActiveExam(null);
    setShowExamResults(null);
    if ((activeProgram === 'autorizante' || isAutorizanteVideosComplete()) && isAutorizanteVideosComplete()) {
      setShowPaepBot(true);
    } else {
      setShowPaepBot(false);
    }
  }, [activeProgram, isAutorizanteUnlocked]);
  
  // Selected Exam state
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [examAnswers, setExamAnswers] = useState<{ [questionId: string]: any }>({});
  const [showExamResults, setShowExamResults] = useState<ExamAttempt | null>(null);
  const [activeRandomExamIndex, setActiveRandomExamIndex] = useState<number>(0);
  const [contractorExamPassThreshold, setContractorExamPassThreshold] = useState<85 | 90>(90);

  // Module expansion state
  const [expandedModules, setExpandedModules] = useState<{ [key: string]: boolean }>({
    'general_induction': true,
    'visita_induction': true,
    'conductor_induction': true,
    'autorizante_paep': true,
    'contratista_capacitacion': false,
    'autorizante_module': false
  });

  // Group the current program's videos into descriptive, high-quality modules
  const getGroupedModules = () => {
    const modules: { id: string; name: string; description: string; videos: Video[]; isLocked?: boolean; lockReason?: string }[] = [];

    if (activeProgram === 'visita') {
      modules.push({
        id: 'visita_induction',
        name: 'Inducción de Visitas',
        description: 'Lineamientos de seguridad y medio ambiente obligatorios para visitantes.',
        videos: roleVideos.filter(v => v.roleRequirement === 'visita')
      });
    } else if (activeProgram === 'conductor') {
      modules.push({
        id: 'conductor_induction',
        name: 'Inducción para Conductores',
        description: 'Capacitación específica en tránsito, carguío y seguridad vial interna.',
        videos: roleVideos.filter(v => v.roleRequirement === 'conductor')
      });
    } else if (activeProgram === 'autorizante') {
      modules.push({
        id: 'autorizante_paep',
        name: 'Capacitación Autorizante PAEP',
        description: 'Módulos avanzados de control de trabajos de alto riesgo en planta.',
        videos: roleVideos.filter(v => v.roleRequirement === 'autorizante')
      });
    } else {
      // It is general, contratista, or soboce
      // 1. Inducción General module
      const generalVids = roleVideos.filter(v => v.roleRequirement === 'general');
      if (generalVids.length > 0) {
        modules.push({
          id: 'general_induction',
          name: 'Inducción General y Solicitante PAEP',
          description: 'Módulos de Seguridad Industrial, Medio Ambiente y Solicitante de Permisos de Trabajo.',
          videos: generalVids
        });
      }

      // 2. Capacitación Contratistas / Capacitaciones Anuales module
      const contratistaVids = roleVideos.filter(v => v.roleRequirement === 'contratista');
      if (contratistaVids.length > 0) {
        const moduleName = activeProgram === 'soboce' ? 'Capacitaciones Anuales Programadas' : 'Capacitación a Contratistas Rutinarios';
        const moduleDesc = activeProgram === 'soboce' ? 'Programas oficiales anuales de refuerzo y prevención.' : '9 capítulos obligatorios para contratistas recurrentes de planta.';
        modules.push({
          id: 'contratista_capacitacion',
          name: moduleName,
          description: moduleDesc,
          videos: contratistaVids
        });
      }

      // 3. Capacitación Autorizante PAEP - Aparece para contratistas pero protegido con clave oficial
      const isUnlocked = isAutorizanteUnlocked || user.rol === 'autorizante';
      const autorizanteVids = INITIAL_VIDEOS.filter(v => v.roleRequirement === 'autorizante');
      modules.push({
        id: 'autorizante_paep',
        name: 'Capacitación Autorizante PAEP',
        description: isUnlocked
          ? 'Módulos avanzados y controles críticos de Permisos de Trabajo de Alto Riesgo (Desbloqueado).'
          : 'Módulos avanzados y controles críticos de Permisos de Trabajo de Alto Riesgo (Requiere clave autorizada).',
        videos: autorizanteVids,
        isLocked: !isUnlocked,
        lockReason: 'Este módulo requiere la contraseña de autorización aprobada por Jefatura SIMA (CVCMsima2026).'
      });
    }

    return modules;
  };

  // Welcome Messages and Instruction texts matching user choice
  const getInstructions = () => {
    switch(activeProgram) {
      case 'visita':
        return "Las instrucciones para las inducciones son las siguientes: Inducción de Seguridad Industrial y Medio Ambiente para visitas- Personal que no realizara ningún tipo de trabajo dentro de planta.";
      case 'general':
        return "Inducción General de Seguridad Industrial y Medio Ambiente: Personal que realizaran trabajos en planta. Debe ver todos los videos al 100% para habilitar la prueba.";
      case 'conductor':
        return "Inducción de Seguridad Industrial y Medio Ambiente específica para conductores: Proveedores y transportistas externos. Complete el video al 100% para rendir el examen.";
      case 'autorizante':
        return "Capacitación Avanzada Autorizante PAEP - Personal facultado para la firma y autorización de Permisos de Trabajo de Alto Riesgo. Complete todos los 6 módulos de capacitación para habilitar la prueba principal. Solo tiene 1 INTENTO.";
      case 'contratista':
        return "Todo personal rutinario de SOBOCE S.A. Su progreso por video se registrará de 10 en 10%. Complete la revisión para rendir la prueba reglamentaria de ingresos.";
      case 'soboce':
        return "Inducción y Capacitación para Personal de SOBOCE S.A. (Tipo II): Complete los capítulos de Inducción General para habilitar su prueba. De acuerdo a la programación anual del año se habilitarán contenidos de refuerzo.";
      default:
        return "";
    }
  };

  // Check if a specific exam category is approved
  function hasApprovedExam(examTypeId: string): boolean {
    const attempts = user.examAttempts[examTypeId] || [];
    return attempts.some(a => a.passed);
  }

  // Get current completed video count
  const getCompletedVideosCount = () => {
    return roleVideos.filter(v => (user.videoProgress[v.id] || 0) === 100).length;
  };

  // Helper to check if induction videos are 100% completed
  const isInductionVideosComplete = (progress = user.videoProgress) => {
    if (activeProgram === 'visita') {
      return (progress['v_visita_1'] || 0) === 100;
    }
    if (activeProgram === 'conductor') {
      return (progress['v_conductor_1'] || 0) === 100;
    }
    if (activeProgram === 'general' || activeProgram === 'contratista' || activeProgram === 'soboce') {
      return (progress['v_general_1'] || 0) === 100 && 
             (progress['v_general_2'] || 0) === 100 && 
             (progress['v_solicitante_1'] || 0) === 100;
    }
    return false;
  };

  // Helper to check if all 7 Autorizante PAEP videos are 100% completed
  const isAutorizanteVideosComplete = (progress = user.videoProgress) => {
    const autVids = [
      'v_autorizante_1', 'v_autorizante_2', 'v_autorizante_3_1', 
      'v_autorizante_3_2', 'v_autorizante_4', 'v_autorizante_5', 'v_autorizante_6'
    ];
    return autVids.every(vid => (progress[vid] || 0) === 100);
  };

  const allRequiredVideosCompleted = () => {
    if (activeProgram === 'general' || activeProgram === 'contratista' || activeProgram === 'soboce') {
      return isInductionVideosComplete();
    }
    if (activeProgram === 'autorizante') {
      return isAutorizanteVideosComplete();
    }
    // For other roles, all matching must be completed
    return roleVideos.every(v => (user.videoProgress[v.id] || 0) === 100);
  };

  // Get active exam based on progress
  const handleOpenExam = () => {
    setExamAnswers({});
    setShowExamResults(null);

    if (activeProgram === 'general' || activeProgram === 'contratista' || activeProgram === 'soboce') {
      // Randomly select 1 of 4 general exams
      // We tie the randomized choice so it stays stable during session but can be refreshed
      const savedIndex = localStorage.getItem(`exam_idx_${user.ci}`);
      let index = 0;
      if (savedIndex !== null) {
        index = parseInt(savedIndex, 10);
      } else {
        index = Math.floor(Math.random() * EXAM_BANKS.general.length);
        localStorage.setItem(`exam_idx_${user.ci}`, index.toString());
      }
      setActiveRandomExamIndex(index);
      setActiveExam(EXAM_BANKS.general[index]);
    } else if (activeProgram === 'conductor') {
      setActiveExam(EXAM_BANKS.conductor[0]);
    } else if (activeProgram === 'autorizante') {
      setActiveExam(EXAM_BANKS.autorizante[0]);
    }
  };

  const handleVideoProgressUpdate = (pct: number) => {
    if (!selectedVideo) return;
    
    const current = user.videoProgress?.[selectedVideo.id] || 0;
    if (pct <= current) return;

    // Create copy of progress ensuring monotonic increase
    const updatedProgress = { ...user.videoProgress, [selectedVideo.id]: Math.max(current, pct) };
    const updatedUser = { ...user, videoProgress: updatedProgress };
    
    onUpdateUserProgress(updatedUser);
  };

  const handleVideoComplete = () => {
    if (!selectedVideo) return;

    // Set 100% watched
    const updatedProgress = { ...user.videoProgress, [selectedVideo.id]: 100 };
    let updatedUser: UserProgress = { ...user, videoProgress: updatedProgress };

    // Sync specifically this completed video to Google Sheets in INDUCCION VISUALIZACIONES or AUTORIZANTE PAEP
    const visSheet = user.rol === 'autorizante' ? 'AUTORIZANTE PAEP' : 'INDUCCION VISUALIZACIONES';
    syncUserToGoogleSheets('VIDEO_COMPLETADO', updatedUser, visSheet, selectedVideo.title).catch(console.error);

    // Check induction visualizaciones sync
    const isNowInductionDone = isInductionVideosComplete(updatedProgress);
    if (isNowInductionDone && !user.inductionVisualizacionSynced) {
      updatedUser.inductionVideosCompleted = true;
      updatedUser.inductionVisualizacionSynced = true;
      syncUserToGoogleSheets('INDUCCION_VISUALIZACIONES', updatedUser, 'INDUCCION VISUALIZACIONES', selectedVideo.title).catch(console.error);
    }

    // Check autorizante visualizaciones sync
    const isNowAutorizanteDone = isAutorizanteVideosComplete(updatedProgress);
    if (isNowAutorizanteDone && !user.autorizanteVisualizacionSynced) {
      updatedUser.autorizanteVideosCompleted = true;
      updatedUser.autorizanteVisualizacionSynced = true;
      syncUserToGoogleSheets('AUTORIZANTE_PAEP_VISUALIZACIONES', updatedUser, 'AUTORIZANTE PAEP', selectedVideo.title).catch(console.error);
      setShowPaepBot(true);
    }

    // Post-complete specific automations
    if (activeProgram === 'visita' && selectedVideo.id === 'v_visita_1') {
      // Visitas don't have exams. Auto-approve immediately to complete the induction
      const autoPassedAttempt: ExamAttempt = {
        score: 100,
        passed: true,
        date: new Date().toISOString(),
        submittedAnswers: {}
      };
      updatedUser.examAttempts = {
        ...updatedUser.examAttempts,
        visita_induction: [autoPassedAttempt]
      };
    }

    // If Solicitante video is completed
    if (selectedVideo.id === 'v_solicitante_1') {
      const solicitanteAttempt: ExamAttempt = {
        score: 100,
        passed: true,
        date: new Date().toISOString(),
        submittedAnswers: {}
      };
      updatedUser.examAttempts = {
        ...updatedUser.examAttempts,
        solicitante_paep: [solicitanteAttempt]
      };
    }

    onUpdateUserProgress(updatedUser);
  };

  // Manage Quiz Answering State
  const handleCheckboxChange = (questionId: string, optionIdx: number, checked: boolean) => {
    const current = (examAnswers[questionId] as number[]) || [];
    let updated: number[];
    if (checked) {
      updated = [...current, optionIdx].sort();
    } else {
      updated = current.filter(val => val !== optionIdx);
    }
    setExamAnswers({ ...examAnswers, [questionId]: updated });
  };

  const handleRadioChange = (questionId: string, optionIdx: number) => {
    setExamAnswers({ ...examAnswers, [questionId]: [optionIdx] });
  };

  const handleTrueFalseChange = (questionId: string, answer: boolean) => {
    setExamAnswers({ ...examAnswers, [questionId]: answer });
  };

  // Submit Exam Answers
  const handleSubmitExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeExam) return;

    // Check that all questions have been filled
    const unanswered = activeExam.questions.some(q => examAnswers[q.id] === undefined || (Array.isArray(examAnswers[q.id]) && examAnswers[q.id].length === 0));
    if (unanswered) {
      alert("⚠️ Todas las preguntas son obligatorias. Debe responder cada una antes de enviar.");
      return;
    }

    // Grade Exam
    let correctCount = 0;
    activeExam.questions.forEach(q => {
      const userAnswer = examAnswers[q.id];
      const correctAnswer = q.correctAnswers;

      if (q.type === 'true-false') {
        if (userAnswer === correctAnswer) {
          correctCount++;
        }
      } else if (q.type === 'multiple-choice') {
        // Multi-select or single select array
        const userArr = (userAnswer as number[]) || [];
        const correctArr = (correctAnswer as number[]) || [];
        
        // Check if both arrays are identical elements
        const isSame = userArr.length === correctArr.length && 
                       userArr.every((v, i) => v === correctArr[i]);
        if (isSame) {
          correctCount++;
        }
      }
    });

    const finalPct = Math.round((correctCount / activeExam.questions.length) * 100);
    const passed = finalPct >= activeExam.passingScore;

    // Create Attempt
    const newAttempt: ExamAttempt = {
      score: finalPct,
      passed: passed,
      date: new Date().toISOString(),
      submittedAnswers: { ...examAnswers }
    };

    // Determine exam category identifier mapping
    let examCategory = 'general_induction';
    if (activeProgram === 'conductor') examCategory = 'conductor_induction';
    if (activeProgram === 'autorizante') examCategory = 'autorizante_paep';

    const previousAttempts = user.examAttempts[examCategory] || [];
    const updatedAttempts = [...previousAttempts, newAttempt];

    let updatedUser: UserProgress = {
      ...user,
      examAttempts: {
        ...user.examAttempts,
        [examCategory]: updatedAttempts
      }
    };

    // Lockout logic if rejected
    if (!passed) {
      // Block for 24 hours
      const blockUntil = new Date();
      blockUntil.setHours(blockUntil.getHours() + 24);
      updatedUser.lockoutUntil = blockUntil.toISOString();
    } else {
      updatedUser.lockoutUntil = null;
      // If of tipo general, contratista or soboce, unlock the second part Solicitante PAEP
      if (activeProgram === 'general' || activeProgram === 'contratista' || activeProgram === 'soboce') {
        // We will unlock Solicitante video. It will render in the videos list.
        setTimeout(() => {
          // Auto select the newly unlocked Solicitante video
          const solicVideo = INITIAL_VIDEOS.find(v => v.id === 'v_solicitante_1');
          if (solicVideo) setSelectedVideo(solicVideo);
        }, 100);
      }
      if (activeProgram === 'contratista') {
        updatedUser.rucGenerated = true;
      }
    }

    onUpdateUserProgress(updatedUser);
    setShowExamResults(newAttempt);
  };

  // Check if Autorizante already exhausted their single attempt
  const isAutorizanteExhausted = () => {
    if (activeProgram !== 'autorizante') return false;
    const attempts = user.examAttempts['autorizante_paep'] || [];
    return attempts.length > 0 && !attempts.some(a => a.passed);
  };

  // Get test state text
  const getExamButtonState = () => {
    if (activeProgram === 'autorizante' && user.rol !== 'autorizante' && !isAutorizanteUnlocked) {
      return { text: "🔒 ÁREA PROTEGIDA (INGRESE CLAVE)", disabled: true, class: "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" };
    }

    let category = 'general_induction';
    if (activeProgram === 'conductor') category = 'conductor_induction';
    if (activeProgram === 'autorizante') category = 'autorizante_paep';

    const attempts = user.examAttempts[category] || [];
    if (attempts.some(a => a.passed)) {
      return { text: "✓ EXAMEN APROBADO", disabled: true, class: "bg-emerald-600 text-white cursor-not-allowed" };
    }
    
    if (activeProgram === 'autorizante' && attempts.length >= 1) {
      return { text: "🚫 INTENTO AGOTADO (REPROBADO)", disabled: true, class: "bg-red-950 border border-red-800 text-red-400 cursor-not-allowed" };
    }

    if (!allRequiredVideosCompleted()) {
      return { text: "🔒 EXAMEN BLOQUEADO (VEA LOS VIDEOS COMPLETO)", disabled: true, class: "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" };
    }

    return { text: "✍️ RENDIR EXAMEN DE CAPACITACIÓN", disabled: false, class: "bg-slate-900 hover:bg-slate-800 text-white shadow-md cursor-pointer animate-pulse" };
  };

  const examBtnState = getExamButtonState();

  // Dynamic universal progress tracker chart for EVERY user
  const renderUniversalProgressChart = () => {
    const activeVideos = roleVideos;
    if (activeVideos.length === 0) return null;

    const chartHeight = 100;
    const chartWidth = 450;
    const count = activeVideos.length;
    // Calculate dynamic bar dimensions
    const barWidth = Math.max(16, Math.floor((chartWidth * 0.65) / count));
    const gap = Math.floor((chartWidth - (barWidth * count)) / (count + 1));

    return (
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-md mt-6">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <BarChart2 className="w-5 h-5 text-emerald-700" />
          <h4 className="text-xs font-bold text-slate-800 tracking-wider uppercase font-mono">
            Gráfico de Avance y Progreso Visual - {activeProgram === 'visita' ? 'Visitas' : activeProgram === 'general' ? 'General SIMA' : activeProgram === 'conductor' ? 'Conductores' : activeProgram === 'autorizante' ? 'Autorizante PAEP' : activeProgram === 'soboce' ? 'Personal SOBOCE' : 'Contratistas Rutinarios'}
          </h4>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 justify-between">
          {/* Custom SVG Bar Chart */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-150 shadow-inner flex-1 w-full flex justify-center">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} className="w-full max-w-[450px] h-36">
              {/* Grid Lines */}
              <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#cbd5e1" strokeWidth="1" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#e2e8f0" strokeDasharray="4 4" />
              <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#e2e8f0" strokeDasharray="4 4" />

              {/* Data Bars */}
              {activeVideos.map((v, i) => {
                const progressVal = user.videoProgress[v.id] || 0;
                const percentHeight = (progressVal / 100) * chartHeight;
                const barX = gap + i * (barWidth + gap);
                const barY = chartHeight - percentHeight;

                return (
                  <g key={v.id}>
                    {/* Background Bar */}
                    <rect 
                      x={barX} 
                      y="0" 
                      width={barWidth} 
                      height={chartHeight} 
                      fill="#f1f5f9" 
                      rx="4" 
                    />
                    {/* Active Progress Bar */}
                    <rect 
                      x={barX} 
                      y={barY} 
                      width={barWidth} 
                      height={percentHeight} 
                      fill={progressVal === 100 ? '#10b981' : progressVal > 0 ? '#f59e0b' : '#cbd5e1'} 
                      rx="4" 
                      className="transition-all duration-500 ease-out"
                    />
                    {/* Percentage text label */}
                    <text 
                      x={barX + barWidth / 2} 
                      y={barY - 5 > 12 ? barY - 5 : 12} 
                      textAnchor="middle" 
                      fontSize="9" 
                      fontWeight="bold" 
                      fill={progressVal === 100 ? '#047857' : progressVal > 0 ? '#d97706' : '#64748b'}
                      className="font-mono text-[9px]"
                    >
                      {progressVal}%
                    </text>
                    {/* X-Axis Label */}
                    <text 
                      x={barX + barWidth / 2} 
                      y={chartHeight + 15} 
                      textAnchor="middle" 
                      fontSize="8" 
                      fontWeight="bold" 
                      fill="#475569"
                      className="font-mono text-[83%]"
                    >
                      {count <= 4 ? `Vídeo ${i + 1}` : `v${i + 1}`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Indicators Legend */}
          <div className="flex-1 space-y-2 text-xs text-slate-600 w-full">
            <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider font-mono">Detalle del Progreso por Video:</p>
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-2">
              {activeVideos.map((v, i) => {
                const prog = user.videoProgress[v.id] || 0;
                return (
                  <div key={v.id} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 truncate pr-4">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${prog === 100 ? 'bg-emerald-500' : prog > 0 ? 'bg-amber-500' : 'bg-slate-300'}`} />
                      <span className="font-semibold text-slate-700 truncate max-w-[200px]">
                        Vídeo {i + 1}: {v.title}
                      </span>
                    </div>
                    <span className={`font-mono font-bold ${prog === 100 ? 'text-emerald-600' : prog > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
                      {prog}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Profile & Progress Tracker Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Selector de Programa de Inducción/Capacitación (Visible Inside Platform) */}
          {/* Selector de Programa de Inducción/Capacitación */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-emerald-700" /> Programa de Capacitación
              </label>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
              Acceda a su ruta asignada y a los módulos de Autorizante PAEP habilitados:
            </p>

            {/* Quick program switcher for contractors and Soboce personnel */}
            {(user.rol === 'contratista' || user.rol === 'general' || user.rol === 'soboce') ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveProgram(user.rol);
                    setShowPaepBot(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    activeProgram !== 'autorizante'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base">🏗️</span>
                  <span className="text-[11px] font-bold uppercase leading-tight">
                    {user.rol === 'soboce' ? 'Personal SOBOCE' : 'Contratistas'}
                  </span>
                  <span className="text-[9px] text-slate-500 leading-none">Inducción General</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveProgram('autorizante');
                    setShowPaepBot(false);
                  }}
                  className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                    activeProgram === 'autorizante'
                      ? 'bg-sky-50 border-sky-300 text-sky-950 shadow-sm ring-2 ring-sky-500/20'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base">🔑</span>
                    {!isAutorizanteUnlocked && (
                      <Lock className="w-3.5 h-3.5 text-amber-600" />
                    )}
                  </div>
                  <span className="text-[11px] font-bold uppercase leading-tight text-sky-900">
                    Autorizante PAEP
                  </span>
                  <span className="text-[9px] text-amber-700 font-semibold leading-none">
                    {isAutorizanteUnlocked ? '✓ Desbloqueado' : '🔒 Requiere clave'}
                  </span>
                </button>
              </div>
            ) : (
              <div className="mt-2">
                {activeProgram === 'visita' && (
                  <div className="p-3 bg-sky-50 text-sky-950 border border-sky-100 rounded-xl flex items-center gap-2.5 shadow-sm animate-fade-in">
                    <span className="text-xl">💼</span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-sky-900 leading-tight">Inducción para Visitas</p>
                      <p className="text-[9px] text-sky-700 mt-0.5 leading-none">Flujo básico de seguridad (solo video)</p>
                    </div>
                  </div>
                )}
                {activeProgram === 'conductor' && (
                  <div className="p-3 bg-yellow-50 text-yellow-950 border border-yellow-200 rounded-xl flex items-center gap-2.5 shadow-sm animate-fade-in">
                    <span className="text-xl">🚛</span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-yellow-900 leading-tight">Inducción SIMA para Conductores</p>
                      <p className="text-[9px] text-yellow-700 mt-0.5 leading-none">Transporte y conducción externa</p>
                    </div>
                  </div>
                )}
                {activeProgram === 'autorizante' && (
                  <div className="p-3 bg-rose-50 text-rose-950 border border-rose-100 rounded-xl flex items-center gap-2.5 shadow-sm animate-fade-in">
                    <span className="text-xl">🔑</span>
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-rose-900 leading-tight">Autorizante PAEP Oficial</p>
                      <p className="text-[9px] text-rose-700 mt-0.5 leading-none">Aprobación y firmas de seguridad</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Secure verification block for Autorizante in sidebar */}
            {activeProgram === 'autorizante' && user.rol !== 'autorizante' && !isAutorizanteUnlocked && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 space-y-2.5 animate-fade-in shadow-sm mt-3">
                <div className="flex items-center gap-1.5 text-amber-900">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <label className="block text-[10px] font-bold uppercase font-mono">
                    Código de Autorizante PAEP *
                  </label>
                </div>
                <p className="text-[10px] text-amber-800 leading-relaxed font-sans">
                  Ingrese la contraseña oficial aprobada por Jefatura SIMA:
                </p>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Escriba la clave"
                    value={autorizantePass}
                    onChange={(e) => {
                      setAutorizantePass(e.target.value);
                      setAutorizanteError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (autorizantePass === 'CVCMsima2026') {
                          setIsAutorizanteUnlocked(true);
                          setAutorizanteError('');
                        } else {
                          setAutorizanteError('Código incorrecto.');
                        }
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-xs font-mono text-slate-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (autorizantePass === 'CVCMsima2026') {
                      setIsAutorizanteUnlocked(true);
                      setAutorizanteError('');
                    } else {
                      setAutorizanteError('Código incorrecto.');
                    }
                  }}
                  className="w-full py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition shadow-sm"
                >
                  Verificar y Desbloquear
                </button>
                {autorizanteError && (
                  <p className="text-[9px] text-red-600 font-bold font-mono">{autorizanteError}</p>
                )}
              </div>
            )}
          </div>

          {/* User Card */}
        <div className="bg-slate-950 text-white rounded-2xl border-t-4 border-t-emerald-600 border border-slate-800/80 shadow-xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-slate-800 rounded-bl-3xl flex items-center justify-center font-bold text-slate-500 font-mono text-[10px] select-none">
            {user.planta.split(' ').slice(1).join(' ') || 'VIACHA'}
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-450">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                CI: {user.ci}
              </p>
              <h3 className="text-sm font-bold tracking-tight">
                {user.nombres} {user.apellidoPaterno}
              </h3>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Empresa / Personal SOBOCE:</span>
              <span className="font-bold uppercase text-slate-100">{user.empresa}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Planta Operativa:</span>
              <span className="font-semibold text-slate-100">{user.planta}</span>
            </div>
            <div className="flex items-center justify-between pb-1">
              <span className="text-slate-400">Programa actual:</span>
              <span className="font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/40 text-[10px] uppercase max-w-[150px] truncate animate-pulse">
                {user.rol === 'visita' && 'Visitas'}
                {user.rol === 'general' && 'General SIMA'}
                {user.rol === 'conductor' && 'Conductores'}
                {user.rol === 'autorizante' && 'Autorizante PAEP'}
                {user.rol === 'contratista' && 'Contratistas Rutinarios'}
                {user.rol === 'soboce' && 'Personal SOBOCE'}
              </span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full mt-4 flex items-center justify-center gap-1 py-1.5 px-3 bg-red-950/20 border border-red-900/30 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" /> Salir / Cerrar Sesión
          </button>
        </div>

        {/* Video Learning Checklist */}
        <div className="bg-white rounded-2xl border border-slate-150 shadow-md p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h4 className="text-xs font-bold text-slate-700 tracking-wider uppercase font-mono">
              Capacitaciones por Módulos
            </h4>
            <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              {getCompletedVideosCount()} / {roleVideos.length} Completados
            </span>
          </div>

          <div className="space-y-3">
            {getGroupedModules().map((mod) => {
              const isOpen = expandedModules[mod.id] ?? false;
              const completedCount = mod.videos.filter(v => (user.videoProgress[v.id] || 0) === 100).length;
              const totalCount = mod.videos.length;
              const isModuleCompleted = totalCount > 0 && completedCount === totalCount;

              return (
                <div key={mod.id} className="border border-slate-150 rounded-xl overflow-hidden shadow-sm bg-slate-50/20">
                  {/* Accordion Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedModules(prev => ({ ...prev, [mod.id]: !isOpen }))}
                    className="w-full flex items-center justify-between p-3 text-left bg-white hover:bg-slate-50/80 transition font-sans border-b border-slate-100"
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-xs font-bold uppercase tracking-wide ${isModuleCompleted ? 'text-emerald-800 font-extrabold' : 'text-slate-850 text-slate-800'}`}>
                          {mod.name}
                        </span>
                        {isModuleCompleted ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <CheckCircle className="w-2.5 h-2.5 fill-emerald-800 text-white" /> Completado
                          </span>
                        ) : mod.isLocked ? (
                          <span className="bg-red-50 border border-red-200 text-red-700 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 text-red-600" /> Bloqueado
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{mod.description}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {completedCount}/{totalCount}
                      </span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="p-2.5 bg-slate-50/50 space-y-2 border-t border-slate-100">
                      {mod.isLocked ? (
                        <div className="p-3 text-center space-y-3 bg-slate-50 rounded-lg">
                          <Lock className="w-5 h-5 text-slate-400 mx-auto animate-bounce" />
                          <p className="text-xs text-slate-600 font-medium">{mod.lockReason}</p>
                          
                          <div className="pt-2.5 border-t border-slate-200 text-left space-y-1.5 max-w-sm mx-auto">
                            <label className="block text-[9px] font-bold uppercase text-amber-950 font-mono">
                              Código o Contraseña de Autorizante PAEP *
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="password"
                                placeholder="Escriba la contraseña"
                                value={accordionPass}
                                onChange={(e) => {
                                  setAccordionPass(e.target.value);
                                  setAccordionError('');
                                }}
                                className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs font-mono text-slate-900"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (accordionPass === 'CVCMsima2026') {
                                    setIsAutorizanteUnlocked(true);
                                    setAccordionError('');
                                    setAccordionPass('');
                                  } else {
                                    setAccordionError('Código incorrecto.');
                                  }
                                }}
                                className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition whitespace-nowrap"
                              >
                                Desbloquear
                              </button>
                            </div>
                            {accordionError && (
                              <p className="text-[9px] text-red-600 font-bold font-mono">{accordionError}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        mod.videos.map((v, idx) => {
                          const pct = user.videoProgress[v.id] || 0;
                          const isSelected = selectedVideo?.id === v.id;
                          return (
                            <button
                              key={v.id}
                              onClick={() => {
                                setSelectedVideo(v);
                                setActiveExam(null); // Close exam if playing video
                              }}
                              className={`w-full flex items-start gap-2.5 p-2 rounded-lg border text-left transition-all ${
                                isSelected 
                                  ? 'bg-emerald-800 text-white border-emerald-900 font-bold shadow-sm' 
                                  : 'bg-white border-slate-200/60 hover:bg-slate-50'
                              }`}
                            >
                              <div className="mt-0.5 flex-shrink-0">
                                {pct === 100 ? (
                                  <CheckCircle className={`w-4 h-4 ${isSelected ? 'text-white fill-white/20' : 'text-emerald-600 fill-emerald-50'}`} />
                                ) : pct > 0 ? (
                                  <Play className={`w-4 h-4 ${isSelected ? 'text-emerald-250 fill-white/10' : 'text-amber-500 fill-amber-50'}`} />
                                ) : (
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${
                                    isSelected ? 'border-emerald-500 text-emerald-100 bg-white/15' : 'border-slate-300 text-slate-500'
                                  }`}>
                                    {idx + 1}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-semibold leading-tight truncate ${isSelected ? 'text-white font-bold' : 'text-slate-700'}`}>
                                  {v.title}
                                </p>
                                <p className={`text-[9px] font-mono mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-slate-500'}`}>
                                  {pct}% completado
                                </p>
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Exam Trigger Button wrapper */}
          {user.rol !== 'visita' && (
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
              {(activeProgram === 'autorizante' || isAutorizanteVideosComplete() || user.rol === 'contratista' || user.rol === 'general' || user.rol === 'soboce') && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPaepBot(!showPaepBot);
                    setActiveExam(null);
                  }}
                  className={`w-full py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-2 border ${
                    showPaepBot 
                      ? 'bg-sky-700 text-white border-sky-800 shadow' 
                      : 'bg-sky-50 text-sky-900 border-sky-200 hover:bg-sky-100'
                  }`}
                >
                  <Bot className="w-4 h-4 text-sky-600" />
                  {showPaepBot ? 'Ver Videos de Estudio' : 'Consultar Bot PAEP'}
                </button>
              )}

              <button
                disabled={examBtnState.disabled}
                onClick={handleOpenExam}
                className={`w-full py-2.5 px-4 text-xs font-bold uppercase tracking-wider rounded-xl transition-all border text-center ${examBtnState.class}`}
              >
                {examBtnState.text}
              </button>
            </div>
          )}
        </div>

        </div>

      {/* Main Board View: Player OR Quiz Form */}
      <div className="lg:col-span-2 space-y-6">
        {activeProgram === 'autorizante' && user.rol !== 'autorizante' && !isAutorizanteUnlocked ? (
          <div className="bg-white border border-amber-200 rounded-2xl p-8 text-center space-y-5 shadow-md flex flex-col justify-center items-center min-h-[380px] animate-fade-in border-t-4 border-t-amber-500">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-inner">
              <Lock className="w-8 h-8 animate-bounce" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base font-bold uppercase text-slate-800 tracking-wider font-mono">
                Área Protegida — Capacitación para Autorizante PAEP
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                Este programa contiene los 7 módulos técnicos avanzados para la autorización y firma de Permisos de Trabajo de Alto Riesgo <strong>SPT-GSS.SI.004 (Rev. 05)</strong>. Requiere verificación de clave de acceso aprobada por Jefatura SIMA.
              </p>
            </div>

            <div className="w-full max-w-xs space-y-2 pt-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Ingrese clave de acceso"
                  value={autorizantePass}
                  onChange={(e) => {
                    setAutorizantePass(e.target.value);
                    setAutorizanteError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (autorizantePass === 'CVCMsima2026') {
                        setIsAutorizanteUnlocked(true);
                        setAutorizanteError('');
                      } else {
                        setAutorizanteError('Código de acceso incorrecto.');
                      }
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 text-xs font-mono text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (autorizantePass === 'CVCMsima2026') {
                      setIsAutorizanteUnlocked(true);
                      setAutorizanteError('');
                    } else {
                      setAutorizanteError('Código de acceso incorrecto.');
                    }
                  }}
                  className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-sm"
                >
                  Acceder
                </button>
              </div>
              {autorizanteError && (
                <p className="text-[10px] text-red-600 font-bold font-mono">{autorizanteError}</p>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Module Header Instructions */}
            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex gap-3 text-xs leading-relaxed text-slate-600">
              <BookOpen className="w-5 h-5 text-slate-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 uppercase font-mono block mb-1">
                  Instrucciones Oficiales del Módulo:
                </span>
                {getInstructions()}
              </div>
            </div>

            {/* Visitas banner */}
            {activeProgram === 'visita' && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-2xl text-white shadow-md flex flex-col justify-center items-center text-center">
                <h2 className="text-2xl font-black tracking-wider uppercase drop-shadow-sm animate-pulse">
                  BIENVENIDOS A PLANTA VIACHA
                </h2>
                <p className="text-xs text-emerald-100 mt-1.5 font-medium max-w-md">
                  Complete la visualización de la guía corta de inducción SIMA abajo. El sistema registrará su presencia de manera inmediata.
                </p>
              </div>
            )}

            {/* Check if general induction is fully completed & they are currently on Solicitante module */}
            {activeProgram === 'general' && hasApprovedExam('general_induction') && (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 rounded-xl text-white text-xs space-y-1">
                <span className="font-bold uppercase tracking-wider block">🎉 ¡PRIMERA PARTE APROBADA!</span>
                <p className="medium">
                  Usted aprobó el examen de Inducción SIMA General con éxito. A continuación, continúe con la capacitación de <strong>Solicitante PAEP</strong> viendo el video abajo para concretar su inducción de forma exitosa.
                </p>
              </div>
            )}

            {/* SUCCESS NOTIFICATIONS */}
            {activeProgram === 'visita' && (user.videoProgress['v_visita_1'] || 0) === 100 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center flex flex-col items-center gap-2">
                <Award className="w-10 h-10 text-emerald-600" />
                <h3 className="text-md font-bold text-emerald-950 uppercase">Inducción Completada</h3>
                <p className="text-xs text-emerald-800">
                  Usted está habilitado para ingresar como Visita. Registro guardado automáticamente. Puede retirarse.
                </p>
              </div>
            )}

            {activeProgram === 'general' && hasApprovedExam('general_induction') && (user.videoProgress['v_solicitante_1'] || 0) === 100 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center flex flex-col items-center gap-2">
                <Award className="w-10 h-10 text-emerald-600 animate-bounce" />
                <h3 className="text-lg font-black text-emerald-950 uppercase">¡¡FELICIDADES COMPLETO SU INDUCCION CON ÉXITO!!</h3>
                <p className="text-xs text-emerald-800">
                  Registrado exitosamente tanto en Aprobados SIMA General como en Solicitantes PAEP.
                </p>
              </div>
            )}

            {activeProgram === 'conductor' && hasApprovedExam('conductor_induction') && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center flex flex-col items-center gap-2">
                <Award className="w-10 h-10 text-emerald-600" />
                <h3 className="text-[15px] font-black text-emerald-950 uppercase">¡¡FELICIDADES COMPLETO SU INDUCCION CON ÉXITO!!</h3>
                <p className="text-xs text-emerald-800">
                  Usted ha aprobado satisfactoriamente su examen reglamentario para camiones y vehículos pesados de transporte.
                </p>
              </div>
            )}

            {(activeProgram === 'contratista') && (hasApprovedExam('contratista_induction') || hasApprovedExam('general_induction')) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center flex flex-col items-center gap-2">
                <Award className="w-10 h-10 text-emerald-600 animate-pulse" />
                <h3 className="text-[15px] font-bold text-emerald-950 uppercase">¡CONTRATISTA AUTORIZADO!</h3>
                <p className="text-xs text-emerald-800 font-medium">
                  Su nota en el examen aprobó el umbral del 90%. Se han generado automáticamente sus registros reglamentarios <strong>RUC</strong> en la base de datos oficial de planta.
                </p>
              </div>
            )}

            {activeProgram === 'autorizante' && hasApprovedExam('autorizante_paep') && (
              <div className="bg-emerald-100 border border-emerald-300 rounded-xl p-5 text-center flex flex-col items-center gap-2">
                <ShieldCheck className="w-12 h-12 text-emerald-600" />
                <h3 className="text-[17px] font-black text-emerald-950 uppercase">AUTORIZANTE HABILITADO</h3>
                <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                  ¡Excelente rendimiento! Ha consolidado su acreditación del Sistema de Permisos de Trabajo con éxito, generando su credencial en el reporte oficial.
                </p>
              </div>
            )}

            {/* NOTIFICACIÓN VISUALIZACIONES: INDUCCIÓN COMPLETADA (100%) */}
            {(activeProgram === 'general' || activeProgram === 'contratista' || activeProgram === 'soboce') && isInductionVideosComplete() && (
              <div className="bg-emerald-50 border-2 border-emerald-500/60 rounded-2xl p-4.5 shadow-sm flex flex-col sm:flex-row items-center gap-4 animate-fade-in">
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow">
                  <CheckCheck className="w-7 h-7" />
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <span className="bg-emerald-700 text-white text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                      Hoja: INDUCCION VISUALIZACIONES
                    </span>
                    <span className="text-emerald-700 text-xs font-bold">100% Visualizado</span>
                  </div>
                  <h4 className="text-sm font-black text-emerald-950 uppercase mt-0.5">
                    Videos de Inducción General Completados
                  </h4>
                  <p className="text-xs text-emerald-800 leading-snug mt-0.5">
                    Se han completado los 3 módulos reglamentarios: Seguridad Industrial, Medio Ambiente y Solicitante PAEP. Su registro ha quedado asentado en la hoja oficial de visualizaciones. Ya puede rendir su evaluación final.
                  </p>
                </div>
                {!hasApprovedExam('general_induction') && !activeExam && (
                  <button
                    type="button"
                    onClick={handleOpenExam}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow shrink-0"
                  >
                    Rendir Examen
                  </button>
                )}
              </div>
            )}

            {/* NOTIFICACIÓN VISUALIZACIONES: AUTORIZANTE PAEP COMPLETADO (100%) */}
            {activeProgram === 'autorizante' && isAutorizanteVideosComplete() && (
              <div className="bg-sky-50 border-2 border-sky-500/60 rounded-2xl p-5 shadow-sm space-y-3.5 animate-fade-in">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow">
                    <Bot className="w-7 h-7" />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <span className="bg-sky-700 text-white text-[9px] font-bold font-mono px-2 py-0.5 rounded uppercase tracking-wider">
                        Hoja: AUTORIZANTE PAEP
                      </span>
                      <span className="text-sky-700 text-xs font-bold">7 Módulos al 100%</span>
                    </div>
                    <h4 className="text-sm font-black text-sky-950 uppercase mt-0.5">
                      Capacitación Autorizante PAEP Registrada
                    </h4>
                    <p className="text-xs text-sky-800 leading-snug mt-0.5">
                      Visualizaciones registradas en la hoja oficial de Excel. A continuación, interactúe con el <strong>Bot Consultor PAEP</strong> para absolver cualquier duda técnica sobre el Procedimiento <strong>SPT-GSS.SI.004 (Rev. 05)</strong> y la Normativa Boliviana antes de rendir el examen.
                    </p>
                  </div>
                </div>

                {/* View switcher buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-sky-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaepBot(true);
                      setActiveExam(null);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                      showPaepBot && !activeExam ? 'bg-sky-700 text-white shadow ring-2 ring-sky-400' : 'bg-white text-sky-900 border border-sky-300 hover:bg-sky-100'
                    }`}
                  >
                    <Bot className="w-4 h-4" /> Asistente Técnico Bot PAEP
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPaepBot(false)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 ${
                      !showPaepBot && !activeExam ? 'bg-slate-800 text-white shadow' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Play className="w-4 h-4" /> Ver Videos de Estudio
                  </button>

                  {!hasApprovedExam('autorizante_paep') && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPaepBot(false);
                        handleOpenExam();
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 sm:ml-auto ${
                        activeExam ? 'bg-emerald-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4" /> Rendir Examen Autorizante
                    </button>
                  )}
                </div>
              </div>
            )}

        {/* DISPLAY EXAM MODULE */}
        {activeExam && !showExamResults && (
          <div className="bg-white border-2 border-slate-900 rounded-2xl shadow-xl p-6 relative">
            <div className="absolute top-4 right-4 text-xs font-bold font-mono text-slate-500">
              Min: {activeExam.passingScore}%
            </div>
            
            <h3 className="text-md font-bold text-slate-900 uppercase pr-16 bg-slate-100 p-2.5 rounded-lg border border-slate-200 tracking-tight flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-slate-700" />
              {activeExam.title}
            </h3>

            {user.rol === 'general' && (
              <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 mt-3 font-semibold">
                ⚠️ IMPORTANTE: Este examen contiene respuestas con selección múltiple. Es obligatorio marcar TODOS los incisos correctos para que la respuesta sea considerada correcta. No se da puntaje parcial.
              </p>
            )}

            <form onSubmit={handleSubmitExam} className="mt-6 space-y-6">
              {activeExam.questions.map((q, qIdx) => {
                return (
                  <div key={q.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <p className="text-sm font-bold text-slate-900 leading-normal">
                      <span className="font-mono text-xs text-slate-500 mr-1 opacity-70">
                        {qIdx + 1}.
                      </span>
                      {q.text}
                    </p>

                    {/* Question option types rendering */}
                    {q.type === 'true-false' ? (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => handleTrueFalseChange(q.id, true)}
                          className={`py-3 px-4 rounded-xl font-bold text-sm tracking-wide border flex items-center justify-center transition-all ${
                            examAnswers[q.id] === true
                              ? 'bg-slate-900 border-slate-900 text-white shadow'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/50'
                          }`}
                        >
                          Verdadero (V)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTrueFalseChange(q.id, false)}
                          className={`py-3 px-4 rounded-xl font-bold text-sm tracking-wide border flex items-center justify-center transition-all ${
                            examAnswers[q.id] === false
                              ? 'bg-slate-900 border-slate-900 text-white shadow shadow-red-950/10'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/50'
                          }`}
                        >
                          Falso (F)
                        </button>
                      </div>
                    ) : (
                      // Multiple choice (possibly multiselect)
                      <div className="space-y-2 pt-1 font-sans">
                        {q.options?.map((option, oIdx) => {
                          const optionLetter = String.fromCharCode(97 + oIdx); // a, b, c, d
                          const isMultiselect = Array.isArray(q.correctAnswers) && (q.correctAnswers.length > 1 || user.rol === 'general');
                          
                          if (isMultiselect) {
                            const selectedValues = (examAnswers[q.id] as number[]) || [];
                            const isChecked = selectedValues.includes(oIdx);
                            
                            return (
                              <label
                                key={oIdx}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'bg-slate-100 border-slate-400 font-semibold' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => handleCheckboxChange(q.id, oIdx, e.target.checked)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                                />
                                <span className="text-xs text-slate-800 leading-relaxed">
                                  <strong className="font-mono text-slate-500 mr-1 uppercase">{optionLetter})</strong> {option}
                                </span>
                              </label>
                            );
                          } else {
                            // Single choice radio
                            const selectedValues = (examAnswers[q.id] as number[]) || [];
                            const isChecked = selectedValues.includes(oIdx);
                            
                            return (
                              <label
                                key={oIdx}
                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'bg-slate-100 border-slate-400 font-semibold' 
                                    : 'bg-white border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`q-${q.id}`}
                                  checked={isChecked}
                                  onChange={() => handleRadioChange(q.id, oIdx)}
                                  className="mt-1 h-4 w-4 rounded-full border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                                />
                                <span className="text-xs text-slate-800 leading-relaxed">
                                  <strong className="font-mono text-slate-500 mr-1 uppercase">{optionLetter})</strong> {option}
                                </span>
                              </label>
                            );
                          }
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="flex gap-4 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveExam(null)}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition shadow shadow-slate-950/30"
                >
                  Guardar y Enviar Evaluación
                </button>
              </div>
            </form>
          </div>
        )}

        {/* RESULTS FEEDBACK AFTER EXAM SUBMISSION */}
        {showExamResults && activeExam && (
          <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl p-6 space-y-6">
            {/* Score box header */}
            <div className={`p-6 rounded-2xl text-center border space-y-2 ${
              showExamResults.passed 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950' 
                : 'bg-red-50 border-red-200 text-red-950'
            }`}>
              {showExamResults.passed ? (
                <ShieldCheck className="w-12 h-12 text-emerald-600 mx-auto" />
              ) : (
                <XCircle className="w-12 h-12 text-red-650 mx-auto" />
              )}
              <h3 className="text-lg font-bold uppercase tracking-tight">
                {showExamResults.passed ? '¡Aprobado con Éxito!' : 'Prueba Reprobada'}
              </h3>
              <p className="text-3xl font-black font-mono">
                {showExamResults.score}%
              </p>
              <p className="text-xs font-medium max-w-md mx-auto">
                {showExamResults.passed 
                  ? 'Felicidades, usted ha aprobado la capacitación. Sus credenciales se han registrado inmediatamente en el sistema administrativo de Planta Viacha.' 
                  : 'Lo sentimos, no alcanzó la nota mínima aprobatoria exigida (' + activeExam.passingScore + '%). Su CI ha sido temporalmente restringido por 24 horas como medida reglamentaria.'}
              </p>
            </div>

            {/* Questions review breakdown */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-mono text-slate-500 uppercase tracking-wider">
                Revisión Detallada de Respuestas / Errores de la Evaluación
              </h4>

              {activeExam.questions.map((q, idx) => {
                const userAnswer = showExamResults.submittedAnswers[q.id];
                const correctAnswer = q.correctAnswers;
                
                // Track correctness
                let isQuestionCorrect = false;
                if (q.type === 'true-false') {
                  isQuestionCorrect = userAnswer === correctAnswer;
                } else {
                  const uArr = (userAnswer as number[]) || [];
                  const cArr = (correctAnswer as number[]) || [];
                  isQuestionCorrect = uArr.length === cArr.length && uArr.every((v, i) => v === cArr[i]);
                }

                return (
                  <div 
                    key={q.id}
                    className={`p-4 rounded-xl border leading-relaxed text-xs space-y-2 ${
                      isQuestionCorrect 
                        ? 'bg-emerald-55/20 border-emerald-150' 
                        : 'bg-red-55/20 border-red-150/75'
                    }`}
                  >
                    <p className="font-bold text-slate-800 text-[12px] flex items-center gap-1.5 leading-snug">
                      <span className="font-mono text-slate-400">{idx + 1}.</span>
                      {q.text}
                      {!isQuestionCorrect && (
                        <span className="bg-red-600 font-mono text-[9px] uppercase font-bold text-white px-1.5 py-0.2 rounded shrink-0">
                          CON CORRECCIÓN
                        </span>
                      )}
                    </p>

                    {/* Show what player wrote */}
                    <div className="pl-4 space-y-1 mt-2 border-l-2 border-slate-300">
                      <div>
                        <span className="text-slate-500 font-semibold uppercase block text-[10px]">Puntaje Obtenido:</span>
                        <span className={isQuestionCorrect ? 'text-emerald-700 font-bold' : 'text-red-700 font-bold'}>
                          {isQuestionCorrect ? '100/100 (Correcto)' : '0/100 (Incorrecto)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 font-semibold uppercase block text-[10px]">Su elección:</span>
                        <span className="font-medium text-slate-800">
                          {q.type === 'true-false' ? (
                            userAnswer ? 'Verdadero (V)' : 'Falso (F)'
                          ) : (
                            ((userAnswer as number[]) || []).map(o => String.fromCharCode(97 + o) + ") " + q.options?.[o]).join(';  ') || '[Vacío]'
                          )}
                        </span>
                      </div>

                      {/* Explicitly show correction if WRONG */}
                      {!isQuestionCorrect && (
                        <div className="pt-1.5 mt-1 border-t border-dashed border-red-200">
                          <span className="text-emerald-700 font-extrabold uppercase block text-[10px]">Clave de Respuesta Correcta:</span>
                          <span className="font-bold text-slate-905">
                            {q.type === 'true-false' ? (
                              correctAnswer ? 'Verdadero (V)' : 'Falso (F)'
                            ) : (
                              ((correctAnswer as number[]) || []).map(o => String.fromCharCode(97 + o) + ") " + q.options?.[o]).join(' ; ')
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Primary Action Button after checking results */}
            <button
              onClick={() => {
                setShowExamResults(null);
                setActiveExam(null);
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition"
            >
              Terminar y Cerrar Revisión
            </button>
          </div>
        )}

        {/* PAEP TECHNICAL ASSISTANT BOT VIEW */}
        {showPaepBot && !activeExam && !showExamResults && (
          <div className="animate-fade-in">
            <PaepBot
              userCi={user.ci}
              userName={`${user.nombres} ${user.apellidoPaterno}`}
              onProceedToExam={() => {
                setShowPaepBot(false);
                handleOpenExam();
              }}
            />
          </div>
        )}

        {/* DEFAULT VIDEO PLAYER WRAPPER */}
        {selectedVideo && !activeExam && !showExamResults && !showPaepBot && (
          <YoutubePlayer
            key={selectedVideo.id}
            video={selectedVideo}
            userRole={user.rol}
            currentProgressPercent={user.videoProgress[selectedVideo.id] || 0}
            onProgressUpdate={handleVideoProgressUpdate}
            onComplete={handleVideoComplete}
          />
        )}
          </>
        )}
      </div>
    </div>

    {/* Universal Progress Chart at the bottom of the page */}
    <div className="w-full">
      {renderUniversalProgressChart()}
    </div>
  </div>
  );
}
