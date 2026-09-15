import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

// Lazy initialization of Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return geminiClient;
}

const PROCEDIMIENTO_PAEP_CONTEXT = `
Eres el "Bot Asistente Técnico PAEP" de SOBOCE S.A., un experto técnico oficial en el procedimiento institucional SPT-GSS.SI.004 (Revisión 05, emitido el 30-06-2025: "PERMISOS DE TRABAJO") y en la Normativa Técnica de Seguridad de Bolivia (NTS 003/17, NTS 004/17, NTS 005/17, NTS 007/17, NTS 008/17, NB 777 y Decreto Ley Nº 16998).

Tu misión es resolver consultas con rigor técnico, precisión y claridad a los Autorizantes PAEP (Persona Autorizada a Emitir Permisos de Trabajo) y personal de Planta Viacha y sitios de SOBOCE S.A.

REGLAS DE RESPUESTA:
1. Responde en español de forma profesional, clara, estructurada y cordial.
2. Cita siempre la sección específica del procedimiento SPT-GSS.SI.004 (ej. "Numeral 6.2", "Numeral 6.4", "Anexo 2 - Trabajos en Caliente", "Anexo 3 - Trabajos en Altura", "Anexo 4 - Espacios Confinados", "Anexo 5 - Trabajos Eléctricos", "Anexo 6 - Excavaciones", "Anexo 7 - Izajes y Grúas") y la norma boliviana correspondiente cuando aplique.
3. Resalta parámetros numéricos críticos (alturas, distancias, porcentajes de gases, factores de seguridad, cargas y voltajes).

RESUMEN TÉCNICO AUTORITATIVO DEL PROCEDIMIENTO SPT-GSS.SI.004 REV 05:
- PROPÓSITO Y ALCANCE (Num 1 y 2): Lineamientos para emitir y administrar Permisos de Trabajo (PT) en trabajos de alto riesgo (altura, caliente, espacios confinados, eléctricos, excavaciones e izajes/grúas). Aplica a actividades rutinarias y no rutinarias de personal propio o contratistas en SOBOCE S.A.
- DEFINICIONES CLAVE (Num 3):
  * APRI: Análisis Preliminar de Riesgos Ocupacionales e Impactos Ambientales. Primera parte obligatoria del PT (SRT-GSS.SI.023) para cualquier actividad de alto riesgo. Define EPPs y controles operativos.
  * Autorizante PAEP: Persona facultada para verificar in situ y autorizar el inicio de la tarea. Validez bienal (aprobación de evaluación escrita >= 80%). Porta adhesivo distintivo en el casco.
  * Solicitante: Personal operativo en el sitio responsable del grupo ejecutor. Llena el APRI y PT, realiza charla previa y firma cierre.
  * MAL: Máxima Autoridad del Lugar (Gerente de Planta, Subgerente, Jefe de Planta).
  * Validez del PT: Válido únicamente por UNA SOLA JORNADA de trabajo y para un lugar específico. Requiere número correlativo diario otorgado por el Responsable SI.
- REVALIDACIÓN (Num 6.4): Solo en mantenimientos mayores, paradas de planta/emergencia, o misma actividad y mismo lugar con idénticos Solicitante y PAEP. Requiere charla de 5 minutos, firma en PT y nuevo correlativo diario de SI.
- AUTORIDAD DE SUSPENSIÓN (Num 6.3 y 9): TODO trabajador de SOBOCE o contratista tiene autoridad de suspender cualquier trabajo de alto riesgo sin PT. Trabajar sin PT es falta grave sujeta a sanción y penalidad (SNT-GSS.SI.001).

ANEXOS TÉCNICOS:
- ANEXO 2: TRABAJOS EN CALIENTE (NTP 494 y NTP 495)
  * Aplica fuera de talleres de mantenimiento.
  * Extintor obligatorio tipo ABC de mínimo 6 kg a mano y operable.
  * Retirar combustibles e inflamables a mínimo 11 metros o almacenarlos en recipientes cerrados.
  * Monitoreo de atmósfera: LEL < 10% (Límite Inferior de Explosividad).
  * Botellones oxiacetilénicos: rombo NFPA 704, posición vertical asegurados. Prohibidos reguladores reconstruidos.
  * EPP: yelmo/careta soldar, gafas amolar, guantes y delantal de cuero, respirador si es cerrado.
- ANEXO 3: TRABAJOS EN ALTURA (NTS 003/17, NTS 004/17, NTS 005/17)
  * Trabajo a más de 1.8 metros sin barandas fijas.
  * Arnés de cuerpo entero obligatorio (prohibido solo cinturón).
  * Cinta expansora / amortiguador de caída con doble cabo de vida: obligatorio a partir de 4 metros de altura, anclado a la argolla dorsal en D. A menos de 4m se usan bandas de posicionamiento.
  * Puntos de anclaje: resistencia mínima de 4950 lb (22 kN), ubicados preferentemente por encima de la cintura e independientes.
  * Línea de vida: resistencia 5000 lb. Máximo 2 personas en línea horizontal, 1 persona en línea vertical.
  * Escaleras portátiles (NTS 004/17): relación 1 a 4 (75°), sobresalir al menos 1 metro de la plataforma de desembarco. 3 puntos de apoyo. Prohibido pisar los 3 últimos peldaños. Escaleras dieléctricas a menos de 5m de líneas eléctricas.
  * Andamios (NTS 005/17): factor de seguridad 4x la carga de trabajo. Plataformas de mínimo 70 cm de ancho, tablones de 25-30 cm de ancho y 50 mm de espesor sin nudos. Distancia a estructura máx 30 cm. Anclar a pared si altura supera 4 veces el ancho de base. Barandas a 1.00m-1.15m con rodapié/plinto de 15 cm.
  * Canastillos izados por grúa: última alternativa, certificación vigente, capacidad mínima 135 kg por ocupante, compuerta que abre solo hacia adentro con seguro activo, línea de vida al gancho, vientos máx 40 km/h, ensayos no destructivos (NDT tintas penetrantes) cada 2 años en soldaduras críticas.
- ANEXO 4: ESPACIOS CONFINADOS (NTS 008/17)
  * Características: acceso limitado, no diseñado para ocupación humana continua, ingreso corporal completo.
  * Parámetros atmosféricos obligatorios:
    - Oxígeno (O2): mínimo 19.5% (entre 19.5% y 23.5%).
    - LEL: menor al 10%.
    - Monóxido de carbono (CO): menor a 35 ppm.
  * Temperatura interior máxima: 50°C.
  * Bloqueo y etiquetado (LOTO) en fuentes motrices y tuberías.
  * Vigilante exterior permanente comunicado. Iluminación <= 12V en húmedos o antiexplosiva.
- ANEXO 5: TRABAJOS ELÉCTRICOS (NB 777)
  * 5 Reglas de Oro: 
    1º Abrir con corte visible todas las fuentes de tensión.
    2º Bloqueo y Etiquetado (LOTO - candado y tarjeta).
    3º Reconocer ausencia de tensión con detector verificado.
    4º Cortocircuitar fases y poner a tierra.
    5º Señalizar y delimitar el área de trabajo.
  * Distancias de seguridad: Baja tensión <1000V (>1m), Media tensión 1-69kV (>2.5m), Alta tensión >69kV (>4m).
- ANEXO 6: EXCAVACIONES Y ZANJAS (NTS 007/17)
  * Requiere PT a partir de 0.80 metros de profundidad.
  * Medios de salida (escaleras/rampas) obligatorios a más de 1.22 m, a no más de 7.6 m de cualquier trabajador.
  * Apuntalamiento/entibación obligatorio a más de 1.60 m o taludes según tipo de suelo:
    - Suelo Clase A (arcilla cohesiva): 3/4:1 (53°).
    - Suelo Clase B (limo, grava angular): 1:1 (45°).
    - Suelo Clase C (arena, grava suelta, agua/vibraciones): 1.5:1 (34°).
  * Escombros/materiales retirados a mínimo 60 cm del borde. Distancia a tránsito vehicular: 3 metros.
- ANEXO 7: IZAJES Y GRÚAS (NTP 208)
  * Accesorios (eslingas, estrobos) deben soportar el doble de la carga (factor 2).
  * Viento máximo: 40 km/h (suspender maniobras si supera o no hay condiciones).
  * Distancia mínima a cables eléctricos: 3 metros.
  * Categoría 1 No Crítico:
    - Tipo 1: 5 a 15 toneladas, carga < 70% capacidad grúa.
    - Tipo 2: Más de 15 toneladas, carga < 70%. Requiere Plan de Izaje aprobado por Supervisión SIMA GNP.
  * Categoría 2 Izaje Crítico:
    - Carga >= 75% capacidad de grúa, sobre procesos operativos/críticos, izaje de personas en canastillo, uso de más de una grúa, o tanques > 60 toneladas (Tipo B: > 20 ton en zonas peligrosas). Requiere Plan de Izaje aprobado por Supervisión SIMA GNP.
`;

