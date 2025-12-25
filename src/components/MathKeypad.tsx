import { Delete, ArrowLeft, ArrowRight } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, isWrite?: boolean) => void; // Изменили сигнатуру
  onDelete: () => void;
  onClear: () => void;
};

export function MathKeypad({ onCommand, onDelete, onClear }: MathKeypadProps) {
  const keys = [
    // Ряд 1: Цифры 1-3 и Основные действия
    { label: '1', cmd: '1', write: true },
    { label: '2', cmd: '2', write: true },
    { label: '3', cmd: '3', write: true },
    { label: '+', cmd: '+', write: true },
    
    // Ряд 2: Цифры 4-6
    { label: '4', cmd: '4', write: true },
    { label: '5', cmd: '5', write: true },
    { label: '6', cmd: '6', write: true },
    { label: '−', cmd: '-', write: true },

    // Ряд 3: Цифры 7-9
    { label: '7', cmd: '7', write: true },
    { label: '8', cmd: '8', write: true },
    { label: '9', cmd: '9', write: true },
    { label: '=', cmd: '=', write: true }, // Для уравнений

    // Ряд 4: 0 и дроби
    { label: '0', cmd: '0', write: true },
    { label: '.', cmd: '.', write: true },
    { label: 'x', cmd: 'x', write: true }, // Переменная
    { label: '÷', cmd: '\\frac', write: false }, // Дробь

    // Ряд 5: Тригонометрия
    { label: 'sin', cmd: '\\sin', write: false },
    { label: 'cos', cmd: '\\cos', write: false },
    { label: 'tan', cmd: '\\tan', write: false },
    { label: 'cot', cmd: '\\cot', write: false },

    // Ряд 6: Сложные функции
    { label: 'logₐ', cmd: '\\log_{}', write: false }, // <--- ТОТ САМЫЙ ЛОГАРИФМ
    { label: '√', cmd: '\\sqrt', write: false },
    { label: 'xⁿ', cmd: '^', write: false },
    { label: 'π', cmd: '\\pi', write: false },
    
    // Ряд 7: Спецсимволы
    { label: '∞', cmd: '\\infty', write: false },
    { label: '∅', cmd: '\\emptyset', write: false },
    { label: '°', cmd: '^\\circ', write: false },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4 select-none">
      {keys.map((key) => (
        <button
          key={key.label + key.cmd}
          type="button"
          // Если write=true, мы "пишем" символ. Если false - выполняем команду MathQuill (cmd)
          onClick={() => onCommand(key.cmd, key.write)}
          className={`
            py-3 rounded-xl font-bold text-lg md:text-xl transition-all active:scale-95 shadow-[0_4px_0_0_rgba(0,0,0,0.2)] active:shadow-none
            ${['sin', 'cos', 'tan', 'cot', 'logₐ'].includes(key.label) 
              ? 'bg-slate-700 text-cyan-300 font-mono text-base' 
              : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}
          `}
        >
          {key.label}
        </button>
      ))}

      {/* Кнопки управления курсором (MathQuill позволяет двигать курсор) */}
      <button onClick={() => onCommand('Left', false)} className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-slate-400">
        <ArrowLeft className="w-6 h-6 mx-auto" />
      </button>
      <button onClick={() => onCommand('Right', false)} className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-slate-400">
        <ArrowRight className="w-6 h-6 mx-auto" />
      </button>

      {/* Удаление */}
      <button onClick={onDelete} className="col-span-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl">
        <Delete className="w-6 h-6 mx-auto" />
      </button>
       {/* Очистка */}
      <button onClick={onClear} className="col-span-1 bg-slate-800 border border-slate-700 text-slate-500 text-xs p-3 rounded-xl font-bold uppercase">
        СБРОС
      </button>
    </div>
  );
}