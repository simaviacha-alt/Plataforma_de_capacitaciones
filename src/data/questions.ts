import { Exam } from '../types';

export const EXAM_BANKS: { [key: string]: Exam[] } = {
  general: [
    {
      id: "sima_general_1",
      title: "Examen de Inducción SIMA General - Grupo A",
      passingScore: 90,
      questions: [
        {
          id: "g_q1",
          text: "¿Cuáles son los tipos de peligro?",
          type: "multiple-choice",
          options: ["Peligros eléctricos", "Peligros químicos", "Peligros mecánicos", "Peligros sociales"],
          correctAnswers: [0, 1, 2] // d) Peligros sociales is black/disabled in solucionario
        },
        {
          id: "g_q2",
          text: "Los conductores de vehículos deben contar con:",
          type: "multiple-choice",
          options: [
            "Licencia tipo A",
            "Licencia tipo B",
            "Licencia de acuerdo al tipo de vehículo que conducen"
          ],
          correctAnswers: [2]
        },
        {
          id: "g_q3",
          text: "El uso de protectores auditivos es obligatorio cuando:",
          type: "multiple-choice",
          options: [
            "Se está expuesto a ruidos de más de 85 decibeles",
            "Se está expuesto a ruidos de más de 75 decibeles",
            "Se está expuesto a ruidos de más de 80 decibeles"
          ],
          correctAnswers: [0]
        },
        {
          id: "g_q4",
          text: "Las gafas de protección son obligatorias en planta porque:",
          type: "multiple-choice",
          options: [
            "Nos protegen de proyecciones de partículas y otras sustancias",
            "Es una orden del supervisor de seguridad",
            "Nos ayudan a ver de lejos los objetos",
            "Nos protegen del reflejo en la conducción de vehículos"
          ],
          correctAnswers: [0, 3]
        },
        {
          id: "g_q5",
          text: "Según el Plan de Emergencias, ¿cuál es el procedimiento correcto en caso de incendio?",
          type: "multiple-choice",
          options: [
            "Luego de escuchar la alarma salir del área siguiendo la señalización de evacuación",
            "Intentar apagar el fuego con el material que encuentre",
            "Cerrar todas las salidas para evitar que se propague el fuego"
          ],
          correctAnswers: [0]
        },
        {
          id: "g_q6",
          text: "Para realizar el reporte de acto o condición insegura es importante ubicarse en el área segura.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q7",
          text: "El Punto de Encuentro en caso de evacuación debe ser conocido únicamente por los Brigadistas.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q8",
          text: "En caso de evacuación NO se deben apagar los equipos y maquinarias.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q9",
          text: "Los extintores a chorro de agua sirven para apagar incendios eléctricos.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q10",
          text: "Para realizar el bloqueo y etiquetado de maquinaria, ésta debe estar completamente detenida.",
          type: "true-false",
          correctAnswers: true
        }
      ]
    },
    {
      id: "sima_general_2",
      title: "Examen de Inducción SIMA General - Grupo B",
      passingScore: 90,
      questions: [
        {
          id: "g_q11",
          text: "Las siguientes actividades deben contar con Permiso de Trabajo:",
          type: "multiple-choice",
          options: [
            "Trabajos en altura a 1,5 m",
            "Trabajos en caliente",
            "Trabajos sin riesgo eléctrico",
            "Uso de grúas"
          ],
          correctAnswers: [1, 3] // Checked against Solucionario (only warm and cranes)
        },
        {
          id: "g_q12",
          text: "El color rojo en el rombo NFPA de seguridad se refiere a:",
          type: "multiple-choice",
          options: [
            "Inflamabilidad",
            "Salud",
            "Reactividad"
          ],
          correctAnswers: [0]
        },
        {
          id: "g_q13",
          text: "Estar en la línea de fuego significa:",
          type: "multiple-choice",
          options: [
            "Estar en una posición donde se puede resbalar o ser golpeado por un objeto",
            "Estar cerca de la zona segura",
            "Estar cerca de un extintor de fuego"
          ],
          correctAnswers: [0]
        },
        {
          id: "g_q14",
          text: "¿Qué es la actitud segura en el trabajo?",
          type: "multiple-choice",
          options: [
            "Trabajar rápido sin importar los riesgos",
            "Cumplir con las normas y usar el EPP adecuadamente",
            "Seguir las normas solo cuando hay supervisión",
            "Identificar los peligros cada que iniciamos una actividad"
          ],
          correctAnswers: [1, 3]
        },
        {
          id: "g_q15",
          text: "En áreas donde se realizan actividades con sustancias químicas se debe contar con:",
          type: "multiple-choice",
          options: [
            "Ficha u Hoja de Seguridad correspondiente",
            "Permiso de Trabajo correspondiente",
            "No se necesita ningún tipo de permiso"
          ],
          correctAnswers: [0] // Only MSDS is marked in red in Solucionario
        },
        {
          id: "g_q16",
          text: "Los estados emocionales pueden afectar la seguridad.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q17",
          text: "Tomar 'atajos' para realizar el trabajo hace que sea más eficiente el trabajo.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q18",
          text: "La fatiga no constituye un estado comportamental peligroso.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q19",
          text: "El estado de los ojos y la mente en la tarea son imprescindibles para llevar a cabo de manera segura una actividad.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q20",
          text: "La manipulación de objetos pesados de manera recurrente requiere reducir esfuerzo excesivo y movimientos repetitivos para evitar lesiones.",
          type: "true-false",
          correctAnswers: true
        }
      ]
    },
    {
      id: "sima_general_3",
      title: "Examen de Inducción SIMA General - Grupo C",
      passingScore: 90,
      questions: [
        {
          id: "g_q21",
          text: "Identifique los 4 estados que nos pueden llevar a errores comportamentales que aumentan el riesgo de lesiones:",
          type: "multiple-choice",
          options: ["Prisa", "Aburrimiento", "Frustración", "Nostalgia", "Fatiga", "Exceso de confianza/Complacencia"],
          correctAnswers: [0, 2, 4, 5]
        },
        {
          id: "g_q22",
          text: "¿Cuáles son los 4 elementos que deben existir para que se inicie un fuego?",
          type: "multiple-choice",
          options: ["Combustible", "Oxígeno", "Hidrógeno", "Fuente de calor", "Material reactivo", "Reacción en cadena"],
          correctAnswers: [0, 1, 3, 5]
        },
        {
          id: "g_q23",
          text: "Se consideran normas generales dentro de las instalaciones de SOBOCE S.A.:",
          type: "multiple-choice",
          options: [
            "Prohibido fumar, consumir bebidas alcohólicas y/o estupefacientes",
            "Prohibido faltar el respeto a compañeros",
            "Prohibida la tenencia y uso de armas de fuego",
            "Conductores deben contar con licencia de conducir vigente",
            "Prohibido el ingreso en áreas de acceso restringido sin autorización",
            "Permitido el uso de herramientas sin guardas de seguridad si hay prisa"
          ],
          correctAnswers: [0] // Only 'prohibido fumar...' is red in general norms slide
        },
        {
          id: "g_q24",
          text: "¿Cuáles son las disposiciones legales en seguridad industrial que rigen el actuar de la empresa?",
          type: "multiple-choice",
          options: [
            "Ley de la empresa pública",
            "Ley general del trabajo y reglamento",
            "Ley general de Higiene, Seguridad Ocupacional y Bienestar",
            "Resoluciones ministeriales emitidas por el Ministerio de Trabajo"
          ],
          correctAnswers: [2] // Only 'Ley general de higiene...' is highlighted red
        },
        {
          id: "g_q25",
          text: "¿Cuáles son EPP's mínimos necesarios dentro de las instalaciones de SOBOCE S.A.?",
          type: "multiple-choice",
          options: ["Casco", "Gafas de seguridad", "Protectores auditivos", "Guantes", "Fajas lumbares", "Protectores respiratorios"],
          correctAnswers: [5] // Only 'Protectores respiratorios' marked red in Solucionario Q15
        },
        {
          id: "g_q26",
          text: "Jalar las cargas y levantarlas con las piernas ayudan a reducir peligros ergonómicos.",
          type: "true-false",
          correctAnswers: false // Highlighted as F (since lifting with back bent is wrong, or phrasing in PDF)
        },
        {
          id: "g_q27",
          text: "Se debe reportar incidentes leves, condiciones peligrosas o actos peligrosos en la tarjeta de Reporte de actos, condiciones inseguras.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q28",
          text: "El uso de ARNES de seguridad es obligatorio para realizar trabajos en altura.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q29",
          text: "El rombo de la figura (NFPA 704) debe colocarse en todos los envases con sustancias peligrosas.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q30",
          text: "Se solicita permiso para trabajo en excavación cuando la excavación que se debe realizar es MENOR a 80 cm.",
          type: "true-false",
          correctAnswers: true
        }
      ]
    },
    {
      id: "sima_general_4",
      title: "Examen de Inducción SIMA General - Grupo D",
      passingScore: 90,
      questions: [
        {
          id: "g_q31",
          text: "Las tarjetas de reporte nos sirven para reportar:",
          type: "multiple-choice",
          options: ["Actos inseguros", "Condiciones inseguras", "Situaciones inseguras", "Horas de salida"],
          correctAnswers: [0, 1, 2]
        },
        {
          id: "g_q32",
          text: "¿Cuáles son los tipos de extintor disponibles en las instalaciones?",
          type: "multiple-choice",
          options: ["Extintor de agua", "Extintor de polvo químico húmedo (PQH)", "Extintor de polvo químico seco (PQS)", "Extintor de monóxido de carbono (CO)", "Extintor de dióxido de carbono (CO2)", "Extintor de espuma"],
          correctAnswers: [0, 2, 4]
        },
        {
          id: "g_q33",
          text: "¿Qué tipos de señalización encontramos en las instalaciones de SOBOCE S.A.?",
          type: "multiple-choice",
          options: ["Prohibición", "Advertencia", "Obligación", "Complementaria", "Salvamento y evacuación", "Todas las anteriores"],
          correctAnswers: [5]
        },
        {
          id: "g_q34",
          text: "Los materiales considerados peligrosos son:",
          type: "multiple-choice",
          options: ["Inflamables | Ácidos y bases", "Explosivos", "Corrosivos", "Tóxicos", "Agua purificada"],
          correctAnswers: [0, 1, 2, 3]
        },
        {
          id: "g_q35",
          text: "¿En qué situaciones se aplica el bloqueo y etiquetado en maquinarias?",
          type: "multiple-choice",
          options: ["Mantenimiento | Trabajos Eléctricos", "Limpieza", "Trabajo en Altura", "Operación Normal"],
          correctAnswers: [0, 1] // Matches Solucionario (only maintenance, electricity and cleaning are checked)
        },
        {
          id: "g_q36",
          text: "En SOBOCE está permitido el uso de cinturones de Seguridad.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q37",
          text: "Se DEBE COLOCAR SOLO CANDADO de bloqueo/etiquetado en los interruptores siempre que se realice un trabajo eléctrico.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q38",
          text: "El uso de ZAPATILLAS DEPORTIVAS en la obra está permitido.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q39",
          text: "Las áreas de trabajo deben delimitarse con CONOS o CINTAS para prevenir incidentes.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q40",
          text: "Está permitido utilizar herramientas HECHIZAS o improvisadas.",
          type: "true-false",
          correctAnswers: false
        }
      ]
    },
    {
      id: "sima_general_5",
      title: "Examen de Inducción SIMA General - Grupo E",
      passingScore: 90,
      questions: [
        {
          id: "g_q41",
          text: "¿Con qué implementos debe contar el trabajador para manejar sustancias peligrosas?",
          type: "multiple-choice",
          options: ["Ficha u Hoja de seguridad", "Ropa de trabajo", "EPP’s", "Todas las anteriores"],
          correctAnswers: [3]
        },
        {
          id: "g_q42",
          text: "¿Qué se debe realizar para evitar daños ergonómicos?",
          type: "multiple-choice",
          options: ["Usar un carrito para levantar las cargas", "Levantar la carga con las piernas", "Mantener la espalda recta", "Todas las anteriores"],
          correctAnswers: [3]
        },
        {
          id: "g_q43",
          text: "¿Qué clases de fuego se pueden generar en nuestras labores?",
          type: "multiple-choice",
          options: ["Clase A", "Clase B", "Clase C", "Todas las anteriores"],
          correctAnswers: [3]
        },
        {
          id: "g_q44",
          text: "¿Qué pasos se deben seguir en caso de escuchar la alarma de emergencia?",
          type: "multiple-choice",
          options: ["Apague los equipos", "Deje de realizar la actividad", "Diríjase al punto de encuentro", "Todas las anteriores"],
          correctAnswers: [3]
        },
        {
          id: "g_q45",
          text: "¿Cuál de los siguientes enunciados es un aspecto ambiental?",
          type: "multiple-choice",
          options: ["Contaminación atmosférica", "Contaminación de suelos", "Emisiones atmosféricas por fuentes móviles"],
          correctAnswers: [2]
        },
        {
          id: "g_q46",
          text: "Los pasos para utilizar un EXTINTOR para fuegos son: Tire del precinto, Apunte a la base, Presione la palanca y Expanda el agente.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q47",
          text: "El permiso de trabajo dura una semana de trabajo para la misma actividad si se mantiene el mismo lugar y las mismas condiciones.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q48",
          text: "Cerca de actividades donde se realicen trabajos eléctricos se debe colocar extintores de agua a chorro.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q49",
          text: "Se debe contar con bandejas de contención en lugares donde se manipulen sustancias peligrosas líquidas.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q50",
          text: "Solo algunas sustancias peligrosas deben contar con Hojas de datos de Seguridad.",
          type: "true-false",
          correctAnswers: false
        }
      ]
    },
    {
      id: "sima_general_6",
      title: "Examen de Inducción SIMA General - Grupo F",
      passingScore: 90,
      questions: [
        {
          id: "g_q51",
          text: "¿Cómo se denominan las acciones que se toman antes de llevar a cabo actividades?",
          type: "multiple-choice",
          options: ["Acciones preventivas", "Acciones ambientales", "Acciones de mitigación"],
          correctAnswers: [0]
        },
        {
          id: "g_q52",
          text: "¿Cuál de los siguientes enunciados es un impacto ambiental?",
          type: "multiple-choice",
          options: ["Generación de residuos", "Contaminación hídrica", "Vertido de residuos líquidos"],
          correctAnswers: [1]
        },
        {
          id: "g_q53",
          text: "¿Cuál de las siguientes actividades están prohibidas dentro de las instalaciones?",
          type: "multiple-choice",
          options: ["Manejo de sustancias peligrosas", "Separación de residuos en diferentes contenedores", "Botar la basura a la intemperie"],
          correctAnswers: [2]
        },
        {
          id: "g_q54",
          text: "El procedimiento de gestión de residuos en SOBOCE S.A. contempla la:",
          type: "multiple-choice",
          options: [
            "Clasificación, recolección, manipulación, almacenamiento, transporte, disposición transitoria y/o final de los residuos.",
            "Clasificación, recolección, almacenamiento, transporte y entierro de residuos.",
            "Clasificación, reutilización, manipulación, guardado, transporte, disposición final de los residuos y entierro de residuos."
          ],
          correctAnswers: [0]
        },
        {
          id: "g_q55",
          text: "En las instalaciones contamos con los siguientes contenedores específicos:",
          type: "multiple-choice",
          options: [
            "Negro para residuos de computadoras, verde para residuos húmedos.",
            "Azul para papel común, negro para todos los desechos mezclados.",
            "Verde para residuos orgánicos, amarillo para plásticos reciclables, negro para residuos no aprovechables, rojo para residuos peligrosos, azul para papel o cartón, naranja para botellas PET, plomo para metales y vidrios, café para materiales de recirculación."
          ],
          correctAnswers: [2]
        },
        {
          id: "g_q56",
          text: "Los aspectos ambientales son elementos de las actividades, productos y servicios de una organización que interactúan con el medio ambiente. Como ejemplo tenemos la 'generación de residuos'.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "g_q57",
          text: "Los impactos ambientales son aquellos cambios positivos que se producen en el medio ambiente por las actividades de las industrias.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q58",
          text: "La disposición final de residuos está permitida dentro de las instalaciones de SOBOCE S.A.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q59",
          text: "La separación de los residuos en diferentes contenedores es opcional.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "g_q60",
          text: "Los envases de almacenamiento y manipulación de sustancias peligrosas deben estar en buenas condiciones de uso.",
          type: "true-false",
          correctAnswers: true
        }
      ]
    }
  ],
  conductor: [
    {
      id: "sima_conductor",
      title: "Examen de Inducción Específica para Conductores",
      passingScore: 90,
      questions: [
        {
          id: "c_q1",
          text: "La velocidad máxima de tránsito permitida para vehículos livianos y pesados dentro de las instalaciones industriales de SOBOCE es de 10 km/h.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "c_q2",
          text: "Es obligatorio el uso de cinturón de seguridad para todos los ocupantes de cualquier vehículo interno o de proveedores.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "c_q3",
          text: "¿Cuáles son los requisitos obligatorios para ingresar como conductor de transporte de carga?",
          type: "multiple-choice",
          options: [
            "Licencia de conducir vigente acorde al tipo de vehículo",
            "Haber aprobado la inducción específica SIMA",
            "Uso estricto de EPP obligatorio (Casco, calzado de seguridad, gafas, chaleco reflectivo)",
            "Tener una copia del contrato original de la empresa"
          ],
          correctAnswers: [0, 1, 2]
        },
        {
          id: "c_q4",
          text: "Está permitido realizar operaciones de carga, acople o retroceso sin ayuda de un señalero o supervisor en áreas de alto tráfico.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "c_q5",
          text: "En caso de un incidente con derrame de producto o combustibles dentro de planta, el conductor debe:",
          type: "multiple-choice",
          options: [
            "Ignorar el derrame y salir de la planta rápidamente",
            "Reportar de inmediato a Seguridad Industrial / personal de Balanza",
            "Utilizar el kit antiderrames si se cuenta con él y está capacitado"
          ],
          correctAnswers: [1, 2]
        },
        {
          id: "c_q6",
          text: "El conductor es responsable de asegurar que la carga esté correctamente estribada y amarrada antes de iniciar el movimiento del camión.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "c_q7",
          text: "Está prohibido el uso de teléfonos celulares mientras se conduce cualquier vehículo dentro de planta.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "c_q8",
          text: "Los neumáticos de los camiones de transporte pueden presentar desgaste severo o rotura si transitan despacio.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "c_q9",
          text: "¿Qué elementos de control ambiental son obligatorios en los camiones de transportistas externos?",
          type: "multiple-choice",
          options: [
            "Ausencia de fugas activas de aceites y fluidos",
            "Lona o carpa protectora en buen estado para evitar dispersión de polvo, si corresponde",
            "Revisión técnica o gases aprobada",
            "Sistema de sonido de alta fidelidad"
          ],
          correctAnswers: [0, 1, 2]
        },
        {
          id: "c_q10",
          text: "Antes de bajarse de la cabina en el área de descarga, el camión debe estar completamente frenado, apagado y con cuñas de seguridad colocadas en las ruedas traseras.",
          type: "true-false",
          correctAnswers: true
        }
      ]
    }
  ],
  autorizante: [
    {
      id: "sima_autorizante",
      title: "Evaluación de Autorizante PAEP (Persona Autorizada de Emitir Permisos de Trabajo)",
      passingScore: 85,
      questions: [
        {
          id: "a_q1",
          text: "Previo al inicio de actividades en altura, los accesorios y EPP’s deben ser inspeccionados.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "a_q2",
          text: "El sistema de posicionamiento es suficiente para la seguridad del trabajador en los trabajos en altura.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "a_q3",
          text: "El Factor de caída 0, es cuando el punto de anclaje se encuentra por encima de la cabeza del trabajador.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "a_q4",
          text: "En caso de que los trabajos en altura se desarrollen en lluvias intensas y vientos fuertes, no es necesario suspender la actividad, sólo se debe dotar de ropa de agua a los trabajadores.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "a_q5",
          text: "Previo al inicio de los trabajos en altura, es necesario realizar la identificación de posibles riesgos adicionales (energía eléctrica, espacios confinados, etc.)",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "a_q6",
          text: "Los trabajos en altura son una actividad crítica donde no existe el riesgo de caída a distinto nivel.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "a_q7",
          text: "Los sistemas mixtos sirven para la detención de caídas y posicionarse al realizar los trabajos en altura, y están constituidos por: Conector de anclaje, dispositivos de desaceleración, arnés con cinturón de posicionamiento, y banda o línea de amarre o posicionamiento.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "a_q8",
          text: "La aplicación del permiso de trabajo para trabajos en altura es opcional.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "a_q9",
          text: "El sistema de detención de caídas está compuesto por: punto de anclaje, dispositivo de desaceleración y arnés de seguridad.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "a_q10",
          text: "Previo al trabajo en altura, los trabajadores deben participar de una charla de seguridad donde se expliquen las condiciones de seguridad como los controles a aplicar para gestionar los riesgos a los que serán expuestos.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "a_q11",
          text: "El 'Factor de caída 2' es el más recomendable ya que le brinda mayor seguridad al trabajador en caso de caída.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "a_q12",
          text: "La identificación de puntos de anclaje no es necesaria para los trabajos en altura.",
          type: "true-false",
          correctAnswers: false
        },
        {
          id: "a_q13",
          text: "Los EPP’s específicos a utilizar (según su aplicabilidad) para trabajos en altura son: Arnés corporal, dispositivo de posicionamiento, cabo de vida, cinta retráctil, y conector de anclaje.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "a_q14",
          text: "Al realizar trabajos en altura en la noche, debería contarse con adecuada iluminación entre 50 y 150 lux.",
          type: "true-false",
          correctAnswers: false // PDF says: F (Question 14 of page 2)
        },
        {
          id: "a_q15",
          text: "El personal que realice trabajos en altura debe tener experiencia y contar con mínimo 10 horas de capacitación.",
          type: "true-false",
          correctAnswers: true
        }
      ]
    }
  ],
  contratista: [
    {
      id: "sima_contratista",
      title: "Examen de Capacitación para Contratistas Rutinarios",
      passingScore: 90, // Configurable at runtime, defaults to 90 as per PDF
      questions: [
        {
          id: "ct_q1",
          text: "Indique si el siguiente enunciado es verdadero: Todo personal contratista rutinario que realice trabajos dentro de SOBOCE S.A. debe poseer sus Permisos de Trabajo debidamente aprobados, firmados por el Supervisor Solicitante y el Autorizante PAEP correspondiente, y visibles en el área de trabajo.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "ct_q2",
          text: "¿Cuáles son las obligaciones críticas de seguridad para empresas contratistas rutinarias?",
          type: "multiple-choice",
          options: [
            "Tener seguros de salud vigentes de todo el personal ingresante",
            "Presentar y mantener el equipo certificado correspondiente (ej. andamios, grúas)",
            "Participar diariamente de la charla de 5 minutos antes del inicio de labores",
            "Hacer los trabajos lo más rápido posible sin avisar de incidentes menores"
          ],
          correctAnswers: [0, 1, 2]
        },
        {
          id: "ct_q3",
          text: "El uso de herramientas improvisadas o 'hechizas' (ej. cinceles doblados, destornilladores desgastados, cables añadidos sin enchufe) está estrictamente prohibido dentro de planta.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "ct_q4",
          text: "Las áreas de almacenamiento temporal de residuos de la contratista deben estar señalizadas, limpias, clasificadas por colores de contenedores y libres de desbordes.",
          type: "true-false",
          correctAnswers: true
        },
        {
          id: "ct_q5",
          text: "Antes de intervenir cualquier equipo mecánico o eléctrico para labores de mantenimiento, es mandatorio:",
          type: "multiple-choice",
          options: [
            "Aplicar el procedimiento de Bloqueo y Etiquetado (LOTO), colocando candado y tarjeta personal",
            "Verificar la ausencia de energía residual",
            "Proceder directamente si el interruptor principal está 'off'"
          ],
          correctAnswers: [0, 1]
        }
      ]
    }
  ]
};
export default EXAM_BANKS;
