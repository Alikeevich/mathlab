import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Heart, Utensils, Zap, Sparkles } from 'lucide-react';

type Props = {
  onClose: () => void;
};

export function CompanionLair({ onClose }: Props) {
  const { profile, refreshProfile } = useAuth();
  const [animationState, setAnimationState] = useState<'idle' | 'eating' | 'happy'>('idle');
  const [hunger, setHunger] = useState(100);
  
  // Расчет голода при загрузке
  useEffect(() => {
    if (profile?.last_fed_at) {
      const lastFed = new Date(profile.last_fed_at).getTime();
      const now = Date.now();
      const hoursPassed = (now - lastFed) / (1000 * 60 * 60);
      
      // Теряет 5 единиц голода в час
      const currentHunger = Math.max(0, 100 - Math.floor(hoursPassed * 5));
      setHunger(currentHunger);
      
      // Если проголодался в базе, обновляем базу (опционально, чтобы не спамить)
      if (currentHunger !== profile.companion_hunger) {
        supabase.from('profiles').update({ companion_hunger: currentHunger }).eq('id', profile.id);
      }
    }
  }, [profile]);

  // Функция кормления
  const feedCompanion = async () => {
    if (hunger >= 100) return; // Не кормить, если сыт
    
    setAnimationState('eating');
    
    // Эффект кормления (+20 к сытости)
    const newHunger = Math.min(100, hunger + 20);
    setHunger(newHunger);

    // Сохраняем в базу
    await supabase.from('profiles').update({ 
      companion_hunger: newHunger,
      last_fed_at: new Date().toISOString()
    }).eq('id', profile!.id);

    // Через 2 секунды он станет счастливым
    setTimeout(() => setAnimationState('happy'), 2000);
    // Еще через 2 секунды - обычным
    setTimeout(() => setAnimationState('idle'), 4000);
    
    refreshProfile();
  };

  // Выбор картинки/анимации (Заглушки, замени на свои GIF/PNG)
  const getSprite = () => {
    // ВАЖНО: Если у тебя видео/гифка на черном фоне, добавь класс mix-blend-screen
    switch (animationState) {
      case 'eating': return 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjEx.../eating_placeholder.gif'; // Замени
      case 'happy': return 'https://media.giphy.com/media/.../happy_placeholder.gif'; // Замени
      default: return 'https://media.giphy.com/media/.../idle_placeholder.gif'; // Замени
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[80] flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-gradient-to-b from-slate-800 to-slate-900 border border-amber-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Кнопка закрытия */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>

        {/* Заголовок */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            Домик {profile?.companion_name}
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          </h2>
          <div className="text-slate-400 text-xs font-mono uppercase tracking-widest mt-1">
            Уровень {profile?.companion_level} • XP {profile?.companion_xp}/100
          </div>
        </div>

        {/* Сцена с персонажем */}
        <div className="relative h-64 bg-slate-950/50 rounded-2xl border-2 border-slate-700 flex items-center justify-center mb-6 overflow-hidden">
          
          {/* Декорация сзади (комната) */}
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,rgba(245,158,11,0.1),transparent_70%)]" />

          {/* ПЕРСОНАЖ */}
          <div className="relative z-10 transition-all duration-500 transform hover:scale-105 cursor-pointer" onClick={() => setAnimationState('happy')}>
             {/* Замени <div> на <img> когда будут файлы */}
             <div className={`text-9xl transition-all duration-300 ${animationState === 'eating' ? 'animate-bounce' : ''}`}>
               {animationState === 'eating' ? '🍔' : animationState === 'happy' ? '🥰' : '🦦'}
             </div>
             
             {/* Если у тебя спрайт на черном фоне, раскомментируй это: */}
             {/* <img src={getSprite()} className="w-48 h-48 object-contain mix-blend-screen" /> */}
          </div>

          {/* Облачко с мыслями (если голоден) */}
          {hunger < 30 && (
            <div className="absolute top-4 right-10 bg-white text-black text-xs font-bold px-3 py-1 rounded-tl-xl rounded-tr-xl rounded-br-xl animate-bounce">
              Хочу кушать!
            </div>
          )}
        </div>

        {/* Показатели */}
        <div className="space-y-4 mb-8">
          {/* Голод */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1"><Utensils className="w-3 h-3" /> Сытость</span>
              <span>{hunger}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full transition-all duration-500 ${hunger < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
                style={{ width: `${hunger}%` }} 
              />
            </div>
          </div>

          {/* Опыт (до уровня) */}
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> Энергия роста</span>
              <span>{profile?.companion_xp}%</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div 
                className="h-full bg-amber-400 transition-all duration-500 shadow-[0_0_10px_rgba(251,191,36,0.5)]" 
                style={{ width: `${profile?.companion_xp || 0}%` }} 
              />
            </div>
          </div>
        </div>

        {/* Действия */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={feedCompanion}
            disabled={hunger >= 100}
            className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Utensils className="w-5 h-5 text-orange-400" />
            Покормить
          </button>
          
          <button 
            className="py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all opacity-50 cursor-not-allowed"
            title="Скоро: Гардероб"
          >
            <div className="text-xl">👕</div>
            Нарядить
          </button>
        </div>

      </div>
    </div>
  );
}