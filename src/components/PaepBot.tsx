import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, Send, Sparkles, BookOpen, AlertTriangle, ShieldCheck, 
  RotateCcw, ChevronDown, ChevronUp, Zap, HelpCircle, MessageSquare
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: string;
}

interface PaepBotProps {
  userName?: string;
  userCi?: string;
  onProceedToExam?: () => void;
}

const QUICK_QUESTIONS = [
  {
    label: "⚡ 5 Reglas de Oro (Eléctrico)",
    query: "¿Cuáles son las 5 Reglas de Oro para trabajos eléctricos según el procedimiento y la NB 777?"
  },
  {
    label: "🧗 Trabajos en Altura",
    query: "¿A partir de qué altura se exige arnés y cuándo se debe usar cinta expansora o amortiguador de caída?"
  },
  {
    label: "🕳️ Gases en Espacios Confinados",
    query: "¿Cuáles son los valores permisibles de oxígeno, LEL, monóxido de carbono y temperatura en espacios confinados?"
  },
  {
    label: "🚜 Excavaciones y Taludes",
    query: "¿Cuándo se requiere Permiso de Trabajo para excavaciones y cuáles son las pendientes de taludes según tipo de suelo?"
  },
  {
    label: "🔥 Trabajos en Caliente",
    query: "¿Qué requisitos se exigen para trabajos en caliente fuera de talleres (extintor, distancias a combustibles)?"
  },
  {
    label: "🏗️ Izajes Críticos y Canastillos",
    query: "¿Cuándo se clasifica un izaje como crítico y qué condiciones deben cumplir los canastillos para personas?"
  },
  {
    label: "📋 Revalidación de Permisos",
    query: "¿Bajo qué condiciones específicas se puede revalidar un Permiso de Trabajo y qué validez tiene?"
  }
];

export default function PaepBot({ userName, onProceedToExam }: PaepBotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `¡Hola ${userName ? userName.split(' ')[0] : 'Autorizante'}! Felicitaciones por completar todos los videos de capacitación de **Autorizante PAEP**.\n\nSoy el **Bot Asistente Técnico PAEP** de SOBOCE S.A. Estoy entrenado en el **Procedimiento Oficial SPT-GSS.SI.004 (Revisión 05)** y en las **Normas Técnicas de Seguridad de Bolivia (NTS 003/17, NTS 004/17, NTS 005/17, NTS 007/17, NTS 008/17, NB 777 y DL 16998)**.\n\nPuedes hacerme cualquier consulta técnica antes de rendir tu examen o para aplicar en tus labores en Planta.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      // Build history for context
      const history = messages.slice(-6).map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        text: m.text
      }));

      const res = await fetch('/api/paep-bot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          history
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        const botMsg: Message = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        throw new Error(data.message || 'Error al procesar consulta');
      }
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: `Lo siento, ocurrió una dificultad técnica al consultar la base de conocimientos (${err.message || 'Sin conexión'}). Por favor intenta reformular tu pregunta.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'bot',
        text: `Conversación reiniciada. Puedes consultar cualquier duda técnica sobre el Procedimiento de Permisos de Trabajo SOBOCE (SPT-GSS.SI.004) y la normativa boliviana aplicable.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  return (
    <div id="paep-bot-container" className="bg-slate-900 border-2 border-emerald-500/30 rounded-2xl shadow-xl overflow-hidden mb-8">
      {/* Bot Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-5 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 shadow-inner">
            <Bot className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white tracking-wide">
                Bot Asistente Técnico PAEP
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> IA Activa
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Procedimiento SPT-GSS.SI.004 Rev 05 &bull; Normativa Boliviana (NTS 003/004/005/007/008, NB 777)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onProceedToExam && (
            <button
              onClick={onProceedToExam}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Rendir Examen</span>
            </button>
          )}
          <button
            onClick={handleResetChat}
            title="Reiniciar chat"
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Limpiar
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title={isExpanded ? "Minimizar" : "Expandir"}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Quick Prompts Carousel */}
          <div className="bg-slate-950/60 px-5 py-3 border-b border-slate-800">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Consultas Frecuentes del Procedimiento SOBOCE:
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(q.query)}
                  disabled={loading}
                  className="text-xs whitespace-nowrap bg-slate-800 hover:bg-emerald-950/60 text-slate-200 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 rounded-full px-3 py-1 transition cursor-pointer disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-80 overflow-y-auto p-5 space-y-4 bg-slate-950/30">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'bot' && (
                  <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/80 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-wrap">
                    {m.text}
                  </div>
                  <span
                    className={`block text-[10px] mt-1.5 ${
                      m.sender === 'user' ? 'text-emerald-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-800 text-slate-300 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
                  <span className="text-xs text-slate-400 ml-1">Consultando normativa y procedimiento SPT-GSS.SI.004...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-4 bg-slate-900 border-t border-slate-800 flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta sobre el procedimiento de Permisos de Trabajo o normativa..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium text-sm rounded-xl transition flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed shadow-md"
            >
              <Send className="w-4 h-4" />
              <span>Preguntar</span>
            </button>
          </form>
        </>
      )}
    </div>
  );
}
