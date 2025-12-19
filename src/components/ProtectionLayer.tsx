import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AlertTriangle } from 'lucide-react';

export function ProtectionLayer({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [isBlurred, setIsBlurred] = useState(false);
  const [warningCount, setWarningCount] = useState(0);

  useEffect(() => {
    // 1. ЗАПРЕТ КОНТЕКСТНОГО МЕНЮ (ПКМ)
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    // 2. ЗАПРЕТ ГОРЯЧИХ КЛАВИШ (Копирование, Скриншот на ПК)
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen
      if (e.key === 'PrintScreen') {
        alert('Внимание! Создание скриншотов нарушает правила. Ваш аккаунт может быть заблокирован.');
        copyToClipboard("Скриншоты запрещены!"); // Портим буфер обмена
      }
      // Ctrl+C, Ctrl+Shift+S, F12
      if ((e.ctrlKey && e.key === 'c') || (e.metaKey && e.key === 'c') || e.key === 'F12') {
        e.preventDefault();
      }
    };

    // 3. БЛЮР ПРИ ПЕРЕКЛЮЧЕНИИ ВКЛАДОК (Защита от списывания)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsBlurred(true);
        setWarningCount(prev => prev + 1);
        document.title = "⚠️ ВЕРНИТЕСЬ В ТЕСТ!";
      } else {
        setIsBlurred(false);
        document.title = "MathLab PvP";
      }
    };

    // Для мобилок (потеря фокуса)
    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  };

  return (
    <div className="relative w-full h-full select-none" style={{ WebkitUserSelect: 'none' }}>
      
      {/* КОНТЕНТ (Размывается при нарушении) */}
      <div className={`transition-all duration-300 ${isBlurred ? 'blur-xl opacity-0' : 'blur-0 opacity-100'}`}>
        {children}
      </div>

      {/* ЭКРАН БЛОКИРОВКИ (ПРИ УХОДЕ) */}
      {isBlurred && (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center text-center p-8">
          <AlertTriangle className="w-24 h-24 text-red-500 mb-6 animate-bounce" />
          <h2 className="text-3xl font-black text-white uppercase mb-4">Внимание!</h2>
          <p className="text-slate-400 max-w-md">
            Вы покинули окно приложения. <br/>
            Это действие фиксируется как попытка нечестной игры.
          </p>
          <div className="mt-8 text-red-500 font-mono border border-red-900 bg-red-900/20 px-4 py-2 rounded">
            ПРЕДУПРЕЖДЕНИЕ #{warningCount}
          </div>
          <p className="mt-4 text-xs text-slate-600">Нажмите на экран, чтобы вернуться</p>
        </div>
      )}

      {/* ВОДЯНЫЕ ЗНАКИ (Сетка поверх всего) */}
      <div className="pointer-events-none fixed inset-0 z-[50] overflow-hidden opacity-[0.03]" style={{ zIndex: 9999 }}>
        <div className="grid grid-cols-3 gap-12 rotate-[-20deg] scale-150 w-[200%] h-[200%] -ml-[50%] -mt-[50%]">
          {Array.from({ length: 40 }).map((_, i) => (
             <div key={i} className="text-white text-xl font-black whitespace-nowrap">
               {profile?.username || 'MathLab User'} • {profile?.id?.slice(0, 8) || 'ID'}
             </div>
          ))}
        </div>
      </div>

    </div>
  );
}