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

export function CompanionChat({ onClose, problemContext }: Props) {
  const { profile } = useAuth();
  const companionName = profile?.companion_name || 'Сурикат';
  
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'meerkat', parts: `Привет, коллега! Застрял на этой задаче? Давай разберем её вместе. Что именно непонятно?` }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const userMsg = input;
    setInput('');
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'me', parts: userMsg }]);
    
    setIsThinking(true);

    const answer = await askMeerkat(messages, userMsg, companionName, problemContext);

    setIsThinking(false);
    
    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'meerkat', parts: answer }]);
  };

  const getSprite = () => {
    if (isThinking) return '/meerkat/thinking.png';
    return '/meerkat/idle.png';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-4xl h-[80vh] sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
        
        {/* ЛЕВАЯ ЧАСТЬ: ЧАТ */}
        <div className="flex-1 flex flex-col h-full bg-slate-900/50">
          <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30">
                <Sparkles className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">{companionName}</h3>
                <p className="text-xs text-cyan-400">Твой ассистент в познании тонкостей математики</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.role === 'me' 
                    ? 'bg-cyan-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                }`}>
                  {/* ВОТ ТУТ МАГИЯ LATEX */}
                  {msg.parts.split('\n').map((line, i) => (
                    <p key={i} className="mb-1 min-h-[1.2em]">
                      <Latex>{line}</Latex>
                    </p>
                  ))}
                </div>
              </div>
            ))}
            
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

          <form onSubmit={handleSend} className="p-4 border-t border-slate-700 bg-slate-800">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Спроси совета..."
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
        <div className="hidden md:flex w-72 bg-gradient-to-b from-slate-800 to-slate-900 border-l border-slate-700 flex-col items-center justify-end relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.2),transparent_70%)]" />
          
          <img 
            src={getSprite()} 
            alt="Companion" 
            className={`w-64 h-64 object-contain z-10 mb-[-20px] transition-all duration-300 ${isThinking ? 'animate-pulse scale-105' : 'hover:scale-105'}`}
          />
          
          {isThinking && (
            <div className="absolute top-10 right-4 bg-white text-black text-xs font-bold px-3 py-2 rounded-xl rounded-bl-none animate-bounce shadow-lg z-20 max-w-[150px]">
              Хм-м, дай подумать... 🤔
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
