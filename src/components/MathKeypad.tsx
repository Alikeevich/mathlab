import { useState } from 'react';
import { Delete, ArrowLeft, ArrowRight, CornerDownLeft, Space } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  // Состояние страниц (123 / Символы)
  const [isMainPage, setIsMainPage] = useState(true);

  // Магия против скачков экрана (фокус не уходит из поля)
  const preventBlur = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // === СТРАНИЦА 2: СПЕЦСИМВОЛЫ ===
  const symbolsKeys = [
    { label: '[ ]', cmd: 'insert', arg: '\\left[#?\\right]' },
    { label: '( )', cmd: 'insert', arg: '\\left(#?\\right)' },
    { label: '{ }', cmd: 'insert', arg: '\\left\\{#?\\right\\}' },
    { label: '|x|', cmd: 'insert', arg: '\\left|#?\\right|' },

    { label: '≠', cmd: 'insert', arg: '\\neq' },
    { label: '≈', cmd: 'insert', arg: '\\approx' },
    { label: '!', cmd: 'insert', arg: '!' },
    { label: '%', cmd: 'insert', arg: '\\%' },

    { label: ';', cmd: 'insert', arg: ';' },
    { label: ':', cmd: 'insert', arg: ':' },
    { label: '∞', cmd: 'insert', arg: '\\infty' },
    { label: '∅', cmd: 'insert', arg: '\\emptyset' },

    { label: '<', cmd: 'insert', arg: '<' },
    { label: '>', cmd: 'insert', arg: '>' },
    { label: '≤', cmd: 'insert', arg: '\\le' },
    { label: '≥', cmd: 'insert', arg: '\\ge' },
  ];

  // Вспомогательный компонент кнопки
  const Key = ({ label, onClick, className, children, isOperator }: any) => (
    <button
      onPointerDown={(e) => preventBlur(e)}
      onTouchStart={(e) => e.preventDefault()} 
      onClick={onClick}
      className={`
        relative rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 shadow-[0_2px_0_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[2px]
        ${className}
      `}
    >
      {children || label}
    </button>
  );

  return (
    <div className="flex flex-col gap-2 select-none touch-none pb-2">
      
      {/* 1. ВЕРХНЯЯ ПАНЕЛЬ (НАВИГАЦИЯ + УДАЛЕНИЕ) */}
      <div className="grid grid-cols-4 gap-2 mb-1">
         <Key onClick={() => onCommand('perform', 'moveToPreviousChar')} className="bg-slate-800 py-3 text-slate-400"><ArrowLeft className="w-6 h-6"/></Key>
         <Key onClick={() => onCommand('perform', 'moveToNextChar')} className="bg-slate-800 py-3 text-slate-400"><ArrowRight className="w-6 h-6"/></Key>
         <Key onClick={onDelete} className="bg-red-500/20 text-red-400 py-3"><Delete className="w-6 h-6"/></Key>
         <Key onClick={onClear} className="bg-slate-800 text-slate-500 text-xs uppercase py-3">СБРОС</Key>
      </div>

      <div className="flex gap-2">
        
        {/* ЛЕВАЯ ЧАСТЬ (ОСНОВНАЯ) */}
        <div className="flex-1 flex flex-col gap-2">
           
           {isMainPage ? (
             // === ВКЛАДКА 1: ЦИФРЫ И ФУНКЦИИ ===
             <>
               {/* Ряд функций */}
               <div className="grid grid-cols-4 gap-2">
                  <Key onClick={() => onCommand('insert', '\\sin(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">sin</Key>
                  <Key onClick={() => onCommand('insert', '\\cos(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">cos</Key>
                  <Key onClick={() => onCommand('insert', '\\sqrt{#?}')} className="bg-slate-700 text-cyan-300 py-3">√</Key>
                  <Key onClick={() => onCommand('insert', '#@^{#?}')} className="bg-slate-700 text-cyan-300 py-3">xⁿ</Key>
               </div>
               
               {/* Цифры 7-9 */}
               <div className="grid grid-cols-3 gap-2">
                  <Key onClick={() => onCommand('insert', '7')} className="bg-slate-800 text-white text-2xl py-3">7</Key>
                  <Key onClick={() => onCommand('insert', '8')} className="bg-slate-800 text-white text-2xl py-3">8</Key>
                  <Key onClick={() => onCommand('insert', '9')} className="bg-slate-800 text-white text-2xl py-3">9</Key>
               </div>
               {/* Цифры 4-6 */}
               <div className="grid grid-cols-3 gap-2">
                  <Key onClick={() => onCommand('insert', '4')} className="bg-slate-800 text-white text-2xl py-3">4</Key>
                  <Key onClick={() => onCommand('insert', '5')} className="bg-slate-800 text-white text-2xl py-3">5</Key>
                  <Key onClick={() => onCommand('insert', '6')} className="bg-slate-800 text-white text-2xl py-3">6</Key>
               </div>
               {/* Цифры 1-3 */}
               <div className="grid grid-cols-3 gap-2">
                  <Key onClick={() => onCommand('insert', '1')} className="bg-slate-800 text-white text-2xl py-3">1</Key>
                  <Key onClick={() => onCommand('insert', '2')} className="bg-slate-800 text-white text-2xl py-3">2</Key>
                  <Key onClick={() => onCommand('insert', '3')} className="bg-slate-800 text-white text-2xl py-3">3</Key>
               </div>
               {/* Низ: Переключение, 0, Точка */}
               <div className="grid grid-cols-3 gap-2">
                  <Key onClick={() => setIsMainPage(false)} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-sm py-3">#+=</Key>
                  <Key onClick={() => onCommand('insert', '0')} className="bg-slate-800 text-white text-2xl py-3">0</Key>
                  <Key onClick={() => onCommand('insert', '.')} className="bg-slate-800 text-white text-2xl py-3">.</Key>
               </div>
             </>
           ) : (
             // === ВКЛАДКА 2: СИМВОЛЫ ===
             <>
               <div className="grid grid-cols-4 gap-2 h-full content-start">
                  {symbolsKeys.map((k, i) => (
                    <Key key={i} onClick={() => onCommand(k.cmd, k.arg)} className="bg-slate-700 text-cyan-300 py-3">{k.label}</Key>
                  ))}
                  <Key onClick={() => onCommand('insert', '\\pi')} className="bg-slate-700 text-cyan-300 py-3 font-serif">π</Key>
                  <Key onClick={() => onCommand('insert', '^\\circ')} className="bg-slate-700 text-cyan-300 py-3">°</Key>
                  <Key onClick={() => onCommand('insert', '\\tan(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">tan</Key>
                  <Key onClick={() => onCommand('insert', '\\cot(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">cot</Key>
                  {/* Кнопка возврата */}
                  <Key onClick={() => setIsMainPage(true)} className="col-span-4 bg-purple-900/40 border border-purple-500/50 text-purple-300 text-sm py-3 mt-auto">123 (ЦИФРЫ)</Key>
               </div>
             </>
           )}
        </div>

        {/* ПРАВАЯ КОЛОНКА (ОПЕРАТОРЫ) - ВСЕГДА ВИДНА */}
        <div className="w-1/4 flex flex-col gap-2">
           <Key onClick={() => onCommand('insert', '\\frac{#@}{#?}')} className="bg-slate-700 text-white text-xl py-4 flex-1">÷</Key>
           <Key onClick={() => onCommand('insert', '\\cdot')} className="bg-slate-700 text-white text-xl py-4 flex-1">×</Key>
           <Key onClick={() => onCommand('insert', '-')} className="bg-slate-700 text-white text-xl py-4 flex-1">−</Key>
           <Key onClick={() => onCommand('insert', '+')} className="bg-slate-700 text-white text-xl py-4 flex-1">+</Key>
           <Key onClick={() => onCommand('insert', '=')} className="bg-slate-700 text-white text-xl py-4 flex-1">=</Key>
        </div>
      </div>

      {/* САМЫЙ НИЗ: ПРОБЕЛ и ENTER */}
      <div className="grid grid-cols-4 gap-2 mt-1">
         {/* ЛОГАРИФМ (полезный, пусть будет тут) */}
         <Key onClick={() => onCommand('insert', '\\log_{#?}(#@)')} className="bg-slate-700 text-cyan-300 text-sm font-bold">logₐ</Key>
         
         {/* ПРОБЕЛ (ДЛЯ СМЕШАННЫХ ЧИСЕЛ И ВЫХОДА ИЗ ДРОБИ) */}
         <Key onClick={() => onCommand('insert', ' ')} className="col-span-2 bg-slate-600 text-slate-300 border-b-4 border-slate-800 active:border-b-0 active:translate-y-[4px]">
            <Space className="w-6 h-6" />
         </Key>

         {/* ENTER */}
         <Key onClick={onSubmit} className="bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"><CornerDownLeft className="w-6 h-6"/></Key>
      </div>

    </div>
  );
}