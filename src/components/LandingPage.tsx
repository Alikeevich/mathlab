import { useState } from 'react'; // Добавили useState
import { ArrowRight, Zap, Shield, Trophy, Mail, Check } from 'lucide-react'; // Добавили Check
import Squares from './Squares';

type Props = {
  onStartDemo: () => void;
  onLogin: () => void;
  onOpenLegal: (type: 'privacy' | 'terms') => void;
};

export function LandingPage({ onStartDemo, onLogin, onOpenLegal }: Props) {
  // Состояние для анимации копирования
  const [copied, setCopied] = useState(false);

  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // 1. Копируем в буфер
    navigator.clipboard.writeText('support@mathlabpvp.org');
    
    // 2. Показываем галочку
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    // 3. Пытаемся открыть почту (для тех, у кого есть Outlook)
    window.location.href = 'mailto:support@mathlabpvp.org';
  };

  return (
    <div className="min-h-screen bg-[#0f172a] relative overflow-hidden flex flex-col items-center justify-center text-white font-sans selection:bg-cyan-500/30">
      
      {/* Анимированный Фон */}
      <div className="absolute inset-0 z-0 opacity-40">
        <Squares 
          speed={0.3} 
          squareSize={50}
          direction='diagonal'
          borderColor='#334155'
          hoverFillColor='#22d3ee'
        />
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center w-full flex flex-col min-h-screen justify-center">
        
        <div className="flex-1 flex flex-col justify-center pt-20">
          {/* Логотип */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-900/30 border border-cyan-500/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 backdrop-blur-md mx-auto">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-sm font-bold tracking-widest uppercase">MathLab PvP v1.0</span>
          </div>

          {/* Заголовок */}
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-4 duration-1000 drop-shadow-2xl">
            Подготовка к ЕНТ <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">нового поколения</span>
          </h1>

          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            Забудь про скучные учебники. Прокачивай своего персонажа, сражайся с друзьями на PvP-арене и участвуй в школьных турнирах.
          </p>

          {/* Кнопки */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <button 
              onClick={onStartDemo}
              className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-cyan-50 font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105"
            >
              Попробовать Демо <ArrowRight className="w-5 h-5" />
            </button>
            
            <button 
              onClick={onLogin}
              className="w-full sm:w-auto px-8 py-4 bg-slate-800/80 backdrop-blur-md border border-slate-600 hover:border-cyan-500/50 text-white font-bold rounded-xl text-lg transition-all hover:bg-slate-700"
            >
              Войти в аккаунт
            </button>
          </div>

          {/* Фичи */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left animate-in fade-in duration-1000 delay-500">
            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md hover:bg-slate-800/60 transition-colors">
              <Trophy className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">PvP Битвы</h3>
              <p className="text-slate-400 text-sm">Вызывай друзей на дуэль и докажи, кто лучше знает математику.</p>
            </div>
            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md hover:bg-slate-800/60 transition-colors">
              <Zap className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Живой Питомец</h3>
              <p className="text-slate-400 text-sm">Найди суриката, ухаживай за ним и получай подсказки в решении.</p>
            </div>
            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md hover:bg-slate-800/60 transition-colors">
              <Shield className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">Турниры</h3>
              <p className="text-slate-400 text-sm">Участвуй в классных и школьных турнирах с реальной сеткой.</p>
            </div>
          </div>
        </div>

        {/* ФУТЕР */}
        <div className="mt-12 mb-6 pt-6 border-t border-slate-800/60 w-full animate-in fade-in delay-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            
            <div className="flex flex-col md:flex-row items-center gap-4 text-slate-500 text-sm">
              <p>© {new Date().getFullYear()} MathLab PvP. All rights reserved.</p>
              
              <div className="flex gap-4 text-xs font-medium">
                <button onClick={() => onOpenLegal('privacy')} className="hover:text-cyan-400 transition-colors underline decoration-slate-700 underline-offset-4">
                  Политика конфиденциальности
                </button>
                <button onClick={() => onOpenLegal('terms')} className="hover:text-amber-400 transition-colors underline decoration-slate-700 underline-offset-4">
                  Условия использования
                </button>
              </div>
            </div>
            
            {/* УМНАЯ КНОПКА ПОЧТЫ */}
            <button 
              onClick={handleEmailClick}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-800 hover:text-cyan-400 transition-all border border-transparent hover:border-slate-700 text-sm text-slate-400 group"
              title="Нажмите, чтобы скопировать"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="font-mono text-emerald-400">Скопировано!</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span className="font-mono">support@mathlabpvp.org</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}