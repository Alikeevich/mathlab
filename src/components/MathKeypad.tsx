import { Delete, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  const keys = [
    // Ряд 1: Цифры 1-3 и Плюс
    { label: '1', cmd: 'insert', arg: '1' },
    { label: '2', cmd: 'insert', arg: '2' },
    { label: '3', cmd: 'insert', arg: '3' },
    { label: '+', cmd: 'insert', arg: '+' },
    
    // Ряд 2: Цифры 4-6 и Минус
    { label: '4', cmd: 'insert', arg: '4' },
    { label: '5', cmd: 'insert', arg: '5' },
    { label: '6', cmd: 'insert', arg: '6' },
    { label: '−', cmd: 'insert', arg: '-' },

    // Ряд 3: Цифры 7-9 и Равно
    { label: '7', cmd: 'insert', arg: '7' },
    { label: '8', cmd: 'insert', arg: '8' },
    { label: '9', cmd: 'insert', arg: '9' },
    { label: '=', cmd: 'insert', arg: '=' },

    // Ряд 4: 0, Точка, X, Дробь
    { label: '0', cmd: 'insert', arg: '0' },
    { label: '.', cmd: 'insert', arg: '.' },
    { label: 'x', cmd: 'insert', arg: 'x' },
    { label: '÷', cmd: 'insert', arg: '\\frac{#@}{#?}' }, 

    // Ряд 5: Тригонометрия
    { label: 'sin', cmd: 'insert', arg: '\\sin(#?)' },
    { label: 'cos', cmd: 'insert', arg: '\\cos(#?)' },
    { label: 'tan', cmd: 'insert', arg: '\\tan(#?)' },
    { label: 'cot', cmd: 'insert', arg: '\\cot(#?)' },

    // Ряд 6: Сложные функции
    { label: 'logₐ', cmd: 'insert', arg: '\\log_{#?}(#@)' }, 
    { label: '√', cmd: 'insert', arg: '\\sqrt{#?}' },
    { label: 'xⁿ', cmd: 'insert', arg: '#@^{#?}' },
    { label: 'π', cmd: 'insert', arg: '\\pi' },
    
    // Ряд 7: Спецсимволы и Навигация
    { label: '∞', cmd: 'insert', arg: '\\infty' },
    { label: '∅', cmd: 'insert', arg: '\\emptyset' },
    { label: '°', cmd: 'insert', arg: '^\\circ' },
    // Кнопка влево
    { label: '←', cmd: 'perform', arg: 'moveToPreviousChar' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4 select-none">
      {keys.map((key, idx) => (
        <button
          key={idx}
          type="button"
          // preventDefault важен, чтобы фокус не улетал с поля ввода
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onCommand(key.cmd, key.arg)}
          className={`
            py-3 rounded-xl font-bold text-lg md:text-xl transition-all active:scale-95 shadow-[0_2px_0_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[2px]
            ${['sin', 'cos', 'tan', 'cot', 'logₐ'].includes(key.label) 
              ? 'bg-slate-700 text-cyan-300 font-mono text-base' 
              : key.label === '←' 
                ? 'bg-slate-800 text-slate-400 border border-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}
          `}
        >
          {key.label}
        </button>
      ))}

      {/* УПРАВЛЕНИЕ КУРСОРОМ (ВПРАВО) */}
      <button 
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onCommand('perform', 'moveToNextChar')} 
        className="bg-slate-800 p-3 rounded-xl border border-slate-700 text-slate-400 active:scale-95"
      >
        <ArrowRight className="w-6 h-6 mx-auto" />
      </button>

      {/* УДАЛЕНИЕ */}
      <button 
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDelete} 
        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 p-3 rounded-xl active:scale-95"
      >
        <Delete className="w-6 h-6 mx-auto" />
      </button>
      
      {/* ОЧИСТКА ВСЕГО */}
      <button 
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClear} 
        className="bg-slate-800 border border-slate-700 text-slate-500 text-xs font-bold uppercase rounded-xl active:scale-95"
      >
        СБРОС
      </button>

      {/* ENTER */}
      <button 
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSubmit}
        className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95"
      >
        <CornerDownLeft className="w-6 h-6 mx-auto" />
      </button>
    </div>
  );
}