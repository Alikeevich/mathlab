import { ArrowRight, Wifi } from 'lucide-react';

type Props = {
  onReconnect: () => void;
  onCancel: () => void; // Чтобы можно было отказаться (если турнир уже кончился)
};

export function ReconnectModal({ onReconnect, onCancel }: Props) {
  return (
    <div className="fixed inset-0 z-[999] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl text-center">
        <div className="w-20 h-20 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <Wifi className="w-10 h-10 text-emerald-400" />
        </div>
       
        <h2 className="text-2xl font-black text-white mb-2">НАЙДЕНА АКТИВНАЯ ИГРА</h2>
        <p className="text-slate-400 mb-8">
          Кажется, вы вылетели из турнира. Хотите вернуться в бой?
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onReconnect}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
          >
            ВЕРНУТЬСЯ <ArrowRight className="w-5 h-5" />
          </button>
         
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-400 text-sm py-2"
          >
            Нет, выйти из турнира
          </button>
        </div>
      </div>
    </div>
  );
}