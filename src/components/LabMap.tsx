import { useEffect, useState } from 'react';
import { supabase, Sector } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Brain,
  Binary,
  Activity,
  Zap,
  Radio,
  Calculator,
  Shapes,
  Lock,
  ChevronRight,
  Swords,
  Atom
} from 'lucide-react';

const iconMap: Record<string, any> = {
  brain: Brain,
  'git-branch': Binary,
  activity: Activity,
  zap: Zap,
  radio: Radio,
  cpu: Calculator,
  box: Shapes,
  swords: Swords,
  atom: Atom
};

const themeStyles: Record<string, { bg: string, text: string, border: string, shadow: string, iconBg: string }> = {
  emerald: {
    bg: 'hover:bg-emerald-950/30',
    text: 'text-emerald-400',
    border: 'hover:border-emerald-500/50',
    shadow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
    iconBg: 'bg-emerald-500/20 text-emerald-300'
  },
  blue: {
    bg: 'hover:bg-blue-950/30',
    text: 'text-blue-400',
    border: 'hover:border-blue-500/50',
    shadow: 'hover:shadow-[0_0_30px_rgba(59,130,246,0.3)]',
    iconBg: 'bg-blue-500/20 text-blue-300'
  },
  purple: {
    bg: 'hover:bg-purple-950/30',
    text: 'text-purple-400',
    border: 'hover:border-purple-500/50',
    shadow: 'hover:shadow-[0_0_30px_rgba(168,85,247,0.3)]',
    iconBg: 'bg-purple-500/20 text-purple-300'
  },
  orange: {
    bg: 'hover:bg-orange-950/30',
    text: 'text-orange-400',
    border: 'hover:border-orange-500/50',
    shadow: 'hover:shadow-[0_0_30px_rgba(249,115,22,0.3)]',
    iconBg: 'bg-orange-500/20 text-orange-300'
  },
  red: {
    bg: 'hover:bg-red-950/30',
    text: 'text-red-400',
    border: 'hover:border-red-500/50',
    shadow: 'hover:shadow-[0_0_30px_rgba(239,68,68,0.3)]',
    iconBg: 'bg-red-500/20 text-red-300'
  },
  cyan: {
    bg: 'hover:bg-cyan-950/30',
    text: 'text-cyan-400',
    border: 'hover:border-cyan-500/50',
    shadow: 'hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]',
    iconBg: 'bg-cyan-500/20 text-cyan-300'
  },
  pink: {
    bg: 'hover:bg-pink-950/30',
    text: 'text-pink-400',
    border: 'hover:border-pink-500/50',
    shadow: 'hover:shadow-[0_0_30px_rgba(236,72,153,0.3)]',
    iconBg: 'bg-pink-500/20 text-pink-300'
  },
};

type LabMapProps = {
  onSectorSelect: (sector: Sector) => void;
};