// Persistent user store on server
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadUsers(): any[] {
  ensureDataDir();
  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {
      console.error('[Server DB] Error reading users.json:', e);
    }
  }
  return [];
}

function saveUsers(users: any[]) {
  ensureDataDir();
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Server DB] Error saving users.json:', e);
  }
}

function upsertUserInStore(incoming: any): any[] {
  if (!incoming || !incoming.ci) return loadUsers();
  const currentUsers = loadUsers();
  const cleanCi = String(incoming.ci).trim().toUpperCase();
  const index = currentUsers.findIndex((u: any) => String(u.ci).trim().toUpperCase() === cleanCi);

  if (index >= 0) {
    const existing = currentUsers[index];
    const mergedVideoProgress = { ...(existing.videoProgress || {}) };
    if (incoming.videoProgress) {
      Object.keys(incoming.videoProgress).forEach(vidKey => {
        const existingVal = Number(mergedVideoProgress[vidKey]) || 0;
        const incomingVal = Number(incoming.videoProgress[vidKey]) || 0;
        mergedVideoProgress[vidKey] = Math.max(existingVal, incomingVal);
      });
    }
    const mergedExamAttempts = { ...(existing.examAttempts || {}) };

    if (incoming.examAttempts) {
      Object.keys(incoming.examAttempts).forEach(cat => {
        const incList = incoming.examAttempts[cat] || [];
        const exList = mergedExamAttempts[cat] || [];
        const combined = [...exList];
        incList.forEach((att: any) => {
          const isDup = combined.some((c: any) => c.date === att.date && c.score === att.score);
          if (!isDup) combined.push(att);
        });
        mergedExamAttempts[cat] = combined;
      });
    }

    currentUsers[index] = {
      ...existing,
      ...incoming,
      ci: cleanCi,
      videoProgress: mergedVideoProgress,
      examAttempts: mergedExamAttempts,
      lastUpdated: new Date().toISOString()
    };
  } else {
    currentUsers.push({
      ...incoming,
      ci: cleanCi,
      lastUpdated: new Date().toISOString()
    });
  }

  saveUsers(currentUsers);
  return currentUsers;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", service: "Plataforma SIMA SOBOCE" });
  });

  // GET /api/users: Return all users stored on server
  app.get("/api/users", (req, res) => {
    try {
      const users = loadUsers();
      res.json({ success: true, count: users.length, users });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/users: Create or update a single user or array of users
  app.post("/api/users", (req, res) => {
    try {
      const { user, users: bulkUsers } = req.body;
      if (!user && (!Array.isArray(bulkUsers) || bulkUsers.length === 0)) {
        return res.status(400).json({ success: false, message: "User or users array required" });
      }

      if (user) {
        upsertUserInStore(user);
      }
      if (Array.isArray(bulkUsers)) {
        bulkUsers.forEach(u => upsertUserInStore(u));
      }

      const currentUsers = loadUsers();
      res.json({ success: true, count: currentUsers.length, users: currentUsers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // DELETE /api/users/:ci: Delete a user by CI
  app.delete("/api/users/:ci", (req, res) => {
    try {
      const cleanCi = String(req.params.ci).trim().toUpperCase();
      let currentUsers = loadUsers();
      currentUsers = currentUsers.filter((u: any) => String(u.ci).trim().toUpperCase() !== cleanCi);
      saveUsers(currentUsers);
      res.json({ success: true, count: currentUsers.length, users: currentUsers });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/users/reset: Reset users list
  app.post("/api/users/reset", (req, res) => {
    try {
      saveUsers([]);
      res.json({ success: true, message: "Base de datos reiniciada con éxito." });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/sync/test: Test connection to Google Apps Script endpoint
  app.post("/api/sync/test", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, message: "La URL de Google Apps Script es requerida." });
      }

      console.log(`[Proxy Test] Probando URL de Google Apps Script: ${url}`);
      const testUrl = `${url}${url.includes('?') ? '&' : '?'}test=1&action=TEST_CONEXION`;
      
      const response = await fetch(testUrl, {
        method: 'GET',
        redirect: 'follow'
      });

      const responseText = await response.text();

      // Check if it redirected to Google Account sign-in (meaning not public/anyone)
      if (
        responseText.includes('accounts.google.com') || 
        responseText.includes('ServiceLogin') || 
        response.status === 401 || 
        responseText.includes('Page Not Found') || 
        responseText.includes('unable to open the file')
      ) {
        return res.json({
          success: false,
          status: response.status,
          code: 'AUTH_REQUIRED',
          message: "Google Apps Script requiere autenticación de Google (Error 401/Login). En Apps Script, debe implementar la aplicación web con 'Quién tiene acceso' (Who has access) configurado en 'Cualquiera' (Anyone)."
        });
      }

      if (response.status >= 200 && response.status < 400) {
        return res.json({
          success: true,
          status: response.status,
          message: "¡Conexión exitosa con Google Apps Script! La URL responde correctamente.",
          preview: responseText.slice(0, 150)
        });
      }

      return res.json({
        success: false,
        status: response.status,
        message: `El servidor de Google retornó status ${response.status}: ${responseText.slice(0, 150)}`
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Error de conexión física con Google: ${err.message}`
      });
    }
  });

  // API Route: Google Sheets Sync Proxy
  app.post("/api/sync", async (req, res) => {
    try {
      const { url, payload } = req.body;
      if (!url) {
        return res.status(400).json({ success: false, message: "Apps Script URL is required" });
      }
      if (!payload) {
        return res.status(400).json({ success: false, message: "Payload is required" });
      }

      // Automatically preserve user in server store as fallback
      if (payload.ci) {
        try {
          upsertUserInStore({
            ci: payload.ci,
            nombres: payload.nombres,
            apellidoPaterno: payload.apellidoPaterno,
            apellidoMaterno: payload.apellidoMaterno,
            empresa: payload.empresa,
            planta: payload.planta,
            rol: payload.rol,
            videoProgress: payload.rawProgress ? JSON.parse(payload.rawProgress) : {},
            examAttempts: payload.rawExamAttempts ? JSON.parse(payload.rawExamAttempts) : {}
          });
        } catch (e) {
          console.error('[Proxy Sync] Could not parse user for local DB upsert:', e);
        }
      }

      const targetSheet = payload.sheetName || (payload.action === 'AUTORIZANTE_PAEP_VISUALIZACIONES' ? 'AUTORIZANTE PAEP' : (payload.action === 'INDUCCION_VISUALIZACIONES' ? 'INDUCCION VISUALIZACIONES' : 'REGISTROS_SIMA'));

      console.log(`[Proxy Sync] Envíando webhook. Acción: ${payload.action}, Hoja: ${targetSheet} para CI: ${payload.ci}`);

      // Construct detailed query parameters for maximum script compatibility
      const queryParams = new URLSearchParams({
        ci: String(payload.ci || ''),
        action: String(payload.action || ''),
        hoja: String(targetSheet),
        sheet: String(targetSheet),
        nombres: String(payload.nombres || ''),
        paterno: String(payload.apellidoPaterno || ''),
        materno: String(payload.apellidoMaterno || ''),
        empresa: String(payload.empresa || ''),
        planta: String(payload.planta || ''),
        rol: String(payload.rol || ''),
        avance: `${payload.totalProgressPct || 0}%`,
        videos: String(payload.completedVideosList || payload.videoCount || ''),
        video_completado: String(payload.videoCompletedTitle || ''),
        videos_completados: String(payload.completedVideosList || payload.videoCount || ''),
        nota: String(payload.lastExamScore || 'N/A'),
        aprobado: payload.examPassed ? 'SI' : 'NO',
        estado: String(payload.lockoutState || 'ACTIVO'),
        fecha: new Date().toLocaleDateString('es-BO'),
        hora: new Date().toLocaleTimeString('es-BO')
      }).toString();

      const targetUrl = `${url}${url.includes('?') ? '&' : '?'}${queryParams}`;

      // 1. Try a standard POST request
      let gRes = null;
      let postSucceeded = false;
      let gText = '';
      try {
        gRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ...payload, sheetName: targetSheet, hoja: targetSheet }),
          redirect: 'follow'
        });
        gText = await gRes.text();

        if (
          gText.includes('accounts.google.com') || 
          gText.includes('ServiceLogin') || 
          gRes.status === 401 || 
          gText.includes('unable to open the file')
        ) {
          return res.status(401).json({
            success: false,
            code: 'AUTH_REQUIRED',
            message: "Google Apps Script requiere autenticación (Error 401). En Apps Script, vaya a 'Implementar' y configure 'Quién tiene acceso' como 'Cualquiera' (Anyone)."
          });
        }

        if (gRes.status >= 200 && gRes.status < 400) {
          postSucceeded = true;
          console.log(`[Proxy Sync] Google Sheets POST exitoso. Status: ${gRes.status}`);
        } else {
          console.log(`[Proxy Sync] Google Sheets POST retornó status no exitoso: ${gRes.status}`);
        }
      } catch (err: any) {
        console.error(`[Proxy Sync] Google Sheets POST falló físicamente: ${err.message}`);
      }

      if (postSucceeded) {
        return res.json({ success: true, message: `Sincronizado con éxito en hoja '${targetSheet}'.` });
      }

      // 2. Fallback to GET request if POST was rejected or failed
      console.log(`[Proxy Sync] Intentando fallback GET para URL: ${targetUrl}`);
      try {
        const getRes = await fetch(targetUrl, { method: 'GET', redirect: 'follow' });
        const getText = await getRes.text();
        console.log(`[Proxy Sync] Fallback GET completado. Status: ${getRes.status}`);

        if (
          getText.includes('accounts.google.com') || 
          getText.includes('ServiceLogin') || 
          getRes.status === 401 || 
          getText.includes('unable to open the file')
        ) {
          return res.status(401).json({
            success: false,
            code: 'AUTH_REQUIRED',
            message: "Google Apps Script requiere autenticación (Error 401). En Apps Script, vaya a 'Implementar' y configure 'Quién tiene acceso' como 'Cualquiera' (Anyone)."
          });
        }

        if (getRes.status >= 200 && getRes.status < 400) {
          return res.json({ success: true, message: `Sincronizado con éxito (GET) en '${targetSheet}'.` });
        }
        
        return res.status(500).json({ 
          success: false, 
          message: `El servidor de Google rechazó el envío (POST: ${gRes ? gRes.status : 'Error'}, GET: ${getRes.status})` 
        });
      } catch (getErr: any) {
        console.error(`[Proxy Sync] Fallback GET también falló: ${getErr.message}`);
        return res.status(500).json({ 
          success: false, 
          message: `Conexión fallida (POST y GET fallaron): ${getErr.message}` 
        });
      }

    } catch (error: any) {
      console.error("[Proxy Sync Error]:", error);
      return res.status(500).json({ success: false, message: error.message || "Error interno en el servidor proxy de sincronización." });
    }
  });

  // API Route: PAEP Technical Assistant Bot (powered by Gemini & SPT-GSS.SI.004)
  app.post("/api/paep-bot/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, message: "El mensaje es obligatorio." });
      }

      const client = getGeminiClient();

      if (client) {
        try {
          // Construct message contents
          const contents: any[] = [];
          if (Array.isArray(history)) {
            history.forEach(h => {
              if (h.role && h.text) {
                contents.push({
                  role: h.role === 'user' ? 'user' : 'model',
                  parts: [{ text: h.text }]
                });
              }
            });
          }
          contents.push({
            role: 'user',
            parts: [{ text: message }]
          });

          const generatePromise = client.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction: PROCEDIMIENTO_PAEP_CONTEXT,
              temperature: 0.3,
            }
          });

          // Timeout after 6 seconds to avoid blocking user if network latency occurs
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 6000));
          const response: any = await Promise.race([generatePromise, timeoutPromise]);

          const replyText = response.text || "No se pudo generar respuesta en este momento.";
          return res.json({
            success: true,
            reply: replyText
          });
        } catch (genError: any) {
          console.error("[Gemini API Error in PAEP Bot]:", genError.message);
          // Fall through to procedural fallback engine
        }
      }

      // Procedural Knowledge Fallback Engine (guarantees accurate, structured response even without active API key)
      const query = message.toLowerCase();
      let fallbackReply = "";

      if (query.includes("reglas de oro") || query.includes("electr") || query.includes("tensión") || query.includes("volt")) {
        fallbackReply = `### ⚡ 5 Reglas de Oro para Trabajos Eléctricos (Anexo 5 - NB 777)
Según el **Procedimiento SPT-GSS.SI.004 (Anexo 5)** y la **NB 777**, antes de intervenir cualquier instalación eléctrica se deben cumplir estrictamente:
1. **1º Regla de Oro: Corte visible de todas las fuentes de tensión** (abrir interruptores, guardamotores, portafusibles, asegurando que no haya circuitos bajo carga).
2. **2º Regla de Oro: Bloqueo y Etiquetado de Seguridad (LOTO)** (candado y tarjeta de bloqueo en los dispositivos de corte conforme SPT-GSS.SI.012).
3. **3º Regla de Oro: Reconocimiento de ausencia de tensión** con un detector de tensión comprobado. En media tensión usar adicionalmente guantes dieléctricos y protector facial.
4. **4º Regla de Oro: Cortocircuitar y poner a tierra** las fases mediante equipos portátiles de puesta a tierra.
5. **5º Regla de Oro: Señalizar y delimitar el área de trabajo** con conos, cintas o letreros de advertencia.
*Distancias mínimas:* Baja tensión (<1000V) a >1m; Media tensión (1-69kV) a >2.5m; Alta tensión (>69kV) a >4m.`;
      } else if (query.includes("altura") || query.includes("arnes") || query.includes("arnés") || query.includes("anclaje") || query.includes("caída") || query.includes("escalera") || query.includes("andamio") || query.includes("cabo")) {
        fallbackReply = `### 🧗 Trabajos en Altura (Anexo 3 - NTS 003/17, NTS 004/17, NTS 005/17)
De acuerdo al **Procedimiento SPT-GSS.SI.004 (Anexo 3)**:
- **Definición:** Todo trabajo a más de **1.8 metros** de la superficie con peligro de caída a distinto nivel sin protección fija colectiva.
- **Puntos de Anclaje:** Deben resistir al menos **4950 lb (22 kN)** por persona, situados preferentemente por encima de la cintura e independientes.
- **Cinta expansora / Cavo de vida (con amortiguador):** Obligatorio a partir de los **4 metros** de altura con doble cabo conectado a la argolla dorsal del arnés. A menos de 4m se usan bandas de posicionamiento.
- **Líneas de Vida:** Resistencia mínima de **5000 lb**. Máximo 2 personas en horizontal y 1 persona en vertical.
- **Escaleras (NTS 004/17):** Relación de inclinación **1 a 4 (75°)**, sobrepasar al menos **1 metro** del punto de desembarco, 3 puntos de apoyo permanente, no pisar los últimos 3 peldaños.
- **Andamios (NTS 005/17):** Deben soportar al menos **4 veces la carga**. Plataformas de ancho mínimo **70 cm**, tablones de 25-30 cm de ancho y 50 mm de espesor. Asegurar a estructura si la altura supera 4 veces el ancho de base. Barandas a 1.00m-1.15m y plintos de 15 cm.`;
      } else if (query.includes("espacio confinado") || query.includes("oxígeno") || query.includes("oxigeno") || query.includes("gas") || query.includes("vigilante") || query.includes("vigia") || query.includes("lel") || query.includes("ppm")) {
        fallbackReply = `### 🕳️ Trabajos en Espacios Confinados (Anexo 4 - NTS 008/17)
De acuerdo al **Procedimiento SPT-GSS.SI.004 (Anexo 4)**:
- **Monitoreo de Gases Obligatorio antes del ingreso:**
  1. **Oxígeno (O2):** Mínimo **19.5%** (rango seguro 19.5% a 23.5%).
  2. **Gases/Vapores Inflamables (LEL):** Menor al **10%** del Límite Inferior de Explosividad.
  3. **Monóxido de Carbono (CO):** Menor a **35 ppm** (partes por millón).
- **Temperatura:** Prohibido ingresar si la temperatura supera los **50°C**.
- **Vigilante Exterior:** Es obligatorio designar un "Vigilante" exclusivo en el exterior que monitoree continuamente a los trabajadores dentro del espacio confinado.
- **Bloqueo y Purga:** Detener y bloquear motores, compuertas y tuberías (LOTO). Si el ambiente es húmedo, la iluminación debe ser de **12 Voltios o menos**.`;
      } else if (query.includes("caliente") || query.includes("solda") || query.includes("amola") || query.includes("extintor") || query.includes("chispa")) {
        fallbackReply = `### 🔥 Trabajos en Caliente (Anexo 2 - NTP 494 / 495)
Conforme al **Procedimiento SPT-GSS.SI.004 (Anexo 2)**:
- **Ámbito:** Aplica a todo trabajo que genere fuentes de calor/chispas fuera de talleres de mantenimiento.
- **Extintor:** Obligatorio contar con un extintor tipo **ABC de por lo menos 6 kg** operable en el sitio.
- **Distancia a Combustibles:** Alejar materiales combustibles e inflamables a un mínimo de **11 metros** o proteger con mamparas/lonas ignífugas.
- **Atmósferas Explosivas:** Monitoreo previo de gases combustibles: LEL debe ser **menor al 10%**.
- **Botellones Oxiacetilénicos:** Deben estar señalizados con rombo **NFPA 704**, en posición vertical asegurada y con manoreductores en perfecto estado (prohibidos reconstruidos).`;
      } else if (query.includes("excava") || query.includes("zanja") || query.includes("talud") || query.includes("suelo") || query.includes("apuntala")) {
        fallbackReply = `### 🚜 Trabajos en Excavaciones y Zanjas (Anexo 6 - NTS 007/17)
Conforme al **Procedimiento SPT-GSS.SI.004 (Anexo 6)**:
- **Aplica Permiso de Trabajo (PT):** En zanjas o excavaciones de más de **0.80 metros** de profundidad.
- **Vías de escape / Escaleras:** Obligatorias a partir de **1.22 m** de profundidad, situadas a no más de **7.6 metros** de cualquier trabajador.
- **Protección Mecánica (Apuntalamiento/Encofrado):** Obligatorio a más de **1.60 m** de profundidad si no se realizan cortes con talud.
- **Taludes según Tipo de Suelo:**
  * **Suelo Clase A (Arcilla cohesiva):** Pendiente **3/4 : 1 (53°)**.
  * **Suelo Clase B (Limo, grava angular):** Pendiente **1 : 1 (45°)**.
  * **Suelo Clase C (Arena, grava suelta, agua/vibraciones):** Pendiente **1.5 : 1 (34°)**.
- **Borde de Excavación:** Escombros y materiales deben estar retirados al menos **60 cm** del borde. Distancia a tránsito vehicular: mínimo **3 metros**.`;
      } else if (query.includes("izaje") || query.includes("grúa") || query.includes("grua") || query.includes("crítico") || query.includes("critico") || query.includes("canastillo") || query.includes("eslinga")) {
        fallbackReply = `### 🏗️ Trabajos de Izaje y Grúas (Anexo 7 - NTP 208)
Conforme al **Procedimiento SPT-GSS.SI.004 (Anexo 7)**:
- **Factores y Seguridad:** Las eslingas y accesorios deben soportar al menos el **doble de la carga (factor 2)**. Todos los ganchos deben tener pestillo de seguridad operativo.
- **Condiciones Climáticas:** Detener maniobras con vientos superiores a **40 km/h**.
- **Distancia a Líneas Eléctricas:** Mantener una distancia mínima de **3 metros**.
- **Categorías de Izaje:**
  * **No Crítico Tipo 1:** Carga de 5 a 15 ton, menor al 70% de capacidad de la grúa.
  * **No Crítico Tipo 2:** Más de 15 ton, menor al 70%. Requiere Plan de Izaje aprobado por Supervisión SIMA GNP.
  * **Izaje Crítico:** Peso de la carga >= 75% de la capacidad de la grúa; o sobre procesos operativos/críticos; o izaje de personas en canastillo; o uso de más de una grúa; o tanques > 60 ton (Tipo B: > 20 ton en zonas peligrosas). **Requiere Plan de Izaje aprobado por Supervisión SIMA GNP.**
- **Canastillos de Personal:** Capacidad mínima de **135 kg por ocupante**, puerta que abre solo hacia adentro con traba, arnés al gancho, y pruebas no destructivas (NDT tintas penetrantes) cada **2 años** en soldaduras críticas.`;
      } else if (query.includes("revalida") || query.includes("vigencia") || query.includes("validez") || query.includes("duración") || query.includes("correlativo")) {
        fallbackReply = `### 📋 Validez y Revalidación de Permisos de Trabajo (Numeral 6.2 y 6.4)
Según el **Procedimiento SPT-GSS.SI.004**:
- **Validez Regular:** Un Permiso de Trabajo (PT) solo tiene validez por **UNA JORNADA DE TRABAJO** (según horarios de planta) y para un **lugar específico**.
- **Número Correlativo:** Asignado diariamente por el Responsable SI.
- **Revalidación (Numeral 6.4):** Solo aplica cuando se cumplen simultáneamente:
  1. Mantenimientos mayores, paradas de planta/emergencia, o la actividad se realiza en el mismo lugar y condiciones.
  2. Los "Solicitantes" y "Autorizantes PAEP" sean los mismos.
- **Requisitos de Revalidación:** Charla de 5 minutos, firma en la casilla de revalidación del PT y solicitud de nuevo correlativo diario al Responsable SI.`;
      } else {
        fallbackReply = `### 📘 Procedimiento Oficial de Permisos de Trabajo SOBOCE (SPT-GSS.SI.004 Rev 05)
El procedimiento regula la emisión de permisos de trabajo de alto riesgo en Planta Viacha y sitios SOBOCE:
- **APRI (Análisis Preliminar de Riesgos e Impactos):** Obligatorio para todos los permisos, llenado por el Solicitante y validado in situ por el PAEP.
- **Roles:** El Solicitante ejecuta y custodia el PT físicamente en el lugar; el Autorizante PAEP verifica in situ y firma la autorización; el Responsable SI asigna correlativos y archiva.
- **Áreas Críticas Cubiertas:**
  * Trabajos en Altura (>1.8m, anclajes 4950 lb, cinta expansora a partir de 4m) - Anexo 3.
  * Espacios Confinados (O2 >= 19.5%, LEL < 10%, CO < 35 ppm, temp < 50°C, vigía) - Anexo 4.
  * Trabajos en Caliente (extintor ABC 6kg, 11m a combustibles, LEL < 10%) - Anexo 2.
  * Trabajos Eléctricos (5 Reglas de Oro, NB 777) - Anexo 5.
  * Excavaciones (>0.80m requiere PT, salidas a 1.22m, taludes y entibados >1.6m) - Anexo 6.
  * Izajes y Grúas (vientos < 40 km/h, factor 2 en eslingas, izaje crítico con Plan SIMA GNP) - Anexo 7.
*Puedes preguntarme sobre cualquiera de estos temas o sobre un caso específico de tu labor como Autorizante PAEP.*`;
      }

      return res.json({
        success: true,
        reply: fallbackReply
      });

    } catch (error: any) {
      console.error("[PAEP Bot Error]:", error);
      return res.status(500).json({ success: false, message: error.message || "Error interno en el asistente PAEP." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

