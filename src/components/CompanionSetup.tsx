import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Scan, Save, Sparkles } from 'lucide-react';

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
          <Scan className="w-32 h-32 text-cyan-400 relative z-10 animate-spin-slow duration-[4s]" />
        </div>
        <h2 className="text-3xl font-black font-mono text-cyan-400 mt-8 mb-2 animate-pulse tracking-widest">
          СКАНИРОВАНИЕ...
        </h2>
        <p className="text-slate-400 max-w-md font-mono text-sm">
          Обнаружена биологическая активность в секторе. Идентификация объекта.
        </p>
        <button 
          onClick={() => setStep('found')}
          className="mt-12 px-10 py-4 bg-slate-900 border border-cyan-500/50 text-cyan-400 rounded-xl hover:bg-cyan-900/20 hover:scale-105 transition-all font-mono font-bold shadow-[0_0_20px_rgba(6,182,212,0.3)]"
        >
          ИССЛЕДОВАТЬ СИГНАЛ
        </button>
      </div>
    );
  }

  // 2. Сцена Находки
  if (step === 'found') {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
        <div className="relative mb-8">
          {/* Свечение сзади */}
          <div className="absolute -inset-10 bg-amber-500/20 blur-3xl rounded-full" />
          
          {/* Контейнер для картинки */}
          <div className="w-64 h-64 bg-gradient-to-b from-slate-800 to-slate-900 rounded-full border-4 border-amber-500/50 flex items-center justify-center shadow-2xl relative z-10 p-6">
             {/* ЧИСТЫЙ PNG СУРИКАТА */}
             <img 
               src="/meerkat/idle.png" 
               alt="Сурикат" 
               className="w-full h-full object-contain drop-shadow-2xl hover:scale-110 transition-transform duration-500 cursor-pointer" 
             />
          </div>
          
          <div className="absolute bottom-0 right-0 bg-slate-800 p-3 rounded-full border border-amber-500/50 z-20 shadow-lg">
            <Sparkles className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
        </div>

        <h2 className="text-4xl font-black text-white mb-4">Это... Сурикат?</h2>
        <p className="text-slate-300 max-w-md mb-10 leading-relaxed text-lg">
          Удивительно! Этот малыш прятался здесь и решал уравнения на стенах. 
          Кажется, он хочет стать твоим ассистентом в лаборатории.
        </p>

        <button 
          onClick={() => setStep('naming')}
          className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold text-xl rounded-2xl shadow-lg hover:scale-105 transition-transform hover:shadow-orange-500/40"
        >
          ЗАРЕГИСТРИРОВАТЬ
        </button>
      </div>
    );
  }

  // 3. Сцена Имени (Сохранение)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !user) return;
    setLoading(true);

    try {
      // Сохраняем имя и начальные статы
      await supabase.from('profiles').update({ 
        companion_name: name,
        companion_level: 1,
        companion_xp: 0,
        companion_hunger: 100
      }).eq('id', user.id);
      
      // Обновляем контекст, чтобы имя появилось везде
      await refreshProfile();
      
      setLoading(false);
      onComplete(); // Завершаем
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
      <div className="w-full max-w-md bg-slate-800 border border-amber-500/30 rounded-3xl p-8 shadow-2xl text-center relative overflow-hidden">
        
        {/* Фоновый эффект */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-500 to-orange-600" />

        <div className="w-24 h-24 bg-slate-900 rounded-full mx-auto mb-6 flex items-center justify-center border-2 border-amber-500/50 shadow-inner">
          <img src="/meerkat/idle.png" className="w-16 h-16 object-contain" alt="Icon" />
        </div>
        
        <h2 className="text-2xl font-bold text-white mb-2">Новый сотрудник</h2>
        <p className="text-slate-400 text-sm mb-8">
          Придумайте имя для вашего напарника. Оно будет отображаться в вашем личном деле.
        </p>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например: Альфред"
            className="w-full bg-slate-900 border-2 border-slate-600 focus:border-amber-500 rounded-xl px-4 py-4 text-center text-2xl font-bold text-white outline-none transition-colors placeholder:font-normal"
            maxLength={15}
          />
          
          <button
            type="submit"
            disabled={!name.trim() || loading}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-lg shadow-lg"
          >
            {loading ? 'СОХРАНЕНИЕ...' : <> <Save className="w-5 h-5" /> ПОДТВЕРДИТЬ </>}
          </button>
        </form>
      </div>
    </div>
  );
}