import { Delete, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  const keys = [
    // Ряд 1: Тригонометрия
    { label: 'sin', cmd: 'insert', arg: '\\sin(#?)' },
    { label: 'cos', cmd: 'insert', arg: '\\cos(#?)' },
    { label: 'tan', cmd: 'insert', arg: '\\tan(#?)' },
    { label: 'cot', cmd: 'insert', arg: '\\cot(#?)' },

    // Ряд 2: Сложные функции (КВАДРАТИКИ!)
    { label: 'logₐ', cmd: 'insert', arg: '\\log_{#?}(#@)' }, 
    { label: '√', cmd: 'insert', arg: '\\sqrt{#?}' },
    { label: 'xⁿ', cmd: 'insert', arg: '#@^{#?}' }, // Степень
    { label: '÷', cmd: 'insert', arg: '\\frac{#@}{#?}' }, // Дробь (вертикальная, её нет на телефоне)

    // Ряд 3: Спецсимволы
    { label: 'π', cmd: 'insert', arg: '\\pi' },
    { label: '∞', cmd: 'insert', arg: '\\infty' },
    { label: '∅', cmd: 'insert', arg: '\\emptyset' },
    { label: '°', cmd: 'insert', arg: '^\\circ' },
  ];

  // Функция для предотвращения потери фокуса (чтобы системная клавиатура не закрывалась при нажатии сюда)
  const preventBlur = (e: React.SyntheticEvent) => {
    e.preventDefault();
    // Не делаем stopPropagation, чтобы клики работали, но preventDefault не дает уйти фокусу
  };

  return (
    <div className="grid grid-cols-4 gap-2 mb-4 select-none">
      {keys.map((key, idx) => (
        <button
          key={idx}
          type="button"
          onMouseDown={preventBlur}
          onTouchStart={preventBlur}
          onClick={() => onCommand(key.cmd, key.arg)}
          className="py-3 rounded-xl bg-slate-700 text-cyan-300 font-mono text-base font-bold shadow-md active:scale-95 transition-all hover:bg-slate-600"
        >
          {key.label}
        </button>
      ))}

      {/* УПРАВЛЕНИЕ КУРСОРОМ (Полезно, чтобы двигаться внутри дробей/логарифмов) */}
      <button 
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onCommand('perform', 'moveToPreviousChar')} 
        className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-slate-400 active:scale-95"
      >
        <ArrowLeft className="w-6 h-6 mx-auto" />
      </button>

      <button 
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={() => onCommand('perform', 'moveToNextChar')} 
        className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-slate-400 active:scale-95"
      >
        <ArrowRight className="w-6 h-6 mx-auto" />
      </button>

      {/* УДАЛЕНИЕ */}
      <button 
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={onDelete} 
        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl active:scale-95"
      >
        <Delete className="w-6 h-6 mx-auto" />
      </button>
      
      {/* ENTER (Отправка) */}
      <button 
        onMouseDown={preventBlur}
        onTouchStart={preventBlur}
        onClick={onSubmit}
        className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95"
      >
        <CornerDownLeft className="w-6 h-6 mx-auto" />
      </button>
    </div>
  );
}