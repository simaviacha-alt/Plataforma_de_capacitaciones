import { Video } from '../types';

export const INITIAL_VIDEOS: Video[] = [
  // 1. Inducción para Visitas
  {
    id: "v_visita_1",
    title: "Inducción de Seguridad y Medio Ambiente para Visitas",
    description: "Lineamientos críticos y normas de seguridad básicas que toda visita externa debe cumplir al ingresar a la Planta Viacha.",
    youtubeId: "W9oXWPhuDks", // Educational safety video
    duration: 180, // 3 minutes
    roleRequirement: "visita"
  },

  // 2. Inducción General
  {
    id: "v_general_1",
    title: "1. Inducción de Seguridad Industrial",
    description: "Normativas e identificación de peligros, EPPs obligatorios, uso de herramientas, señalética y reglas de vida en planta SOBOCE.",
    youtubeId: "pPrN9w5H5Qc", // Exact ID from user's Excel sheet
    duration: 480, // 8 minutes
    roleRequirement: "general"
  },
  {
    id: "v_general_2",
    title: "2. Inducción de Medio Ambiente",
    description: "Clasificación de residuos por código de colores, cuidado del agua, control de emisiones atmosféricas y reporte de incidentes ambientales.",
    youtubeId: "5Ct23xxL-Ug", // Exact ID from user's Excel sheet
    duration: 360, // 6 minutes
    roleRequirement: "general"
  },

  // 3. Inducción para Conductores (1 video)
  {
    id: "v_conductor_1",
    title: "Inducción Específica de Seguridad y Medio Ambiente para Conductores",
    description: "Normas de tránsito interno, velocidad máxima (10 km/h), estacionamiento, uso de cuñas y lineamientos ambientales para transportistas.",
    youtubeId: "g6zP39x9B7A",
    duration: 420, // 7 minutes
    roleRequirement: "conductor"
  },

  // 4. Solicitante PAEP (Tercer video obligatorio de Inducción General)
  {
    id: "v_solicitante_1",
    title: "3. Capacitación para Solicitantes de Permisos de Trabajo (PAEP)",
    description: "Lineamientos obligatorios del sistema de permisos de trabajo (SPT-GSS.SI.004), roles y llenado del Análisis Preliminar de Riesgos e Impactos (APRI) en SOBOCE S.A.",
    youtubeId: "yCqKiADEVrE", // New exact link provided by user
    duration: 540, // 9 minutes
    roleRequirement: "general"
  },

  // 5. Autorizante PAEP (7 videos)
  {
    id: "v_autorizante_1",
    title: "PAEP - Módulo 1: Generalidades y Marco Legal",
    description: "Responsabilidad civil y penal del Autorizante PAEP, conceptos de sistema de permisos de trabajo.",
    youtubeId: "CcgkVfdqBTU", // Exact ID from user's Excel sheet
    duration: 300,
    roleRequirement: "autorizante"
  },
  {
    id: "v_autorizante_2",
    title: "PAEP - Módulo 2: Trabajos en Altura, Andamios y Escaleras",
    description: "Uso del arnés y líneas de vida de 5000 lb, factor de caída y puntos de anclaje seguros.",
    youtubeId: "YrcdRqMVh7M", // Exact ID from user's Excel sheet
    duration: 320,
    roleRequirement: "autorizante"
  },
  {
    id: "v_autorizante_3_1",
    title: "PAEP - Módulo 3.1: Espacios Confinados",
    description: "Atmósferas peligrosas, medición de oxígeno mínimo (19.5%) y rol crítico del vigía/vigilante de entrada.",
    youtubeId: "607ofmdV7Dg", // Exact ID from user's Excel sheet
    duration: 310,
    roleRequirement: "autorizante"
  },
  {
    id: "v_autorizante_3_2",
    title: "PAEP - Módulo 3.2: Trabajos en Caliente",
    description: "Distancias de seguridad para combustibles (11 metros), prevención de amolado, uso obligatorio de extintores de 6kg ABC.",
    youtubeId: "BnKIbRHgPJ8", // Exact ID from user's Excel sheet
    duration: 280,
    roleRequirement: "autorizante"
  },
  {
    id: "v_autorizante_4",
    title: "PAEP - Módulo 4: Trabajos Eléctricos, Bloqueo y Etiquetado",
    description: "Las cinco reglas de oro para corte visible de tensión, puesta a tierra, bloqueo mecánico y candados LOTO.",
    youtubeId: "Hil-EgQpQJk", // Exact ID from user's Excel sheet
    duration: 290,
    roleRequirement: "autorizante"
  },
  {
    id: "v_autorizante_5",
    title: "PAEP - Módulo 5: Trabajos con Izajes y Grúas",
    description: "Procedimientos de seguridad, delimitación con conos, planes de izaje y certificaciones de grúas.",
    youtubeId: "innBJx7guwI", // Exact ID from user's Excel sheet
    duration: 350,
    roleRequirement: "autorizante"
  },
  {
    id: "v_autorizante_6",
    title: "PAEP - Módulo 6: Trabajos en Excavaciones",
    description: "Seguridad y excavaciones con taludes, entibados y señalización de zanjas.",
    youtubeId: "jwz0KkNdA2E", // Exact ID from user's Excel sheet
    duration: 350,
    roleRequirement: "autorizante"
  },

  // 6. Capacitación a Contratistas Rutinarios (7 videos)
  {
    id: "v_contratista_1",
    title: "1. Principales Peligros en Puestos de Trabajo",
    description: "Identificación activa de peligros y fomento de actitudes seguras en Planta Viacha de SOBOCE.",
    youtubeId: "1bGBTBdMdSM", // Exact ID from user's Excel sheet
    duration: 300,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_2",
    title: "2. Sustancias Peligrosas - Módulo 1",
    description: "Rotulado con rombo NFPA 704 y hojas MSDS para manipulación segura de insumos químicos en áreas de trabajo.",
    youtubeId: "IA93LGLGNVY", // Exact ID from user's Excel sheet
    duration: 280,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_3",
    title: "3. Sustancias Peligrosas - Módulo 2",
    description: "Prevención de salpicaduras y uso obligatorio de EPP para la manipulación química segura.",
    youtubeId: "Jmr0sYL_ceM", // Exact ID from user's Excel sheet
    duration: 300,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_4",
    title: "4. Sustancias Peligrosas - Módulo 3",
    description: "Almacenamiento compatible y delimitación de seguridad de reactivos químicos e inflamables.",
    youtubeId: "DAJDMAqmw0I", // Exact ID from user's Excel sheet
    duration: 290,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_5",
    title: "5. Sustancias Peligrosas - Módulo 4",
    description: "Actuación ante derrames accidentales y uso reglamentario de bandejas de contención secundaria.",
    youtubeId: "IEveUGKOClk", // Exact ID from user's Excel sheet
    duration: 280,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_6",
    title: "6. Sustancias Peligrosas - Módulo 5",
    description: "Primeros auxilios ante exposición dérmica, ocular o inhalatoria de fluidos industriales.",
    youtubeId: "76XC_Gxf4T8", // Exact ID from user's Excel sheet
    duration: 310,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_7",
    title: "7. Gestión de Residuos Sólidos",
    description: "Separación correcta de residuos sólidos según el código de colores de contenedores oficiales de SOBOCE S.A.",
    youtubeId: "ZHLYI8QZTNA", // Exact ID from user's Excel sheet
    duration: 290,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_8",
    title: "8. Plan de Preparación y Respuesta ante Emergencias",
    description: "Protocolos de evacuación, puntos de encuentro, uso de alarmas generales y reacción ante emergencias en Planta Viacha.",
    youtubeId: "gswy9C-pNoM",
    duration: 320,
    roleRequirement: "contratista"
  },
  {
    id: "v_contratista_9",
    title: "9. Ergonomía en los Puestos de Trabajo y Pausas Activas",
    description: "Posturas correctas de manipulación de cargas, prevención de lesiones osteomusculares y ejercicios de estiramiento laboral.",
    youtubeId: "7q2R7T-K9A0",
    duration: 280,
    roleRequirement: "contratista"
  }
];

export const MODULES_INFO = [
  { id: "visita", name: "Inducción para Visitas", label: "Inducción SIMA de Visitas" },
  { id: "general", name: "Inducción General y Solicitante PAEP", label: "Inducción General para Trabajos en Planta" },
  { id: "conductor", name: "Inducción de Conductores", label: "Inducción SIMA para Transportistas" },
  { id: "autorizante", name: "Autorizante PAEP", label: "Capacitación Avanzada para Autorizantes" },
  { id: "contratista", name: "Contratistas Rutinarios", label: "Capacitación a Contratistas Rutinarios Soboce" }
];
