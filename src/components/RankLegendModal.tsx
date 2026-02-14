import { X, Info, Target, Zap, Trophy, ChevronRight } from 'lucide-react';
import { PVP_RANKS } from '../lib/PvPRankSystem';

export function RankLegendModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <Trophy className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase italic">Система Рангов</h2>
              <p className="text-slate-400 text-xs font-mono uppercase tracking-widest">MathLab PvP League</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* Rules Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2 uppercase text-[10px]">
                <Target className="w-4 h-4" /> Калибровка
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Первые <span className="text-white font-bold">5 матчей</span> определят ваш начальный ранг. Скрытый MMR в это время меняется быстрее.
              </p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
              <div className="flex items-center gap-2 text-amber-400 font-bold mb-2 uppercase text-[10px]">
                <Zap className="w-4 h-4" /> Начисление очков
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">
                Победа: <span className="text-emerald-400 font-bold">+20..50 MP</span>. <br/> 
                Поражение: <span className="text-red-400 font-bold">-10..30 MP</span>.
              </p>
            </div>
          </div>

          {/* ВАЖНОЕ ПОЯСНЕНИЕ ПРО ПРОГРЕССИЮ */}
          <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-cyan-500/30 p-4 rounded-2xl">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-cyan-400" />
              <h4 className="text-white font-bold text-sm uppercase">Как читать дивизионы?</h4>
            </div>
            <p className="text-slate-300 text-sm leading-snug">
              Внутри каждой лиги есть 4 дивизиона. Прогресс идет <span className="text-white font-bold">от IV к I</span>.
            </p>
            <div className="mt-3 flex items-center justify-between bg-black/30 p-2 rounded-lg border border-white/5">
                <div className="flex flex-col items-center flex-1">
                    <span className="text-slate-500 text-[10px] font-black">СЛАБЕЕ</span>
                    <span className="text-white font-mono font-bold">Золото IV</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700" />
                <div className="flex flex-col items-center flex-1">
                    <span className="text-slate-500 text-[10px] font-black">...</span>
                    <span className="text-white font-mono font-bold">Золото II</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-700" />
                <div className="flex flex-col items-center flex-1">
                    <span className="text-cyan-400 text-[10px] font-black uppercase">Высший ранг</span>
                    <span className="text-cyan-400 font-mono font-bold">Золото I</span>
                </div>
            </div>
          </div>

          {/* Ranks List */}
          <div className="space-y-3">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] ml-2">Список лиг</h3>
            <div className="grid gap-2">
              {['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'grandmaster'].map(tier => {
                const tierRanks = PVP_RANKS.filter(r => r.tier === tier);
                const r = tierRanks[0];
                return (
                  <div key={tier} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl border border-white/5 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-lg" style={{ background: `linear-gradient(135deg, ${r.gradientFrom}, ${r.gradientTo})` }}>
                        {r.icon}
                      </div>
                      <div>
                        <div className={`font-black uppercase tracking-wider text-sm ${r.color}`}>{tier.toUpperCase()}</div>
                        <div className="text-[10px] text-slate-500 font-mono italic">"{r.description}"</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-mono font-bold text-sm">{tierRanks[tierRanks.length-1].minMMR}+</div>
                      <div className="text-[9px] text-slate-600 font-bold uppercase">Min MP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-center">
           <p className="text-[10px] text-slate-500 font-mono uppercase">Система рейтинга MathLab v1.0</p>
        </div>
      </div>
    </div>
  );
}