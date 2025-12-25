import { useState } from 'react';
import { Delete, ArrowLeft, ArrowRight, CornerDownLeft, Grip, ArrowLeftRight } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  // Состояние переключения страниц (true = основная, false = символы)
  const [isMainPage, setIsMainPage] = useState(true);

  const preventBlur = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // === СТРАНИЦА 2: СПЕЦСИМВОЛЫ ===
  const symbolsKeys = [
    // Ряд 1: Скобки и Модуль
    { label: '[ ]', cmd: 'insert', arg: '\\left[#?\\right]' },
    { label: '( )', cmd: 'insert', arg: '\\left(#?\\right)' },
    { label: '{ }', cmd: 'insert', arg: '\\left\\{#?\\right\\}' },
    { label: '|x|', cmd: 'insert', arg: '\\left|#?\\right|' },

    // Ряд 2: Логика и Сравнение
    { label: '=', cmd: 'insert', arg: '=' },
    { label: '≠', cmd: 'insert', arg: '\\neq' },
    { label: '≈', cmd: 'insert', arg: '\\approx' },
    { label: '!', cmd: 'insert', arg: '!' },

    // Ряд 3: Знаки препинания и Бесконечность
    { label: ';', cmd: 'insert', arg: ';' },
    { label: ':', cmd: 'insert', arg: ':' },
    { label: '∞', cmd: 'insert', arg: '\\infty' },
    { label: '∅', cmd: 'insert', arg: '\\emptyset' },

    // Ряд 4: Неравенства
    { label: '<', cmd: 'insert', arg: '<' },
    { label: '>', cmd: 'insert', arg: '>' },
    { label: '≤', cmd: 'insert', arg: '\\le' },
    { label: '≥', cmd: 'insert', arg: '\\ge' },
  ];

  return (
    <div className="flex flex-col gap-2 select-none touch-none pb-4">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ: Управление курсором (общая для всех страниц) */}
      <div className="grid grid-cols-4 gap-2 mb-1">
         <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('perform', 'moveToPreviousChar')} className="bg-slate-800 rounded-lg p-3 text-slate-400 flex justify-center active:scale-95 shadow-sm"><ArrowLeft className="w-5 h-5"/></button>
         <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('perform', 'moveToNextChar')} className="bg-slate-800 rounded-lg p-3 text-slate-400 flex justify-center active:scale-95 shadow-sm"><ArrowRight className="w-5 h-5"/></button>
         <button onPointerDown={(e) => preventBlur(e)} onClick={onDelete} className="bg-red-500/20 text-red-400 rounded-lg p-3 flex justify-center active:scale-95 shadow-sm"><Delete className="w-5 h-5"/></button>
         <button onPointerDown={(e) => preventBlur(e)} onClick={onSubmit} className="bg-emerald-600 text-white rounded-lg p-3 flex justify-center active:scale-95 shadow-lg"><CornerDownLeft className="w-5 h-5"/></button>
      </div>

      {isMainPage ? (
        // === СТРАНИЦА 1: КАЛЬКУЛЯТОР ===
        <div className="grid grid-cols-5 gap-2">
          {/* ЛЕВАЯ КОЛОНКА: Функции */}
          <div className="col-span-2 grid grid-cols-2 gap-2">
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '\\sin(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white active:scale-95 shadow-md">sin</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '\\cos(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white active:scale-95 shadow-md">cos</button>
             
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '\\tan(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white active:scale-95 shadow-md">tan</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '\\cot(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white active:scale-95 shadow-md">cot</button>
             
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '\\log_{#?}(#@)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white active:scale-95 shadow-md">log</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '\\frac{#@}{#?}')} className="bg-slate-700 rounded-xl py-3 text-lg font-bold text-white active:scale-95 shadow-md">÷</button>
             
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '\\sqrt{#?}')} className="bg-slate-700 rounded-xl py-3 text-white active:scale-95 shadow-md">√</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '#@^{#?}')} className="bg-slate-700 rounded-xl py-3 text-white active:scale-95 shadow-md">xⁿ</button>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Цифры */}
          <div className="col-span-3 grid grid-cols-3 gap-2">
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '7')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">7</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '8')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">8</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '9')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">9</button>
             
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '4')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">4</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '5')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">5</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '6')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">6</button>
             
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '1')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">1</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '2')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">2</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '3')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm active:scale-95">3</button>
             
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '.')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white active:scale-95">.</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '0')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white active:scale-95">0</button>
             <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', ',')} className="bg-slate-800 hover:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white active:scale-95">,</button>
          </div>
        </div>
      ) : (
        // === СТРАНИЦА 2: СИМВОЛЫ ===
        <div className="grid grid-cols-4 gap-2 h-[220px]">
          {symbolsKeys.map((key, idx) => (
            <button
              key={idx}
              onPointerDown={(e) => preventBlur(e)}
              onClick={() => onCommand(key.cmd, key.arg)}
              className="bg-slate-700 hover:bg-slate-600 rounded-xl text-lg font-bold text-cyan-300 shadow-sm active:scale-95 transition-all flex items-center justify-center"
            >
              {key.label}
            </button>
          ))}
        </div>
      )}

      {/* НИЖНИЙ РЯД: Переключение и Основные действия */}
      <div className="grid grid-cols-4 gap-2 mt-1">
         {/* КНОПКА ПЕРЕКЛЮЧЕНИЯ */}
         <button 
            onPointerDown={(e) => preventBlur(e)} 
            onClick={() => setIsMainPage(!isMainPage)} 
            className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-xs font-bold uppercase rounded-xl py-4 active:scale-95 flex flex-col items-center justify-center leading-none"
         >
            {isMainPage ? (
              <>
                <span className="text-lg mb-0.5">#+=</span>
              </>
            ) : (
              <>
                <span className="text-lg mb-0.5">123</span>
              </>
            )}
         </button>

         {/* ОСНОВНЫЕ ЗНАКИ (Всегда доступны) */}
         <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '-')} className="bg-slate-700 text-white text-xl font-bold rounded-xl py-4 active:scale-95 shadow-md">−</button>
         <button onPointerDown={(e) => preventBlur(e)} onClick={() => onCommand('insert', '+')} className="bg-slate-700 text-white text-xl font-bold rounded-xl py-4 active:scale-95 shadow-md">+</button>
         <button onPointerDown={(e) => preventBlur(e)} onClick={onClear} className="bg-slate-800 text-slate-500 text-xs font-bold uppercase rounded-xl py-4 active:scale-95">СБРОС</button>
      </div>

    </div>
  );
}