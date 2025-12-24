import { useState, useEffect, useRef } from 'react';
import { askMeerkat } from '../lib/gemini';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, Sparkles, Utensils } from 'lucide-react'; // Добавил иконку еды
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';

type Props = {
  onClose: () => void;
  problemContext: string;
};

type Message = {
  id: string;
  role: 'me' | 'meerkat';
  parts: string;
};

const QUICK_QUESTIONS = [
  "Как решить эту задачу?",
  "Какую формулу использовать?",
  "Объясни проще, для чайников",
  "В чем тут подвох?"
];

export function CompanionChat({ onClose, problemContext }: Props) {
  const { profile } = useAuth();
  const companionName = profile?.companion_name || 'Сурикат';
  const hunger = profile?.companion_hunger ?? 100; // Получаем голод
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'meerkat', parts: `Привет, коллега! Застрял на этой задаче? Давай разберем её вместе.` }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;

    // 1. Добавляем сообщение юзера
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'me', parts: text }]);
    
    // === ПРОВЕРКА ГОЛОДА ===
    if (hunger <= 0) {
      setIsThinking(true);
      
      // Имитируем задержку, будто он пытается думать, но не может
      setTimeout(() => {
        setIsThinking(false);
        const sadMessage = "Ох... Урчание в животе заглушает все мои мысли! 🍖\n\nКоллега, я слишком голоден (0%), чтобы делать вычисления. Пожалуйста, покорми меня в Домике, и мы продолжим!";
        
        setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'meerkat', parts: sadMessage }]);
      }, 1000);
      
      return; // ПРЕРЫВАЕМ ФУНКЦИЮ, НЕ ТРАТИМ API
    }
    // =======================

    setIsThinking(true);

    // 2. Запрос к Gemini (только если сыт)
    const answer = await askMeerkat(messages, text, companionName, problemContext);

    setIsThinking(false);
    
    // 3. Добавляем ответ
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'meerkat', parts: answer }]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
    setInput('');
  };

  // Выбор спрайта
  const getSprite = () => {
    // Если голоден (0%) — он плачет
    if (hunger <= 0) return '/meerkat/crying.png';
    
    if (isThinking) return '/meerkat/thinking.png';
    return '/meerkat/idle.png';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
      <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-5xl h-[90vh] md:h-[80vh] md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 relative">
        
        {/* ЛЕВАЯ ЧАСТЬ: ЧАТ */}
        <div className="flex-1 flex flex-col h-full bg-slate-900/50 min-w-0 z-10 relative">
          
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{companionName}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-cyan-400">ИИ-Ассистент</p>
                  {/* Индикатор голода в шапке */}
                  <div className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${hunger <= 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                    <Utensils className="w-3 h-3" /> {hunger}%
                  </div>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'me' 
                    ? 'bg-cyan-600 text-white rounded-br-none' 
                    : 'bg-slate-700 text-white border border-slate-600 rounded-bl-none'
                }`}>
                  {msg.parts.split('\n').map((line, i) => (
                    <p key={i} className="mb-1 min-h-[1em]">
                      <Latex>{line}</Latex>
                    </p>
                  ))}
                </div>
              </div>
            ))}
            
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 rounded-bl-none flex gap-2 items-center backdrop-blur-sm">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-800 bg-slate-900/90 backdrop-blur-sm shrink-0 z-20">
             <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3 px-4 w-full touch-pan-x">
               {QUICK_QUESTIONS.map((q, i) => (
                 <button
                   key={i}
                   onClick={() => sendMessage(q)}
                   disabled={isThinking}
                   className="whitespace-nowrap flex-shrink-0 px-4 py-2 bg-slate-800 border border-cyan-500/30 rounded-full text-xs text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all disabled:opacity-50 active:scale-95"
                 >
                   {q}
                 </button>
               ))}
               <div className="w-8 flex-shrink-0" />
             </div>
          </div>

          <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-700 bg-slate-800 shrink-0 z-20">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Напиши вопрос..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500 transition-colors"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={!input.trim() || isThinking}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white p-3 rounded-xl transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>

        {/* ПРАВАЯ ЧАСТЬ: ВИЗУАЛ СУРИКАТА */}
        <div className={`
            absolute bottom-[140px] right-[-20px] w-40 h-40 z-0 pointer-events-none opacity-100
            md:static md:w-80 md:h-full md:opacity-100 md:bg-gradient-to-b md:from-slate-800 md:to-slate-900 md:border-l md:border-slate-700
            flex flex-col items-center justify-end overflow-hidden shrink-0 transition-all duration-300
        `}>
          
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.2),transparent_70%)] hidden md:block" />
          
          <div className={`relative z-10 mb-[-10px] md:mb-[-20px] transition-all duration-300 ${isThinking ? 'scale-105' : 'hover:scale-105'}`}>
             <img 
               src={getSprite()} 
               alt="Companion" 
               className="w-40 h-40 md:w-72 md:h-72 object-contain mix-blend-screen drop-shadow-2xl"
               onError={(e) => { e.currentTarget.src='/meerkat/idle.png'; }}
             />
          </div>
          
          {/* Облачко с мыслями */}
          {isThinking && hunger > 0 && (
            <div className="absolute top-0 right-10 md:top-12 md:right-6 bg-white text-black text-xs font-bold px-3 py-2 rounded-2xl rounded-bl-none animate-bounce shadow-xl z-20 max-w-[120px] md:max-w-[160px] border-2 border-cyan-500">
              Хм-м... 🤔
            </div>
          )}

          {/* Облачко с ГОЛОДОМ */}
          {hunger <= 0 && (
             <div className="absolute top-0 right-10 md:top-12 md:right-6 bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-2xl rounded-bl-none animate-pulse shadow-xl z-20 max-w-[120px] md:max-w-[160px]">
               ХОЧУ ЕСТЬ! 🍖
             </div>
          )}
        </div>

      </div>
    </div>
  );
}