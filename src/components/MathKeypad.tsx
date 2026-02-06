import { useState } from 'react';
import { Delete, ArrowLeft, ArrowRight, CornerDownLeft, Space } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

type Tab = 'num' | 'abc' | 'sym';

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  const [activeTab, setActiveTab] = useState<Tab>('num');

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

  // ========== НОВЫЕ СИМВОЛЫ С TAN/COT ==========
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

  const lettersKeys = [
    'x', 'y', 'z', 't',
    'a', 'b', 'c', 'd',
    'm', 'n', 'k', 'p',
    'u', 'v', 'S', 'f'
  ];

  const Key = ({ label, onClick, className, children }: any) => (
    <button
      onPointerDown={preventAll}
      onTouchStart={preventAll}
      onClick={handleSafeClick(onClick)}
      tabIndex={-1} 
      className={`relative rounded-lg font-bold flex items-center justify-center transition-all active:scale-95 shadow-[0_2px_0_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[2px] ${className}`}
      style={{ touchAction: 'none' }}
    >
      {children || label}
    </button>
  );

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
    <div className="flex flex-col gap-1.5 select-none pb-1" style={{ touchAction: 'none' }}>
      
      {/* ВЕРХНЯЯ ПАНЕЛЬ (компактнее) */}
      <div className="grid grid-cols-4 gap-1.5">
         <Key onClick={() => onCommand('perform', 'moveToPreviousChar')} className="bg-slate-800 py-2 text-slate-400">
           <ArrowLeft className="w-5 h-5"/>
         </Key>
         <Key onClick={() => onCommand('perform', 'moveToNextChar')} className="bg-slate-800 py-2 text-slate-400">
           <ArrowRight className="w-5 h-5"/>
         </Key>
         <Key onClick={onDelete} className="bg-red-500/20 text-red-400 py-2">
           <Delete className="w-5 h-5"/>
         </Key>
         <Key onClick={onClear} className="bg-slate-800 text-slate-500 text-[10px] uppercase py-2">
           СБРОС
         </Key>
      </div>

      <div className="flex gap-1.5">
        
        <div className="flex-1 flex flex-col gap-1.5">
           
           {activeTab === 'num' && (
             <>
               {/* ========== ДОБАВЛЕНЫ TAN И COT ========== */}
               <div className="grid grid-cols-4 gap-1.5">
                  <Key onClick={() => onCommand('insert', '\\sin(#?)')} className="bg-slate-700 text-cyan-300 text-xs py-2">
                    sin
                  </Key>
                  <Key onClick={() => onCommand('insert', '\\cos(#?)')} className="bg-slate-700 text-cyan-300 text-xs py-2">
                    cos
                  </Key>
                  <Key onClick={() => onCommand('insert', '\\tan(#?)')} className="bg-slate-700 text-cyan-300 text-xs py-2">
                    tan
                  </Key>
                  <Key onClick={() => onCommand('insert', '\\cot(#?)')} className="bg-slate-700 text-cyan-300 text-xs py-2">
                    cot
                  </Key>
               </div>
               
               <div className="grid grid-cols-3 gap-1.5">
                  {['7','8','9','4','5','6','1','2','3'].map(n => (
                    <Key key={n} onClick={() => onCommand('insert', n)} className="bg-slate-800 text-white text-xl py-2.5">
                      {n}
                    </Key>
                  ))}
               </div>
               <div className="grid grid-cols-3 gap-1.5">
                  <Key onClick={toggleTab} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-xs py-2.5">
                    {getTabLabel()}
                  </Key>
                  <Key onClick={() => onCommand('insert', '0')} className="bg-slate-800 text-white text-xl py-2.5">
                    0
                  </Key>
                  <Key onClick={() => onCommand('insert', '.')} className="bg-slate-800 text-white text-xl py-2.5">
                    .
                  </Key>
               </div>
             </>
           )}

           {activeTab === 'abc' && (
             <>
               <div className="grid grid-cols-4 gap-1.5 h-full content-start">
                  {lettersKeys.map((char) => (
                    <Key key={char} onClick={() => onCommand('insert', char)} className="bg-slate-700 text-white text-lg py-2.5 font-serif italic">
                      {char}
                    </Key>
                  ))}
                  <Key onClick={() => onCommand('insert', '\\alpha')} className="bg-slate-700 text-cyan-300 py-2.5">
                    α
                  </Key>
                  <Key onClick={() => onCommand('insert', '\\beta')} className="bg-slate-700 text-cyan-300 py-2.5">
                    β
                  </Key>
                  <Key onClick={() => onCommand('insert', '\\pi')} className="bg-slate-700 text-cyan-300 py-2.5 font-serif">
                    π
                  </Key>
                  
                  <Key onClick={toggleTab} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-xs py-2.5">
                    {getTabLabel()}
                  </Key>
               </div>
             </>
           )}

           {activeTab === 'sym' && (
             <>
               <div className="grid grid-cols-4 gap-1.5 h-full content-start">
                  {symbolsKeys.map((k, i) => (
                    <Key key={i} onClick={() => onCommand(k.cmd, k.arg)} className="bg-slate-700 text-cyan-300 py-2.5 text-sm">
                      {k.label}
                    </Key>
                  ))}
                  {/* ========== ДОБАВЛЕН √ И x^n ========== */}
                  <Key onClick={() => onCommand('insert', '\\sqrt{#?}')} className="bg-slate-700 text-cyan-300 py-2.5">
                    √
                  </Key>
                  <Key onClick={() => onCommand('insert', '#@^{#?}')} className="bg-slate-700 text-cyan-300 py-2.5 text-sm">
                    xⁿ
                  </Key>
                  <Key onClick={() => onCommand('insert', '^\\circ')} className="bg-slate-700 text-cyan-300 py-2.5">
                    °
                  </Key>
                  
                  <Key onClick={toggleTab} className="bg-purple-900/40 border border-purple-500/50 text-purple-300 text-xs py-2.5">
                    {getTabLabel()}
                  </Key>
               </div>
             </>
           )}
        </div>

        {/* ПРАВАЯ КОЛОНКА (компактнее) */}
        <div className="w-1/4 flex flex-col gap-1.5">
           <Key onClick={() => onCommand('insert', '\\frac{#@}{#?}')} className="bg-slate-700 text-white text-lg py-3 flex-1">
             ÷
           </Key>
           <Key onClick={() => onCommand('insert', '\\cdot')} className="bg-slate-700 text-white text-lg py-3 flex-1">
             ×
           </Key>
           <Key onClick={() => onCommand('insert', '-')} className="bg-slate-700 text-white text-lg py-3 flex-1">
             −
           </Key>
           <Key onClick={() => onCommand('insert', '+')} className="bg-slate-700 text-white text-lg py-3 flex-1">
             +
           </Key>
           <Key onClick={() => onCommand('insert', '=')} className="bg-slate-700 text-white text-lg py-3 flex-1">
             =
           </Key>
        </div>
      </div>

      {/* НИЖНЯЯ ПАНЕЛЬ (компактнее) */}
      <div className="grid grid-cols-4 gap-1.5">
         <Key onClick={() => onCommand('insert', '\\log_{#?}(#@)')} className="bg-slate-700 text-cyan-300 text-xs font-bold py-2">
           log
         </Key>
         <Key 
           onClick={() => onCommand('insert', '\\,')} 
           className="col-span-2 bg-slate-600 text-slate-300 border-b-4 border-slate-800 active:border-b-0 active:translate-y-[4px] py-2"
         >
           <Space className="w-5 h-5" />
         </Key>
         <Key onClick={onSubmit} className="bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 py-2">
           <CornerDownLeft className="w-5 h-5"/>
         </Key>
      </div>

    </div>
  );
}