import { useState, useEffect, useRef } from 'react';
import { askMeerkat } from '../lib/gemini';
import { useAuth } from '../contexts/AuthContext';
import { X, Send, Sparkles } from 'lucide-react';
// ИМПОРТЫ ДЛЯ МАТЕМАТИКИ
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

// БЫСТРЫЕ ВОПРОСЫ
const QUICK_QUESTIONS = [
  "Как решить эту задачу?",
  "Дай подсказку, но не ответ",
  "Какую формулу использовать?",
  "Объясни проще, для чайников",
  "В чем тут подвох?"
];

export function CompanionChat({ onClose, problemContext }: Props) {
  const { profile } = useAuth();
  const companionName = profile?.companion_name || 'Сурикат';
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'meerkat', parts: `Привет, коллега! Застрял на этой задаче? Давай разберем её вместе. Что именно непонятно?` }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автоскролл вниз
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ОТПРАВКИ
  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;

    // 1. Добавляем сообщение юзера
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'me', parts: text }]);
    setIsThinking(true);

    // 2. Запрос к Gemini
    const answer = await askMeerkat(messages, text, companionName, problemContext);

    setIsThinking(false);
    
    // 3. Добавляем ответ суриката
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'meerkat', parts: answer }]);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
    setInput('');
  };

  // Выбор картинки (Думает или Обычный)
  const getSprite = () => {
    if (isThinking) return '/meerkat/thinking.png';
    return '/meerkat/idle.png';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4">
      <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-5xl h-[85vh] md:h-[80vh] md:rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
        
        {/* === ЛЕВАЯ ЧАСТЬ: ЧАТ === */}
        <div className="flex-1 flex flex-col h-full bg-slate-900/50 min-w-0">
          
          {/* Шапка */}
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{companionName}</h3>
                <p className="text-xs text-cyan-400">Компаньон Лаборатории</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Список сообщений */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'me' 
                    ? 'bg-cyan-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                }`}>
                  {/* Рендер текста + формул */}
                  {msg.parts.split('\n').map((line, i) => (
                    <p key={i} className="mb-1 min-h-[1em]">
                      <Latex>{line}</Latex>
                    </p>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Анимация "Печатает..." */}
            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 rounded-bl-none flex gap-2 items-center">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Панель быстрых вопросов (Чипы) */}
          <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide bg-slate-900/90 border-t border-slate-800 shrink-0">
             {QUICK_QUESTIONS.map((q, i) => (
               <button
                 key={i}
                 onClick={() => sendMessage(q)}
                 disabled={isThinking}
                 className="whitespace-nowrap px-3 py-1.5 bg-slate-800 border border-cyan-500/30 rounded-full text-xs text-cyan-300 hover:bg-cyan-500/10 hover:border-cyan-400 transition-all disabled:opacity-50 active:scale-95"
               >
                 {q}
               </button>
             ))}
          </div>

          {/* Форма ввода */}
          <form onSubmit={handleFormSubmit} className="p-4 border-t border-slate-700 bg-slate-800 shrink-0">
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

        {/* === ПРАВАЯ ЧАСТЬ: ВИЗУАЛ СУРИКАТА (На мобильных скрыт) === */}
        <div className="hidden md:flex w-80 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 flex-col items-center justify-end relative overflow-hidden shrink-0">
          
          {/* Фон */}
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.2),transparent_70%)]" />
          
          {/* СУРИКАТ */}
          <div className={`relative z-10 mb-[-20px] transition-all duration-300 ${isThinking ? 'scale-105' : 'hover:scale-105'}`}>
             <img 
               src={getSprite()} 
               alt="Companion" 
               className="w-72 h-72 object-contain mix-blend-screen"
               // Если нет thinking.png, ставим idle.png
               onError={(e) => { e.currentTarget.src='/meerkat/idle.png'; }}
             />
          </div>
          
          {/* Облачко с мыслями (Только когда думает) */}
          {isThinking && (
            <div className="absolute top-12 right-6 bg-white text-black text-xs font-bold px-4 py-3 rounded-2xl rounded-bl-none animate-bounce shadow-xl z-20 max-w-[160px] border-2 border-cyan-500">
              Хм-м, дай подумать... 🤔
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