export function LabMap({ onSectorSelect }: LabMapProps) {
  const { user, profile } = useAuth();
  const [sectors, setSectors] = useState<Sector[]>([]);

  useEffect(() => {
    loadSectors();
  }, []);

  async function loadSectors() {
    const { data } = await supabase
      .from('sectors')
      .select('*')
      .neq('id', 99) 
      .order('id');

    if (data) {
      setSectors(data);
    }
  }

  const isUnlocked = (sector: Sector) => {
    if (!user) {
      return sector.id === 0 || sector.id === 1;
    }
    return (profile?.clearance_level ?? 0) >= sector.required_clearance;
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-8 pb-32 custom-scrollbar">
      <div className="max-w-7xl mx-auto">
        
        {/* ЗАГОЛОВОК */}
        <div className="mb-12 text-center relative z-10">
          <div className="inline-block mb-4 animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="px-6 py-2 bg-slate-900/60 backdrop-blur-md border border-cyan-500/30 rounded-full shadow-lg shadow-cyan-900/20">
              <span className="text-cyan-400 font-mono text-sm tracking-widest font-bold">
                {!user ? 'РЕЖИМ: ДЕМО-ДОСТУП' : `УРОВЕНЬ ДОСТУПА: ${profile?.clearance_level ?? 0}`}
              </span>
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-sm">
            СЕКТОРЫ ЗНАНИЙ
          </h1>
          <p className="text-slate-300/80 text-lg max-w-2xl mx-auto font-light">
            {!user 
              ? 'Вам доступны только базовые отсеки. Зарегистрируйтесь, чтобы открыть всю лабораторию.'
              : 'Выберите модуль для начала исследований и повышения уровня.'
            }
          </p>
        </div>

        {/* СЕТКА СЕКТОРОВ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
          {sectors.map((sector) => {
            const Icon = iconMap[sector.icon] || Zap;
            const unlocked = isUnlocked(sector);
            
            const style = themeStyles[sector.color] || {
              bg: 'hover:bg-slate-800',
              text: 'text-slate-400',
              border: 'hover:border-slate-600',
              shadow: '',
              iconBg: 'bg-slate-800 text-slate-500'
            };

            return (
              <button
                key={sector.id}
                onClick={() => unlocked && onSectorSelect(sector)}
                disabled={!unlocked}
                className={`
                  relative group p-6 rounded-[2rem] border-2 text-left transition-all duration-500 w-full
                  flex flex-col justify-between overflow-hidden backdrop-blur-sm
                  ${unlocked 
                    ? `bg-slate-900/60 border-slate-800 ${style.border} ${style.bg} ${style.shadow} hover:-translate-y-2` 
                    : 'bg-slate-950/80 border-slate-800/50 opacity-60 cursor-not-allowed'
                  }
                `}
              >
                {/* Подсветка */}
                {unlocked && (
                  <div className={`absolute -right-10 -top-10 w-32 h-32 bg-gradient-to-br ${style.text.replace('text-', 'from-')}/20 to-transparent blur-3xl group-hover:opacity-100 transition-opacity duration-500`} />
                )}

                {/* ВЕРХНЯЯ ЧАСТЬ: Иконка слева, Статус справа */}
                <div className="flex items-start justify-between mb-6 z-10 w-full">
                  
                  {/* Иконка сектора */}
                  <div className={`p-4 rounded-2xl ${unlocked ? style.iconBg : 'bg-slate-800 text-slate-600'} border border-white/5 shadow-inner transition-all duration-300 group-hover:scale-110`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  
                  {/* Правый верхний угол: Либо Номер сектора, либо Замок */}
                  <div className="text-right">
                    {!unlocked ? (
                      // ЕСЛИ ЗАКРЫТО: Показываем замок в красивой рамке
                      <div className="bg-black/40 p-2 rounded-xl border border-slate-700/50 backdrop-blur-md shadow-lg">
                        <Lock className="w-5 h-5 text-slate-400" />
                      </div>
                    ) : (
                      // ЕСЛИ ОТКРЫТО: Показываем номер
                      <span className="block font-mono text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                        Сектор {sector.id}
                      </span>
                    )}
                  </div>
                </div>

                {/* Контент */}
                <div className="z-10 h-full flex flex-col">
                  <h3 className={`text-2xl font-bold mb-3 leading-tight transition-colors ${unlocked ? 'text-white group-hover:text-white' : 'text-slate-500'}`}>
                    {sector.name}
                  </h3>
                  
                  <p className="text-slate-400 text-sm mb-6 line-clamp-2 leading-relaxed font-medium">
                    {sector.description}
                  </p>

                  {/* Футер карточки */}
                  <div className={`flex items-center justify-between border-t ${unlocked ? 'border-white/10' : 'border-white/5'} pt-4 mt-auto w-full`}>
                    <div className="text-xs font-mono font-bold flex items-center gap-2">
                      {!user 
                        ? (unlocked ? <span className="text-emerald-400">● ОТКРЫТО</span> : <span className="text-slate-500">🔒 ЗАКРЫТО</span>) 
                        : (unlocked ? <span className={`${style.text}`}>● ДОСТУПНО</span> : <span className="text-red-400/70">🔒 LVL {sector.required_clearance}</span>)
                      }
                    </div>
                    
                    {unlocked && (
                      <div className={`p-1.5 rounded-full ${style.text} bg-white/5 group-hover:bg-white/10 transition-colors`}>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}