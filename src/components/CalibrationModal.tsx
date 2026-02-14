import React from 'react';
import { CalibrationState } from '../lib/CalibrationSystem';
import { CheckCircle, XCircle, Trophy, TrendingUp, Target } from 'lucide-react';

interface Props { state: CalibrationState; onClose: () => void; }

export function CalibrationModal({ state, onClose }: Props) {
  const wins = state.results.filter(r => r).length;
  const losses = state.results.filter(r => !r).length;
  const winRate = state.matchesPlayed > 0 ? Math.round((wins / state.matchesPlayed) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border-2 border-amber-500/50 rounded-3xl overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-0 right-0 h-48 bg-gradient-to-b from-amber-500/20 to-transparent pointer-events-none" />
        <div className="relative p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500/20 rounded-full border-2 border-amber-500/50 mb-2">
              <Target className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase tracking-wider">Калибровка</h2>
            <p className="text-slate-400 text-sm">{state.isCalibrating ? 'Определяем ваш начальный рейтинг' : 'Калибровка завершена!'}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm font-bold uppercase">Прогресс</span>
              <span className="text-white font-black text-lg">{state.matchesPlayed} / {state.totalMatches}</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
              <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500" style={{ width: `${(state.matchesPlayed / state.totalMatches) * 100}%` }} />
            </div>

            <div className="flex gap-2 justify-center pt-2">
              {[...Array(state.totalMatches)].map((_, i) => {
                if (i >= state.matchesPlayed) return (<div key={i} className="w-10 h-10 rounded-lg border-2 border-slate-700 border-dashed bg-slate-800/50" />);
                const won = state.results[i];
                return (
                  <div key={i} className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${won ? 'bg-emerald-900/20 border-emerald-500/50' : 'bg-red-900/20 border-red-500/50'}`}>
                    {won ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-emerald-400">{wins}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Победы</div>
            </div>
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-red-400">{losses}</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Поражения</div>
            </div>
            <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl p-3 text-center">
              <div className="text-2xl font-black text-amber-400">{winRate}%</div>
              <div className="text-[10px] text-slate-400 uppercase font-bold">Винрейт</div>
            </div>
          </div>

          {state.matchesPlayed > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-400 text-xs uppercase font-bold">{state.isCalibrating ? 'Провизорный рейтинг' : 'Финальный рейтинг'}</span>
              </div>
              <div className="text-4xl font-black text-white">{state.provisionalMMR}</div>
              {state.isCalibrating && <p className="text-[10px] text-slate-500 mt-1">Может измениться после следующих матчей</p>}
            </div>
          )}

          {state.isCalibrating ? (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <p className="text-blue-300 text-sm text-center leading-relaxed">💡 Сыграйте {state.totalMatches - state.matchesPlayed} {state.totalMatches - state.matchesPlayed === 1 ? 'матч' : 'матча'}, чтобы получить начальный рейтинг. Результаты повлияют на ваш старт!</p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-emerald-400" />
                <p className="text-emerald-300 font-bold">Калибровка завершена!</p>
              </div>
              <p className="text-slate-300 text-sm text-center">Ваш начальный рейтинг: <span className="font-black text-white">{state.provisionalMMR} MP</span></p>
              <p className="text-slate-400 text-xs text-center italic">Теперь каждая победа и поражение будут влиять на ваш рейтинг</p>
            </div>
          )}

          <button onClick={onClose} className="w-full py-4 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl font-bold text-white hover:scale-105 transition-transform shadow-lg">{state.isCalibrating ? 'Продолжить' : 'В бой!'}</button>

        </div>
      </div>
    </div>
  );
}