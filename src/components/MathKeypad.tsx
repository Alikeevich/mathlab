import { useState } from 'react';
import { Delete, ArrowLeft, ArrowRight, CornerDownLeft, Space } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

// Тип для вкладок клавиатуры
type Tab = 'num' | 'abc' | 'sym';

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  // Состояние: теперь 3 режима вместо 2
  const [activeTab, setActiveTab] = useState<Tab>('num');

  // ЯДЕРНАЯ ЗАЩИТА ОТ СКАЧКОВ (Оставляем как было, это святое)
  const preventAll = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSafeClick = (action: () => void) => {
    return (e: React.MouseEvent | React.TouchEvent) => {
      preventAll(e);
      action();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      requestAnimationFrame(() => {
        window.scrollTo(scrollX, scrollY);
      });
    };
  };

  // === НАБОРЫ КНОПОК ===

  // 1. Символы (бывшая 2-я страница)
  const symbolsKeys = [
    { label: '[ ]', cmd: 'insert', arg: '\\left[#?\\right]' },
    { label: '( )', cmd: 'insert', arg: '\\left(#?\\right)' },
    { label: '{ }', cmd: 'insert', arg: '\\left\\{#?\\right\\}' },
    { label: '|a|', cmd: 'insert', arg: '\\left|#?\\right|' },

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

  // 2. Буквы (НОВОЕ) - Самые частые переменные в школе
  const lettersKeys = [
    'x', 'y', 'z', 't',
    'a', 'b', 'c', 'd',
    'm', 'n', 'k', 'p',
    'u', 'v', 'S', 'f'
  ];

  // Компонент Кнопки (с защитой)
  const Key = ({ label, onClick, className, children }: any) => (
    <button
      onPointerDown={preventAll}
      onTouchStart={preventAll}
      onClick={handleSafeClick(onClick)}
      tabIndex={-1} 
      className={`relative rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 shadow-[0_2px_0_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[2px] ${className}`}
      style={{ touchAction: 'none' }}
    >
      {children || label}
    </button>
  );

  // Логика переключения вкладки
  const toggleTab = () => {
    if (activeTab === 'num') setActiveTab('abc');
    else if (activeTab === 'abc') setActiveTab('sym');
    else setActiveTab('num');
  };

  const getTabLabel = () => {
    if (activeTab === 'num') return 'ABC';
    if (activeTab === 'abc') return '#+=';
    return '123';
  };

  return (
    <div className="flex flex-col gap-2 select-none pb-2" style={{ touchAction: 'none' }}>
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ */}
      <div className="grid grid-cols-4 gap-2 mb-1">
         <Key onClick={() => onCommand('perform', 'moveToPreviousChar')} className="bg-slate-800 py-3 text-slate-400"><ArrowLeft className="w-6 h-6"/></Key>
         <Key onClick={() => onCommand('perform', 'moveToNextChar')} className="bg-slate-800 py-3 text-slate-400"><ArrowRight className="w-6 h-6"/></Key>
         <Key onClick={onDelete} className="bg-red-500/20 text-red-400 py-3"><Delete className="w-6 h-6"/></Key>
         <Key onClick={onClear} className="bg-slate-800 text-slate-500 text-xs uppercase py-3">СБРОС</Key>
      </div>

      <div className="flex gap-2">
        
        {/* ЛЕВАЯ ЧАСТЬ (МЕНЯЕТСЯ) */}
        <div className="flex-1 flex flex-col gap-2">
           
           {activeTab === 'num' && (
             // === ЦИФРЫ ===
             <>
               <div className="grid grid-cols-4 gap-2">
                  <Key onClick={() => onCommand('insert', '\\sin(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">sin</Key>
                  <Key onClick={() => onCommand('insert', '\\cos(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">cos</Key>
                  <Key onClick={() => onCommand('insert', '\\sqrt{#?}')} className="bg-slate-700 text-cyan-300 py-3">√</Key>
                  <Key onClick={() => onCommand('insert', '#@^{#?}')} className="bg-slate-700 text-cyan-300 py-3">xⁿ</Key>
               </div>
               
               <div className="grid grid-cols-3 gap-2">
                  {['7','8','9','4','5','6','1','2','3'].map(n => (
                    <Key key={n} onClick={() => onCommand('insert', n)} className="bg-slate-800 text-white text-2xl py-3">{n}</Key>
                  ))}
               </div>
               <div className="grid grid-cols-3 gap-2">
                  {/* Кнопка переключения */}
                  <Key onClick={toggleTab} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-sm py-3">{getTabLabel()}</Key>
                  <Key onClick={() => onCommand('insert', '0')} className="bg-slate-800 text-white text-2xl py-3">0</Key>
                  <Key onClick={() => onCommand('insert', '.')} className="bg-slate-800 text-white text-2xl py-3">.</Key>
               </div>
             </>
           )}

           {activeTab === 'abc' && (
             // === БУКВЫ (НОВАЯ ВКЛАДКА) ===
             <>
               <div className="grid grid-cols-4 gap-2 h-full content-start">
                  {lettersKeys.map((char) => (
                    <Key key={char} onClick={() => onCommand('insert', char)} className="bg-slate-700 text-white text-xl py-3 font-serif italic">
                      {char}
                    </Key>
                  ))}
                  {/* Греческие (бонус) */}
                  <Key onClick={() => onCommand('insert', '\\alpha')} className="bg-slate-700 text-cyan-300 py-3">α</Key>
                  <Key onClick={() => onCommand('insert', '\\beta')} className="bg-slate-700 text-cyan-300 py-3">β</Key>
                  <Key onClick={() => onCommand('insert', '\\pi')} className="bg-slate-700 text-cyan-300 py-3 font-serif">π</Key>
                  
                  {/* Кнопка возврата к цифрам */}
                  <Key onClick={toggleTab} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-sm py-3">{getTabLabel()}</Key>
               </div>
             </>
           )}

           {activeTab === 'sym' && (
             // === СИМВОЛЫ ===
             <>
               <div className="grid grid-cols-4 gap-2 h-full content-start">
                  {symbolsKeys.map((k, i) => (
                    <Key key={i} onClick={() => onCommand(k.cmd, k.arg)} className="bg-slate-700 text-cyan-300 py-3">{k.label}</Key>
                  ))}
                  <Key onClick={() => onCommand('insert', '\\tan(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">tan</Key>
                  <Key onClick={() => onCommand('insert', '\\cot(#?)')} className="bg-slate-700 text-cyan-300 text-sm py-3">cot</Key>
                  <Key onClick={() => onCommand('insert', '^\\circ')} className="bg-slate-700 text-cyan-300 py-3">°</Key>
                  
                  <Key onClick={toggleTab} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-sm py-3">{getTabLabel()}</Key>
               </div>
             </>
           )}
        </div>

        {/* ПРАВАЯ КОЛОНКА (ОСТАЕТСЯ ВСЕГДА) */}
        <div className="w-1/4 flex flex-col gap-2">
           <Key onClick={() => onCommand('insert', '\\frac{#@}{#?}')} className="bg-slate-700 text-white text-xl py-4 flex-1">÷</Key>
           <Key onClick={() => onCommand('insert', '\\cdot')} className="bg-slate-700 text-white text-xl py-4 flex-1">×</Key>
           <Key onClick={() => onCommand('insert', '-')} className="bg-slate-700 text-white text-xl py-4 flex-1">−</Key>
           <Key onClick={() => onCommand('insert', '+')} className="bg-slate-700 text-white text-xl py-4 flex-1">+</Key>
           <Key onClick={() => onCommand('insert', '=')} className="bg-slate-700 text-white text-xl py-4 flex-1">=</Key>
        </div>
      </div>

      {/* НИЖНЯЯ ПАНЕЛЬ */}
      <div className="grid grid-cols-4 gap-2 mt-1">
         <Key onClick={() => onCommand('insert', '\\log_{#?}(#@)')} className="bg-slate-700 text-cyan-300 text-sm font-bold">logₐ</Key>
         
         <Key onClick={onSubmit} className="bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"><CornerDownLeft className="w-6 h-6"/></Key>
      </div>

    </div>
  );
}