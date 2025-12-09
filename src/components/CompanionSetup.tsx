import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Scan, Save, Sparkles, Binary } from 'lucide-react';

type Props = {
  onComplete: () => void;
};

export function CompanionSetup({ onComplete }: Props) {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState<'scan' | 'found' | 'naming'>('scan');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Сцена Сканирования
  if (step === 'scan') {
    return (
      <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-1000">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
          <Scan className="w-24 h-24 text-cyan-400 relative z-10 animate-spin-slow duration-[3s]" />
        </div>
        <h2 className="text-2xl font-mono text-cyan-400 mt-8 mb-2 animate-pulse">СКАНИРОВАНИЕ ОТСЕКА...</h2>
        <p className="text-slate-400 max-w-md">
          Система безопасности обнаружила неопознанную биологическую активность в вентиляции Сектора 0.
        </p>
        <button 
          onClick={() => setStep('found')}
          className="mt-8 px-8 py-3 bg-slate-800 border border-cyan-500/50 text-cyan-400 rounded-xl hover:bg-cyan-900/30 transition-all font-mono"
        >
          ИССЛЕДОВАТЬ ОБЪЕКТ
        </button>
      </div>
    );
  }

  // 2. Сцена Находки
  if (step === 'found') {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-amber-500/20 blur-2xl rounded-full" />
          {/* ЗАМЕНИ SRC НА КАРТИНКУ ВАШЕГО СУРИКАТА */}
          <div className="w-48 h-48 bg-slate-800 rounded-full border-4 border-amber-500 flex items-center justify-center overflow-hidden shadow-2xl relative z-10">
             <span className="text-8xl">🦦</span> 
             {/* <img src="/meerkat.png" alt="Сурикат" className="w-full h-full object-cover" /> */}
          </div>
          <div className="absolute bottom-0 right-0 bg-slate-900 p-2 rounded-full border border-slate-700">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">Это... Сурикат?</h2>
        <p className="text-slate-300 max-w-md mb-8 leading-relaxed">
          Удивительно! Этот малыш прятался здесь и решал уравнения на стенах. 
          Кажется, он хочет стать твоим ассистентом в лаборатории.
        </p>

        <button 
          onClick={() => setStep('naming')}
          className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition-transform"
        >
          ЗАРЕГИСТРИРОВАТЬ СПУТНИКА
        </button>
      </div>
    );
  }

  // 3. Сцена Имени
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setLoading(true);

    // Сохраняем имя в профиль
    await supabase.from('profiles').update({ companion_name: name }).eq('id', user.id);
    
    // Обновляем контекст, чтобы имя появилось везде
    await refreshProfile();
    
    setLoading(false);
    onComplete(); // Завершаем
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-slate-800 border border-amber-500/30 rounded-2xl p-8 shadow-2xl text-center">
        <div className="w-20 h-20 bg-slate-900 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-amber-500/50">
          <span className="text-4xl">🦦</span>
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Новый сотрудник</h2>
        <p className="text-slate-400 text-sm mb-6">
          Придумайте имя для вашего напарника. Оно будет отображаться в вашем личном деле.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Альфред, Пифагор..."
            className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-center text-xl text-white focus:border-amber-500 outline-none transition-colors"
            maxLength={15}
          />
          
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'СОХРАНЕНИЕ...' : <> <Save className="w-5 h-5" /> ПОДТВЕРДИТЬ </>}
          </button>
        </form>
      </div>
    </div>
  );
}