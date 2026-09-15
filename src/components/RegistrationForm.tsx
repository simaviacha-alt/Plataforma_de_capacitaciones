import React, { useState, useEffect } from 'react';
import { UserProgress } from '../types';
import { LogIn, UserPlus, CheckCircle2, ShieldAlert, Clock, Lock, X } from 'lucide-react';
// @ts-ignore
import logoViacha from '../assets/images/logo_viacha_1784075276927.jpg';

interface RegistrationFormProps {
  onRegister: (user: UserProgress) => void;
  onAdminOpen: () => void;
  existingUsers: UserProgress[];
}

export default function RegistrationForm({
  onRegister,
  onAdminOpen,
  existingUsers
}: RegistrationFormProps) {
  const [ci, setCi] = useState('');
  const [nombres, setNombres] = useState('');
  const [paterno, setPaterno] = useState('');
  const [materno, setMaterno] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [planta, setPlanta] = useState('PLANTA VIACHA');

  // Dynamic list of unique company names from registered workers, with SOBOCE S.A. and MEDMIN as baseline
  const uniqueCompanies = Array.from(
    new Set([
      'SOBOCE S.A.',
      'MEDMIN',
      ...existingUsers.map(u => u.empresa?.trim().toUpperCase()).filter(Boolean)
    ])
  ).sort();
  
  // Dynamic role and contractor type states
  const [rol, setRol] = useState<'visita' | 'general' | 'conductor' | 'autorizante' | 'contratista' | 'soboce'>('general');
  const [contratistaTipo, setContratistaTipo] = useState<'I' | 'II' | 'III' | null>(null);

  // Administrative Manual selection lock variables
  const [isManualUnlocked, setIsManualUnlocked] = useState(false);
  const [manualPassword, setManualPassword] = useState('');
  const [manualPasswordError, setManualPasswordError] = useState(false);

  const handleUnlockManual = () => {
    if (manualPassword === 'sima.2026@') {
      setIsManualUnlocked(true);
      setManualPasswordError(false);
    } else {
      setManualPasswordError(true);
    }
  };

  // Assistant & Chat States
  const [activeTab, setActiveTab] = useState<'asistente' | 'manual'>('asistente');
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [userInput, setUserInput] = useState('');
  const [classificationStep, setClassificationStep] = useState<'idle' | 'awaiting_initial' | 'standard_q1' | 'standard_q2' | 'admin_bypass' | 'classified'>('idle');
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null);
  const [selectedRisk, setSelectedRisk] = useState<number | null>(null);
  
  // Status for found user
  const [foundUser, setFoundUser] = useState<UserProgress | null>(null);
  const [isReclassifying, setIsReclassifying] = useState(false);
  const [countdownString, setCountdownString] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [showAdminPasscode, setShowAdminPasscode] = useState(false);
  const [adminPasscode, setAdminPasscode] = useState('');
  const [adminPasscodeError, setAdminPasscodeError] = useState('');

  const handleVerifyAdmin = () => {
    if (adminPasscode === '20262027') {
      setShowAdminPasscode(false);
      onAdminOpen();
    } else {
      setAdminPasscodeError('Código de seguridad incorrecto.');
    }
  };

  const handleStartReclassification = () => {
    if (foundUser) {
      setEmpresa(foundUser.empresa);
      setPlanta(foundUser.planta);
      setRol(foundUser.rol);
      setContratistaTipo(foundUser.contratistaTipo);
      setIsReclassifying(true);
      startChat();
    }
  };

  // When CI updates, check if a user already exists with that CI
  useEffect(() => {
    const cleanCi = ci.trim().toUpperCase();
    if (!cleanCi) {
      setFoundUser(null);
      setIsLockedOut(false);
      setCountdownString(null);
      setIsReclassifying(false);
      return;
    }

    const matched = existingUsers.find(u => u.ci.toUpperCase() === cleanCi);
    if (matched) {
      setFoundUser(matched);
      setIsReclassifying(false); // Reset on match so user explicitly requests reclassification
      
      // Check lockout status
      if (matched.lockoutUntil) {
        const lockoutTime = new Date(matched.lockoutUntil).getTime();
        const now = new Date().getTime();
        if (lockoutTime > now) {
          setIsLockedOut(true);
          const diffMs = lockoutTime - now;
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          setCountdownString(`${diffHours}h ${diffMins}m`);
        } else {
          setIsLockedOut(false);
          setCountdownString(null);
        }
      } else {
        setIsLockedOut(false);
        setCountdownString(null);
      }
    } else {
      setFoundUser(null);
      setIsLockedOut(false);
      setCountdownString(null);
      setIsReclassifying(false);
    }
  }, [ci, existingUsers]);

  const handleUppercaseChange = (setter: React.Dispatch<React.SetStateAction<string>>) => 
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value.toUpperCase());
    };

  // Initialize and Reset Chat
  const startChat = () => {
    setChatMessages([
      {
        id: 'welcome',
        sender: 'assistant',
        text: '¡Hola! 👷‍♀️ Soy tu Asistente Inteligente de Seguridad y Salud Ocupacional (SST) de SOBOCE.\n\nMi objetivo es guiarte y clasificar automáticamente tu perfil de contratista para habilitar tus videos de inducción y exámenes obligatorios.\n\nPor favor, escribe un mensaje o selecciona tu tipo de ingreso:',
        timestamp: new Date(),
        options: [
          { label: 'Soy una Visita 👥', value: 'visita' },
          { label: 'Soy un Conductor / Chofer Externo 🚚', value: 'conductor' },
          { label: 'Soy Contratista 🏗️', value: 'contratista' },
          { label: 'Soy Personal SOBOCE 👷‍♂️', value: 'soboce' }
        ]
      }
    ]);
    setClassificationStep('awaiting_initial');
    setContratistaTipo(null);
    setSelectedDuration(null);
    setSelectedRisk(null);
  };

  // Auto-initiate chat when foundUser is falsy
  useEffect(() => {
    if (!foundUser) {
      startChat();
    }
  }, [foundUser]);

  const handleSendMessage = (textToSend: string, valueToSend?: string) => {
    if (!textToSend.trim()) return;

    // Add user message to chat
    const userMsgId = 'user_' + Date.now();
    const newUserMsg = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, newUserMsg]);
    setUserInput('');

    // Simulate natural response
    setTimeout(() => {
      const cleanText = textToSend.trim();
      const lowerText = cleanText.toLowerCase();
      const cleanValue = valueToSend ? valueToSend.trim() : '';

      // Check for Admin Force Bypass Key
      if (cleanText === 'ADMIN-FORCE') {
        setClassificationStep('admin_bypass');
        setChatMessages(prev => [...prev, {
          id: 'admin_welcome_' + Date.now(),
          sender: 'assistant',
          text: '👷‍♂️ ¡Saludos, Administrador! Bypass de seguridad activado.\n\nPor favor, asigne directamente la configuración de ruta y rol para este usuario:',
          timestamp: new Date(),
          options: [
            { label: 'Contratista Tipo I 🥇', value: 'admin_tipo_i' },
            { label: 'Contratista Tipo II 🥈', value: 'admin_tipo_ii' },
            { label: 'Contratista Tipo III 🥉', value: 'admin_tipo_iii' },
            { label: 'Ruta de Visita 👥', value: 'admin_visita' },
            { label: 'Conductor Externo 🚚', value: 'admin_conductor' }
          ]
        }]);
        return;
      }

      // If in admin bypass step:
      if (classificationStep === 'admin_bypass') {
        let selectedRole: typeof rol = 'general';
        let calculatedTipo: typeof contratistaTipo = null;
        let descText = '';

        if (cleanValue === 'admin_tipo_i' || lowerText === 'admin_tipo_i' || lowerText.includes('tipo i')) {
          selectedRole = 'contratista';
          calculatedTipo = 'I';
          descText = '**Contratista Tipo I** (Alta criticidad / mediano y largo plazo). Requiere Inducción SIMA General + Solicitante PAEP + Capacitación de Contratistas Rutinarios (9 Capítulos).';
        } else if (cleanValue === 'admin_tipo_ii' || lowerText === 'admin_tipo_ii' || lowerText.includes('tipo ii')) {
          selectedRole = 'contratista';
          calculatedTipo = 'II';
          descText = '**Contratista Tipo II** (Criticidad intermedia). Requiere Inducción SIMA General + Solicitante PAEP + Capacitación de Contratistas Rutinarios (9 Capítulos).';
        } else if (cleanValue === 'admin_tipo_iii' || lowerText === 'admin_tipo_iii' || lowerText.includes('tipo iii')) {
          selectedRole = 'contratista';
          calculatedTipo = 'III';
          descText = '**Contratista Tipo III** (Baja criticidad / corto plazo). Requiere Inducción SIMA General + Solicitante PAEP.';
        } else if (cleanValue === 'admin_visita' || lowerText === 'admin_visita' || lowerText.includes('visita')) {
          selectedRole = 'visita';
          calculatedTipo = null;
          descText = '**Ruta de Visitas**. Requiere únicamente ver el Video de Inducción para Visitas (sin examen).';
        } else if (cleanValue === 'admin_conductor' || lowerText === 'admin_conductor' || lowerText.includes('conductor') || lowerText.includes('chofer')) {
          selectedRole = 'conductor';
          calculatedTipo = null;
          descText = '**Conductor Externo**. Requiere ver el Video de Inducción para Conductores y aprobar el Examen respectivo.';
        } else {
          setChatMessages(prev => [...prev, {
            id: 'admin_error_' + Date.now(),
            sender: 'assistant',
            text: 'Comando no reconocido. Por favor, seleccione una de las opciones administrativas válidas:',
            timestamp: new Date(),
            options: [
              { label: 'Contratista Tipo I 🥇', value: 'admin_tipo_i' },
              { label: 'Contratista Tipo II 🥈', value: 'admin_tipo_ii' },
              { label: 'Contratista Tipo III 🥉', value: 'admin_tipo_iii' },
              { label: 'Ruta de Visita 👥', value: 'admin_visita' },
              { label: 'Conductor Externo 🚚', value: 'admin_conductor' }
            ]
          }]);
          return;
        }

        setRol(selectedRole);
        setContratistaTipo(calculatedTipo);
        setClassificationStep('classified');
        setChatMessages(prev => [...prev, {
          id: 'admin_success_' + Date.now(),
          sender: 'assistant',
          text: `🚨 **Bypass Exitoso:** Se ha asignado manualmente la ruta de: ${descText}\n\nPuede proceder con el registro en la parte inferior.`,
          timestamp: new Date()
        }]);
        return;
      }

      // Check Fast Routes / Rules
      if (cleanValue === 'visita' || lowerText.includes('visita') || lowerText === 'visita') {
        setRol('visita');
        setContratistaTipo(null);
        setClassificationStep('classified');
        setChatMessages(prev => [...prev, {
          id: 'visita_success_' + Date.now(),
          sender: 'assistant',
          text: 'Se te ha asignado el flujo de Visita. Por favor, procede a ver tu video de inducción de visitas correspondiente.',
          timestamp: new Date()
        }]);
        return;
      }

      if (cleanValue === 'conductor' || lowerText.includes('conductor') || lowerText.includes('chofer') || lowerText === 'conductor') {
        setRol('conductor');
        setContratistaTipo(null);
        setClassificationStep('classified');
        setChatMessages(prev => [...prev, {
          id: 'conductor_success_' + Date.now(),
          sender: 'assistant',
          text: 'Se te ha asignado el flujo de Conductor Externo. Deberás ver el video de inducción para conductores y posteriormente aprobar el examen respectivo.',
          timestamp: new Date()
        }]);
        return;
      }

      if (cleanValue === 'soboce' || lowerText.includes('soboce') || lowerText.includes('personal propio') || lowerText.includes('personal sob') || lowerText === 'soboce') {
        setRol('soboce');
        setContratistaTipo('II');
        setEmpresa('SOBOCE S.A.');
        setClassificationStep('classified');
        setChatMessages(prev => [...prev, {
          id: 'soboce_success_' + Date.now(),
          sender: 'assistant',
          text: 'Se te ha asignado el flujo de **Personal SOBOCE (Tipo II)**.\n\nTendrás habilitada la Inducción General para Trabajos en Planta, Solicitante PAEP, Capacitaciones Programadas Anuales y la opción de Autorizante PAEP (con contraseña).',
          timestamp: new Date()
        }]);
        return;
      }

      // Proactive Keyword Detection
      let hasHighRiskKeyword = lowerText.includes('altura') || lowerText.includes('construccion') || lowerText.includes('construcción') || lowerText.includes('electricidad') || lowerText.includes('alto') || lowerText.includes('caliente') || lowerText.includes('izado') || lowerText.includes('izaje') || lowerText.includes('confinado') || lowerText.includes('andamio') || lowerText.includes('demolicion') || lowerText.includes('demolición') || lowerText.includes('excavacion') || lowerText.includes('excavación') || lowerText.includes('obras civiles') || lowerText.includes('industrial');
      let hasMediumRiskKeyword = lowerText.includes('mecanico') || lowerText.includes('mecánico') || lowerText.includes('obras menores') || lowerText.includes('mantenimiento') || lowerText.includes('soldadura') || lowerText.includes('pintura');
      let hasLowRiskKeyword = lowerText.includes('limpieza') || lowerText.includes('oficina') || lowerText.includes('transporte') || lowerText.includes('bajo') || lowerText.includes('aseo') || lowerText.includes('jardineria') || lowerText.includes('jardinería');

      let hasCortoPlazoKeyword = lowerText.includes('corto') || lowerText.includes('menos de') || lowerText.includes('semana') || lowerText.includes('semanas') || lowerText.includes('dias') || lowerText.includes('días');
      let hasMedianoPlazoKeyword = lowerText.includes('mediano') || lowerText.includes('entre') || (lowerText.includes('6 meses') && !lowerText.includes('más') && !lowerText.includes('mas'));
      let hasLargoPlazoKeyword = lowerText.includes('largo') || lowerText.includes('mas de') || lowerText.includes('más de') || lowerText.includes('permanente') || lowerText.includes('año') || lowerText.includes('ano');

      // Update local and state tracking
      let durationVal: number | null = selectedDuration;
      if (cleanValue === '1') durationVal = 1;
      else if (cleanValue === '2') durationVal = 2;
      else if (cleanValue === '3') durationVal = 3;
      else if (hasCortoPlazoKeyword) durationVal = 1;
      else if (hasMedianoPlazoKeyword) durationVal = 2;
      else if (hasLargoPlazoKeyword) durationVal = 3;

      let riskVal: number | null = selectedRisk;
      if (cleanValue === 'risk_1') riskVal = 1;
      else if (cleanValue === 'risk_2') riskVal = 2;
      else if (cleanValue === 'risk_3') riskVal = 3;
      else if (hasHighRiskKeyword) riskVal = 3;
      else if (hasMediumRiskKeyword) riskVal = 2;
      else if (hasLowRiskKeyword) riskVal = 1;

      // Update state
      if (durationVal !== null) setSelectedDuration(durationVal);
      if (riskVal !== null) setSelectedRisk(riskVal);

      // Helper function to calculate and finalize classification
      const finalizeClassification = (finalD: number, finalR: number) => {
        // Decision Matrix:
        // - Risk Alto (3): always TIPO I
        // - Risk Medio (2): Corto (1) -> Tipo III | Mediano/Largo (2/3) -> Tipo II
        // - Risk Bajo (1): Corto/Mediano (1/2) -> Tipo III | Largo (3) -> Tipo II
        let calculatedTipo: 'I' | 'II' | 'III' = 'III';
        if (finalR === 3) {
          calculatedTipo = 'I';
        } else if (finalR === 2) {
          calculatedTipo = finalD === 1 ? 'III' : 'II';
        } else {
          calculatedTipo = finalD === 3 ? 'II' : 'III';
        }

        const finalRole = 'contratista';
        setRol(finalRole);
        setContratistaTipo(calculatedTipo);
        setClassificationStep('classified');

        const durationLabels = ['Menos de 3 semanas (Corto Plazo)', 'Entre 3 semanas y 6 meses (Mediano Plazo)', 'Más de 6 meses (Largo Plazo)'];
        const riskLabels = ['Limpieza / Oficinas / Transporte (Riesgo Bajo)', 'Mantenimiento Mecánico / Obras menores (Riesgo Medio)', 'Construcción / Trabajos en altura / Electricidad (Riesgo Alto)'];

        setChatMessages(prev => [...prev, {
          id: 'final_resp_' + Date.now(),
          sender: 'assistant',
          text: `Análisis completado para:\n- **Duración:** ${durationLabels[finalD - 1]}\n- **Actividad/Riesgo:** ${riskLabels[finalR - 1]}\n\n¡Felicidades! Te hemos clasificado automáticamente como **CONTRATISTA TIPO ${calculatedTipo}**.\n\n` +
                (calculatedTipo === 'I' || calculatedTipo === 'II'
                  ? 'Tienes habilitada la **Inducción SIMA General (2 Capítulos + Examen con nota mínima de 90%)**, el acceso a **Solicitante PAEP (1 Capítulo)**, la **Capacitación de Contratistas Rutinarios (9 Capítulos)** y la opción de **Autorizante PAEP (7 Módulos con clave de acceso autorizada)**.' 
                  : 'Tienes habilitada la **Inducción SIMA General (2 Capítulos + Examen con nota mínima de 90%)**, el acceso a **Solicitante PAEP (1 Capítulo)** y la opción de **Autorizante PAEP (7 Módulos con clave de acceso autorizada)**.'),
          timestamp: new Date()
        }]);
      };

      // Check state combinations
      if (durationVal !== null && riskVal !== null) {
        finalizeClassification(durationVal, riskVal);
        return;
      }

      // If we are at awaiting_initial step and chose or typed "contratista"
      if (classificationStep === 'awaiting_initial' || classificationStep === 'idle') {
        if (durationVal !== null) {
          // We have duration, but need risk
          setClassificationStep('standard_q2');
          setChatMessages(prev => [...prev, {
            id: 'q2_' + Date.now(),
            sender: 'assistant',
            text: `Registrado: **Duración - ${['Corto Plazo', 'Mediano Plazo', 'Largo Plazo'][durationVal! - 1]}**.\n\n**Pregunta 2 (Actividad):** Selecciona el nivel de riesgo o actividad principal que realizarás:`,
            timestamp: new Date(),
            options: [
              { label: '1️⃣ Limpieza / Oficinas / Transporte (Riesgo Bajo)', value: 'risk_1' },
              { label: '2️⃣ Mantenimiento Mecánico / Obras menores (Riesgo Medio)', value: 'risk_2' },
              { label: '3️⃣ Construcción / Trabajos en altura / Electricidad (Riesgo Alto)', value: 'risk_3' }
            ]
          }]);
        } else if (riskVal !== null) {
          // We have risk, but need duration
          setClassificationStep('standard_q1');
          setChatMessages(prev => [...prev, {
            id: 'q1_' + Date.now(),
            sender: 'assistant',
            text: `Registrado: **Riesgo - ${['Riesgo Bajo', 'Riesgo Medio', 'Riesgo Alto'][riskVal! - 1]}**.\n\n**Pregunta 1 (Duración):** ¿Cuánto tiempo estiman que durará el servicio o trabajo en nuestras instalaciones?\n\nSelecciona una opción:`,
            timestamp: new Date(),
            options: [
              { label: '1️⃣ Menos de 3 semanas (Corto Plazo)', value: '1' },
              { label: '2️⃣ Entre 3 semanas y 6 meses (Mediano Plazo)', value: '2' },
              { label: '3️⃣ Más de 6 meses (Largo Plazo)', value: '3' }
            ]
          }]);
        } else {
          // We have neither, start with duration
          setClassificationStep('standard_q1');
          setChatMessages(prev => [...prev, {
            id: 'q1_init_' + Date.now(),
            sender: 'assistant',
            text: 'Para clasificar tu tipo de contratista, por favor responde:\n\n**Pregunta 1 (Duración):** ¿Cuánto tiempo estiman que durará el servicio o trabajo en nuestras instalaciones?\n\nSelecciona una opción:',
            timestamp: new Date(),
            options: [
              { label: '1️⃣ Menos de 3 semanas (Corto Plazo)', value: '1' },
              { label: '2️⃣ Entre 3 semanas y 6 meses (Mediano Plazo)', value: '2' },
              { label: '3️⃣ Más de 6 meses (Largo Plazo)', value: '3' }
            ]
          }]);
        }
        return;
      }

      // If we are waiting for duration
      if (classificationStep === 'standard_q1') {
        if (durationVal !== null) {
          if (riskVal !== null) {
            finalizeClassification(durationVal, riskVal);
          } else {
            setClassificationStep('standard_q2');
            setChatMessages(prev => [...prev, {
              id: 'q2_after_q1_' + Date.now(),
              sender: 'assistant',
              text: 'Ahora responde la segunda pregunta:\n\n**Pregunta 2 (Actividad):** Selecciona el nivel de riesgo o actividad principal que realizarás:',
              timestamp: new Date(),
              options: [
                { label: '1️⃣ Limpieza / Oficinas / Transporte (Riesgo Bajo)', value: 'risk_1' },
                { label: '2️⃣ Mantenimiento Mecánico / Obras menores (Riesgo Medio)', value: 'risk_2' },
                { label: '3️⃣ Construcción / Trabajos en altura / Electricidad (Riesgo Alto)', value: 'risk_3' }
              ]
            }]);
          }
        } else {
          // Retake duration
          setChatMessages(prev => [...prev, {
            id: 'q1_retry_' + Date.now(),
            sender: 'assistant',
            text: 'Por favor, selecciona una de las opciones válidas para la duración:',
            timestamp: new Date(),
            options: [
              { label: '1️⃣ Menos de 3 semanas (Corto Plazo)', value: '1' },
              { label: '2️⃣ Entre 3 semanas y 6 meses (Mediano Plazo)', value: '2' },
              { label: '3️⃣ Más de 6 meses (Largo Plazo)', value: '3' }
            ]
          }]);
        }
        return;
      }

      // If we are waiting for risk
      if (classificationStep === 'standard_q2') {
        if (riskVal !== null) {
          if (durationVal !== null) {
            finalizeClassification(durationVal, riskVal);
          } else {
            setClassificationStep('standard_q1');
            setChatMessages(prev => [...prev, {
              id: 'q1_after_q2_' + Date.now(),
              sender: 'assistant',
              text: 'Ahora responde la primera pregunta:\n\n**Pregunta 1 (Duración):** ¿Cuánto tiempo estiman que durará el servicio o trabajo en nuestras instalaciones?',
              timestamp: new Date(),
              options: [
                { label: '1️⃣ Menos de 3 semanas (Corto Plazo)', value: '1' },
                { label: '2️⃣ Entre 3 semanas y 6 meses (Mediano Plazo)', value: '2' },
                { label: '3️⃣ Más de 6 meses (Largo Plazo)', value: '3' }
              ]
            }]);
          }
        } else {
          // Retake risk
          setChatMessages(prev => [...prev, {
            id: 'q2_retry_' + Date.now(),
            sender: 'assistant',
            text: 'Por favor, selecciona una de las opciones válidas para el riesgo/actividad:',
            timestamp: new Date(),
            options: [
              { label: '1️⃣ Limpieza / Oficinas / Transporte (Riesgo Bajo)', value: 'risk_1' },
              { label: '2️⃣ Mantenimiento Mecánico / Obras menores (Riesgo Medio)', value: 'risk_2' },
              { label: '3️⃣ Construcción / Trabajos en altura / Electricidad (Riesgo Alto)', value: 'risk_3' }
            ]
          }]);
        }
        return;
      }

    }, 600);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!ci.trim()) return;

    // Direct resume for existing users (only when not actively reclassifying)
    if (foundUser && !isReclassifying) {
      if (isLockedOut) {
        alert(`Su CI está temporalmente restringido por examen reprobado. Intente de nuevo en ${countdownString}.`);
        return;
      }
      onRegister(foundUser);
      return;
    }

    // Validation for reclassifying an existing worker
    if (isReclassifying) {
      if (!empresa.trim()) {
        alert("Por favor rellene todos los datos obligatorios marcados con (*).");
        return;
      }

      const updatedStudent: UserProgress = {
        ci: foundUser!.ci.trim().toUpperCase(),
        nombres: foundUser!.nombres.trim().toUpperCase(),
        apellidoPaterno: foundUser!.apellidoPaterno.trim().toUpperCase(),
        apellidoMaterno: foundUser!.apellidoMaterno.trim().toUpperCase(),
        empresa: rol === 'soboce' ? 'SOBOCE S.A.' : empresa.trim().toUpperCase(),
        planta: planta,
        rol: rol,
        contratistaTipo: contratistaTipo,
        videoProgress: {}, // Start fresh for new role
        examAttempts: {},  // Start fresh for new role
        lockoutUntil: null
      };

      onRegister(updatedStudent);
      setIsReclassifying(false);
      return;
    }

    // Validation for new registration
    if (!nombres.trim() || !paterno.trim() || !empresa.trim()) {
      alert("Por favor rellene todos los datos obligatorios marcados con (*).");
      return;
    }

    // Create new student
    const newStudent: UserProgress = {
      ci: ci.trim().toUpperCase(),
      nombres: nombres.trim().toUpperCase(),
      apellidoPaterno: paterno.trim().toUpperCase(),
      apellidoMaterno: materno.trim().toUpperCase(),
      empresa: rol === 'soboce' ? 'SOBOCE S.A.' : empresa.trim().toUpperCase(),
      planta: planta,
      rol: rol,
      contratistaTipo: contratistaTipo,
      videoProgress: {},
      examAttempts: {},
      lockoutUntil: null
    };

    onRegister(newStudent);
  };

  // Skip block for testing
  const handleBypassLockout = () => {
    if (foundUser) {
      const updatedUser = { ...foundUser, lockoutUntil: null };
      setIsLockedOut(false);
      setCountdownString(null);
      onRegister(updatedUser);
    }
  };

  return (
    <>
      <div className="relative z-10 max-w-md w-full mx-auto bg-white/95 backdrop-blur-sm rounded-2xl border-t-4 border-t-emerald-800 border border-slate-200/80 shadow-2xl overflow-hidden p-6 md:p-8">
        {/* Brand Header */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center pb-6 border-b border-slate-100 min-h-[140px]">
          <div className="relative z-10">
            <h2 className="text-lg md:text-xl font-extrabold font-display text-slate-900 tracking-tight uppercase leading-snug">
              PLATAFORMA DE INDUCCIÓN Y CAPACITACIÓN ESPECIALIZADA
            </h2>
            <p className="text-[11px] text-emerald-800 bg-white/60 px-2 py-0.5 rounded mt-2 font-bold font-sans select-none tracking-widest uppercase">
              SOBOCE S.A. • PLANTA VIACHA
            </p>
          </div>
        </div>

      <form onSubmit={handleSubmit} className="relative z-10 space-y-4 mt-6">
        {/* CI Search / Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 font-mono">
            Cédula de Identidad (CI) *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              placeholder="Ej: 8374829 LP"
              value={ci}
              onChange={(e) => setCi(e.target.value.toUpperCase())}
              className="w-full px-4 py-2.5 bg-slate-50/60 border border-slate-205 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 font-mono text-sm placeholder:text-slate-400 uppercase tracking-wide transition-all"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">
            * Se usará como llave primaria de su progreso académico.
          </p>
        </div>

        {/* Existing Session Feedback */}
        {foundUser && (
          <div className="space-y-3">
            {!isReclassifying ? (
              <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 uppercase">
                      REGISTRO ENCONTRADO
                    </p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {foundUser.nombres} {foundUser.apellidoPaterno} {foundUser.apellidoMaterno}
                    </p>
                    <div className="text-[11px] text-slate-600 space-y-0.5 mt-1 font-medium">
                      <p>Empresa: {foundUser.empresa}</p>
                      <p>Planta actual: {foundUser.planta}</p>
                      <p className="capitalize">
                        Tipo capacitación: {
                          foundUser.rol === 'visita' ? 'SIMA para Visitas' :
                          foundUser.rol === 'general' ? `SIMA General ${foundUser.contratistaTipo ? `(Tipo ${foundUser.contratistaTipo})` : ''}` :
                          foundUser.rol === 'conductor' ? 'Conductores' :
                          foundUser.rol === 'contratista' ? `Contratista Rutinario ${foundUser.contratistaTipo ? `(Tipo ${foundUser.contratistaTipo})` : ''}` :
                          foundUser.rol === 'soboce' ? 'Personal SOBOCE (Tipo II)' :
                          foundingRoleText(foundUser.rol)
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {isLockedOut ? (
                  <div className="bg-red-50 border border-red-100 p-3 rounded-lg space-y-2 mt-2">
                    <div className="flex gap-2 text-red-700 text-xs">
                      <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">CI BLOQUEADO TEMPORALMENTE</span>
                        Usted reprobó la prueba de inducción. Debe esperar 24 horas para reintentar.
                        <span className="block font-semibold mt-1 font-mono text-[10px]">Restante: {countdownString}</span>
                      </div>
                    </div>
                    
                    {/* Admin bypass override */}
                    <button
                      type="button"
                      onClick={handleBypassLockout}
                      className="w-full text-[10px] uppercase font-mono tracking-wider font-bold py-1 bg-red-600 hover:bg-red-700 text-white rounded text-center transition"
                    >
                      [Bypass Docente] Ignorar Bloqueo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md mt-2 border-b-2 border-emerald-500"
                    >
                      <LogIn className="w-4 h-4" /> REANUDAR CAPACITACIÓN COMPLETA
                    </button>

                    {/* Reclassification warning instructions & button */}
                    <div className="border-t border-slate-200/60 pt-3 mt-3 space-y-2">
                      <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-lg text-slate-700 space-y-1.5 leading-normal">
                        <p className="text-[10px] font-bold uppercase text-slate-800 tracking-wide flex items-center gap-1">
                          🔄 ¿Su rol o funciones en planta han cambiado?
                        </p>
                        <p className="text-[9.5px] text-slate-600 leading-normal">
                          Si usted ingresó anteriormente como <strong>Visita</strong> y hoy ingresa como <strong>Trabajador / Contratista</strong> o <strong>Conductor</strong>, debe actualizar su perfil obligatoriamente.
                        </p>
                        <p className="text-[9.5px] text-slate-600 leading-normal">
                          <em>Nota:</em> Si mantiene sus mismas funciones, <strong>NO</strong> es necesaria la reclasificación; simplemente pulse el botón verde de arriba.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleStartReclassification}
                        className="w-full bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 py-2.5 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-sm"
                      >
                        Reclasificación Necesaria (Modificar Rol) 🔄
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 space-y-2.5">
                <p className="text-xs font-bold text-amber-900 uppercase flex items-center gap-1.5">
                  🔄 RECLASIFICACIÓN DE TRABAJADOR ACTIVA
                </p>
                <p className="text-[10.5px] text-slate-700 leading-relaxed">
                  Modificando el rol del usuario: <strong>{foundUser.nombres} {foundUser.apellidoPaterno}</strong> (CI: {foundUser.ci}).
                </p>
                <p className="text-[10px] text-slate-500 leading-normal bg-white/60 p-2 rounded border border-amber-150">
                  ⚠️ Al confirmar la reclasificación, <strong>se borrará todo su progreso anterior</strong> de videos y exámenes para permitirle completar el nuevo programa asignado.
                </p>
                <button
                  type="button"
                  onClick={() => setIsReclassifying(false)}
                  className="text-xs font-bold text-red-650 text-red-600 uppercase tracking-wider font-mono hover:underline flex items-center gap-1"
                >
                  ✕ Cancelar Reclasificación
                </button>
              </div>
            )}
          </div>
        )}

        {/* New User Input Form Fields OR Reclassifying Fields */}
        {(!foundUser || isReclassifying) && (
          <div className="space-y-4 animate-fade-in">
            {/* Name Fields: only shown when registering a brand-new user */}
            {!foundUser && (
              <>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nombres completos"
                    value={nombres}
                    onChange={handleUppercaseChange(setNombres)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-slate-900 uppercase tracking-wide font-medium transition"
                  />
                </div>

                {/* Apellido Paterno */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                      Paterno *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ap. Paterno"
                      value={paterno}
                      onChange={handleUppercaseChange(setPaterno)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-slate-900 uppercase tracking-wide font-medium transition"
                    />
                  </div>
                  {/* Apellido Materno */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                      Materno
                    </label>
                    <input
                      type="text"
                      placeholder="Ap. Materno"
                      value={materno}
                      onChange={handleUppercaseChange(setMaterno)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-slate-900 uppercase tracking-wide font-medium transition"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Empresa */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                Empresa Contratista / Personal SOBOCE *
              </label>
              <input
                type="text"
                required
                list="companies-list"
                placeholder="Nombre de la empresa (Ej: SOBOCE S.A. o MEDMIN)"
                value={empresa}
                onChange={handleUppercaseChange(setEmpresa)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-slate-900 uppercase tracking-wide font-medium transition"
              />
              <datalist id="companies-list">
                {uniqueCompanies.map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            {/* Planta dropdown */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1 font-mono">
                Planta SOBOCE
              </label>
              <select
                value={planta}
                onChange={(e) => setPlanta(e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-slate-900 font-medium transition"
              >
                <option value="PLANTA VIACHA">PLANTA VIACHA</option>
                <option value="OFICINA CENTRAL - LA PAZ">OFICINA CENTRAL - LA PAZ</option>
                <option value="PLANTA WARNES">PLANTA WARNES</option>
                <option value="PLANTA EMISA">PLANTA EMISA</option>
                <option value="PLANTA EL PUENTE">PLANTA EL PUENTE</option>
                <option value="PLANTA VILIROCO">PLANTA VILIROCO</option>
              </select>
            </div>

            {/* RUTA DE CAPACITACIÓN Y CLASIFICACIÓN */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 font-mono">
                Ruta de Capacitación y Rol *
              </label>
              
              {/* Tabs Switcher */}
              <div className="flex border border-slate-200 mb-4 bg-slate-50 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('asistente')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    activeTab === 'asistente'
                      ? 'bg-white text-emerald-800 shadow-sm border border-slate-100'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  💬 Clasificar con Asistente SST
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                    activeTab === 'manual'
                      ? 'bg-white text-emerald-800 shadow-sm border border-slate-100'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  📋 Selección Directa / Manual {isManualUnlocked ? '✓' : '🔒'}
                </button>
              </div>

              {/* Asistente SST Tab View */}
              {activeTab === 'asistente' && (
                <div className="space-y-3">
                  <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-3 flex flex-col max-h-[300px] overflow-y-auto">
                    {chatMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === 'user' ? 'self-end items-end' : 'self-start items-start'
                        }`}
                      >
                        <span className="text-[9px] text-slate-400 font-mono mb-0.5">
                          {msg.sender === 'user' ? 'Tú' : 'Asistente SST'}
                        </span>
                        <div
                          className={`px-3 py-2 rounded-xl text-xs leading-relaxed whitespace-pre-wrap ${
                            msg.sender === 'user'
                              ? 'bg-slate-800 text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                        
                        {/* Render Quick Options */}
                        {msg.options && msg.options.length > 0 && classificationStep !== 'classified' && (
                          <div className="flex flex-wrap gap-1.5 mt-2 justify-start">
                            {msg.options.map((opt: any) => {
                              let colorClasses = "bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-emerald-800 hover:border-emerald-600";
                              if (opt.value === 'visita') {
                                colorClasses = "bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100 hover:border-sky-400 hover:text-sky-900";
                              } else if (opt.value === 'conductor') {
                                colorClasses = "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-400 hover:text-amber-900";
                              } else if (opt.value === 'contratista') {
                                colorClasses = "bg-violet-50 text-violet-800 border-violet-200 hover:bg-violet-100 hover:border-violet-400 hover:text-violet-900";
                              } else if (opt.value === 'soboce') {
                                colorClasses = "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 hover:border-emerald-400 hover:text-emerald-900";
                              }
                              
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => handleSendMessage(opt.label, opt.value)}
                                  className={`px-2.5 py-1 border rounded-lg text-[10px] font-bold shadow-sm transition ${colorClasses}`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Chat Input Bar */}
                  {classificationStep !== 'classified' && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Escribe tu respuesta..."
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendMessage(userInput);
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition"
                      />
                      <button
                        type="button"
                        onClick={() => handleSendMessage(userInput)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
                      >
                        Enviar
                      </button>
                    </div>
                  )}

                  {/* Classified Success Badge */}
                  {classificationStep === 'classified' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                          ✓
                        </div>
                        <div>
                          <p className="text-[9px] text-emerald-800 font-bold uppercase tracking-wider font-mono">RUTA DETERMINADA</p>
                          <p className="text-xs font-extrabold text-slate-900 uppercase">
                            {rol === 'visita' ? 'Flujo de Visita' :
                             rol === 'conductor' ? 'Conductor Externo' :
                             rol === 'soboce' ? 'Personal SOBOCE (Tipo II)' :
                             `Contratista Tipo ${contratistaTipo || 'I'}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={startChat}
                        className="text-[9px] font-bold uppercase tracking-wider font-mono text-emerald-800 hover:underline"
                      >
                        Re-clasificar
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Selection View with Administrative Passcode Restriction */}
              {activeTab === 'manual' && (
                <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-150 animate-fade-in">
                  {!isManualUnlocked ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600 font-bold flex items-center gap-1">
                        🔑 ACCESO RESTRINGIDO (ADMINISTRADOR)
                      </p>
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Para habilitar la selección directa de roles, ingrese la contraseña de administrador (sima.2026@):
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          placeholder="Ingrese contraseña..."
                          value={manualPassword}
                          onChange={(e) => {
                            setManualPassword(e.target.value);
                            setManualPasswordError(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleUnlockManual();
                            }
                          }}
                          className={`flex-1 px-3 py-1.5 bg-white border ${
                            manualPasswordError ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-500/20'
                          } rounded-lg text-xs focus:outline-none focus:ring-2`}
                        />
                        <button
                          type="button"
                          onClick={handleUnlockManual}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg transition"
                        >
                          Verificar
                        </button>
                      </div>
                      {manualPasswordError && (
                        <p className="text-[9px] text-red-650 text-red-600 font-mono font-bold">
                          Contraseña incorrecta. Intente nuevamente.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest font-mono">
                          🔓 Selección Directa Habilitada
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsManualUnlocked(false);
                            setManualPassword('');
                          }}
                          className="text-[9px] text-red-600 hover:underline font-mono"
                        >
                          Cerrar acceso
                        </button>
                      </div>
                      <div>
                        <select
                          value={rol}
                          onChange={(e) => {
                            const val = e.target.value as typeof rol;
                            setRol(val);
                            if (val === 'soboce') {
                              setContratistaTipo('II');
                              setEmpresa('SOBOCE S.A.');
                            } else if (val !== 'contratista') {
                              setContratistaTipo(null);
                            } else if (!contratistaTipo) {
                              setContratistaTipo('I');
                            }
                          }}
                          className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-slate-900 font-medium transition"
                        >
                          <option value="visita">Visita Externa (Solo Video)</option>
                          <option value="conductor">Conductor Externo / Transportista</option>
                          <option value="contratista">Contratista Rutinario (RUC)</option>
                          <option value="soboce">Personal Propio (SOBOCE)</option>
                        </select>
                      </div>

                      {rol === 'contratista' && (
                        <div className="animate-fade-in">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                            Tipo de Contratista
                          </label>
                          <select
                            value={contratistaTipo || 'I'}
                            onChange={(e) => setContratistaTipo(e.target.value as any)}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm text-slate-900 font-medium transition"
                          >
                            <option value="I">Tipo I (Riesgo Alto / Complejo)</option>
                            <option value="II">Tipo II (Riesgo Medio / Intermedio)</option>
                            <option value="III">Tipo III (Riesgo Bajo / Simple)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            {isReclassifying ? (
              <button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 px-4 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 border-amber-700 shadow-md transition-all active:translate-y-0.5 mt-4"
              >
                <UserPlus className="w-4 h-4 text-white" /> CONFIRMAR RECLASIFICACIÓN Y REINICIAR PROGRESO 🔄
              </button>
            ) : (
              <button
                type="submit"
                className="w-full bg-emerald-800 hover:bg-emerald-900 text-white py-3 px-4 rounded-xl text-xs font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 border-emerald-950 shadow-md transition-all active:translate-y-0.5 mt-4"
              >
                <UserPlus className="w-4 h-4 text-emerald-400" /> COMENZAR CAPACITACIÓN DESDE CERO
              </button>
            )}
          </div>
        )}
      </form>

      {/* Admin Panel Launch Trigger */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
        <span className="font-mono">SOBOCE SIMA v2.0</span>
        <button
          onClick={() => {
            setShowAdminPasscode(true);
            setAdminPasscode('');
            setAdminPasscodeError('');
          }}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-bold uppercase tracking-wider bg-slate-100 hover:bg-slate-200 py-1.5 px-3 rounded-lg transition"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> INFORME ADMIN
        </button>
      </div>

      {showAdminPasscode && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl overflow-hidden animate-fade-in text-slate-900">
            {/* Header */}
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider font-mono">ACCESO RESTRINGIDO</span>
              </div>
              <button 
                type="button"
                onClick={() => setShowAdminPasscode(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Para ingresar al panel de <strong className="text-slate-700">INFORME ADMIN</strong>, por favor introduzca el código numérico de seguridad.
              </p>
              
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold uppercase text-slate-700 font-mono">
                  Código de Seguridad
                </label>
                <input
                  type="password"
                  required
                  placeholder="Escriba el código numérico"
                  value={adminPasscode}
                  onChange={(e) => {
                    setAdminPasscode(e.target.value);
                    setAdminPasscodeError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyAdmin();
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-sm font-mono text-slate-900 tracking-widest text-center"
                  autoFocus
                />
                {adminPasscodeError && (
                  <p className="text-[10px] text-red-650 font-bold font-mono text-center">
                    {adminPasscodeError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleVerifyAdmin}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition"
              >
                Verificar e Ingresar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

function foundingRoleText(rol: string) {
  if (rol === 'autorizante') return 'Autorizante PAEP';
  if (rol === 'contratista') return 'Contratista Rutinario';
  return rol;
}
