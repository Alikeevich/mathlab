import { useState } from 'react';
import { Delete, ArrowLeft, ArrowRight, CornerDownLeft } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  const [isMainPage, setIsMainPage] = useState(true);

  // === ГЛАВНАЯ ЗАЩИТА ===
  // Эта функция должна убивать любые попытки браузера сместить фокус
  const handlePress = (e: React.SyntheticEvent, action: () => void) => {
    // 1. Не даем браузеру обработать нажатие как "смену фокуса"
    e.preventDefault();
    // 2. Останавливаем всплытие, чтобы родители не реагировали
    e.stopPropagation();
    // 3. Выполняем действие
    action();
  };

  // Символы для 2-й страницы
  const symbolsKeys = [
    { label: '[ ]', cmd: 'insert', arg: '\\left[#?\\right]' },
    { label: '( )', cmd: 'insert', arg: '\\left(#?\\right)' },
    { label: '{ }', cmd: 'insert', arg: '\\left\\{#?\\right\\}' },
    { label: '|x|', cmd: 'insert', arg: '\\left|#?\\right|' },
    { label: '=', cmd: 'insert', arg: '=' },
    { label: '≠', cmd: 'insert', arg: '\\neq' },
    { label: '≈', cmd: 'insert', arg: '\\approx' },
    { label: '!', cmd: 'insert', arg: '!' },
    { label: ';', cmd: 'insert', arg: ';' },
    { label: ':', cmd: 'insert', arg: ':' },
    { label: '∞', cmd: 'insert', arg: '\\infty' },
    { label: '∅', cmd: 'insert', arg: '\\emptyset' },
    { label: '<', cmd: 'insert', arg: '<' },
    { label: '>', cmd: 'insert', arg: '>' },
    { label: '≤', cmd: 'insert', arg: '\\le' },
    { label: '≥', cmd: 'insert', arg: '\\ge' },
  ];

  // Вспомогательный компонент кнопки, чтобы не дублировать код
  const Key = ({ label, onClick, className, children }: any) => (
    <button
      // Вешаем обработчик на PointerDown - это срабатывает раньше всего
      onPointerDown={(e) => handlePress(e, onClick)}
      // Дублируем на TouchStart для надежности на старых iOS
      onTouchStart={(e) => e.preventDefault()} 
      className={className}
    >
      {label || children}
    </button>
  );

  return (
    <div className="flex flex-col gap-2 select-none touch-none pb-4">
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="grid grid-cols-4 gap-2 mb-1">
         <Key onClick={() => onCommand('perform', 'moveToPreviousChar')} className="bg-slate-800 rounded-lg p-3 text-slate-400 flex justify-center active:bg-slate-700 shadow-sm"><ArrowLeft className="w-5 h-5"/></Key>
         <Key onClick={() => onCommand('perform', 'moveToNextChar')} className="bg-slate-800 rounded-lg p-3 text-slate-400 flex justify-center active:bg-slate-700 shadow-sm"><ArrowRight className="w-5 h-5"/></Key>
         <Key onClick={onDelete} className="bg-red-500/20 text-red-400 rounded-lg p-3 flex justify-center active:bg-red-500/30 shadow-sm"><Delete className="w-5 h-5"/></Key>
         <Key onClick={onSubmit} className="bg-emerald-600 text-white rounded-lg p-3 flex justify-center active:scale-95 shadow-lg"><CornerDownLeft className="w-5 h-5"/></Key>
      </div>

      {isMainPage ? (
        <div className="grid grid-cols-5 gap-2">
          {/* ЛЕВАЯ КОЛОНКА */}
          <div className="col-span-2 grid grid-cols-2 gap-2">
             <Key onClick={() => onCommand('insert', '\\sin(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white shadow-md">sin</Key>
             <Key onClick={() => onCommand('insert', '\\cos(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white shadow-md">cos</Key>
             <Key onClick={() => onCommand('insert', '\\tan(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white shadow-md">tan</Key>
             <Key onClick={() => onCommand('insert', '\\cot(#?)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white shadow-md">cot</Key>
             <Key onClick={() => onCommand('insert', '\\log_{#?}(#@)')} className="bg-slate-700 rounded-xl py-3 text-sm font-bold text-white shadow-md">log</Key>
             <Key onClick={() => onCommand('insert', '\\frac{#@}{#?}')} className="bg-slate-700 rounded-xl py-3 text-lg font-bold text-white shadow-md">÷</Key>
             <Key onClick={() => onCommand('insert', '\\sqrt{#?}')} className="bg-slate-700 rounded-xl py-3 text-white shadow-md">√</Key>
             <Key onClick={() => onCommand('insert', '#@^{#?}')} className="bg-slate-700 rounded-xl py-3 text-white shadow-md">xⁿ</Key>
          </div>

          {/* ПРАВАЯ КОЛОНКА (Цифры) */}
          <div className="col-span-3 grid grid-cols-3 gap-2">
             {['7','8','9','4','5','6','1','2','3'].map(num => (
               <Key key={num} onClick={() => onCommand('insert', num)} className="bg-slate-800 active:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white shadow-sm">{num}</Key>
             ))}
             <Key onClick={() => onCommand('insert', '.')} className="bg-slate-800 active:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white">.</Key>
             <Key onClick={() => onCommand('insert', '0')} className="bg-slate-800 active:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white">0</Key>
             <Key onClick={() => onCommand('insert', ',')} className="bg-slate-800 active:bg-slate-700 rounded-xl py-3 text-xl font-bold text-white">,</Key>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 h-[220px]">
          {symbolsKeys.map((key, idx) => (
            <Key key={idx} onClick={() => onCommand(key.cmd, key.arg)} className="bg-slate-700 active:bg-slate-600 rounded-xl text-lg font-bold text-cyan-300 shadow-sm">{key.label}</Key>
          ))}
        </div>
      )}

      {/* НИЖНИЙ РЯД */}
      <div className="grid grid-cols-4 gap-2 mt-1">
         <Key onClick={() => setIsMainPage(!isMainPage)} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-xs font-bold uppercase rounded-xl py-4 flex flex-col items-center justify-center leading-none">
            <span className="text-lg mb-0.5">{isMainPage ? '#+=' : '123'}</span>
         </Key>
         <Key onClick={() => onCommand('insert', '-')} className="bg-slate-700 text-white text-xl font-bold rounded-xl py-4 shadow-md">−</Key>
         <Key onClick={() => onCommand('insert', '+')} className="bg-slate-700 text-white text-xl font-bold rounded-xl py-4 shadow-md">+</Key>
         <Key onClick={onClear} className="bg-slate-800 text-slate-500 text-xs font-bold uppercase rounded-xl py-4">СБРОС</Key>
      </div>
    </div>
  );
}