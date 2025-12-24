import { useState, useEffect } from 'react';
import { Cookie, X } from 'lucide-react';

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Проверяем, соглашался ли юзер раньше
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Делаем небольшую задержку для плавности
      setTimeout(() => setIsVisible(true), 1000);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[200] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900/95 border border-cyan-500/30 backdrop-blur-md p-5 rounded-2xl shadow-2xl relative">
        
        {/* Кнопка закрытия (крестик) */}
        <button 
          onClick={handleAccept} 
          className="absolute top-2 right-2 text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-cyan-900/50 rounded-lg shrink-0">
            <Cookie className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">Мы используем Cookie</h4>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              Чтобы сохранять ваш прогресс, настройки и вход в систему. Мы не передаем данные третьим лицам.
            </p>
          </div>
        </div>

        <button 
          onClick={handleAccept}
          className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-cyan-900/20"
        >
          Хорошо, я понял
        </button>
      </div>
    </div>
  );
}