import { useState } from 'react';
import { X, Hash, ArrowRight, Loader, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Props = {
  onJoin: (code: string) => void;
  onClose: () => void;
};

export function JoinTournamentModal({ onJoin, onClose }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (code.length !== 4) {
      setError('Код должен состоять из 4 цифр');
      return;
    }

    setValidating(true);
    setError('');

    try {
      // === ВАЛИДАЦИЯ: Проверяем существование турнира ===
      const { data: tournament, error: fetchError } = await supabase
        .from('tournaments')
        .select('id, status, created_at')
        .eq('code', code)
        .maybeSingle();

      if (fetchError) {
        console.error('Ошибка проверки кода:', fetchError);
        setError('Ошибка соединения. Попробуйте снова.');
        setValidating(false);
        return;
      }

      if (!tournament) {
        setError('Турнир с таким кодом не найден');
        setValidating(false);
        return;
      }

      // === ПРОВЕРКА СТАТУСА ===
      if (tournament.status === 'finished') {
        setError('Этот турнир уже завершён');
        setValidating(false);
        return;
      }

      if (tournament.status === 'active') {
        setError('Турнир уже начался. Опоздали!');
        setValidating(false);
        return;
      }

      // === ПРОВЕРКА НА УСТАРЕВАНИЕ (опционально) ===
      const createdAt = new Date(tournament.created_at);
      const hoursSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCreation > 2) {
        setError('Код устарел. Попросите новый у учителя.');
        setValidating(false);
        return;
      }

      // ✅ ВСЁ ОКЕЙ — ПЕРЕХОДИМ В ТУРНИР
      onJoin(code);

    } catch (err) {
      console.error('Непредвиденная ошибка:', err);
      setError('Что-то пошло не так. Попробуйте снова.');
      setValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-800 border border-cyan-500/30 rounded-2xl p-8 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
          disabled={validating}
        >
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Hash className="w-8 h-8 text-cyan-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Вход в Турнир</h2>
          <p className="text-slate-400 text-sm">
            Введите 4-значный код, который дал учитель
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            autoFocus
            type="text"
            value={code}
            onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 4));
                setError('');
            }}
            placeholder="0000"
            disabled={validating}
            className="w-full bg-slate-900 border-2 border-slate-600 focus:border-cyan-500 rounded-xl py-4 text-center text-4xl font-mono font-bold text-white tracking-[0.5em] placeholder-slate-700 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          />
         
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm font-bold bg-red-900/20 border border-red-500/30 rounded-lg p-3 animate-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={code.length < 4 || validating}
            className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-900/20"
          >
            {validating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                ПРОВЕРКА...
              </>
            ) : (
              <>
                ПРИСОЕДИНИТЬСЯ <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700">
          <p className="text-slate-500 text-xs text-center">
            Код действителен только в течение 2 часов после создания турнира
          </p>
        </div>
      </div>
    </div>
  );
}