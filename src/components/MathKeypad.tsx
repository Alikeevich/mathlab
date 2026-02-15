import { useState, useRef, useEffect, useCallback } from 'react';
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
  const [longPressKey, setLongPressKey] = useState<string | null>(null);
  
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);

  // === ОБРАБОТЧИКИ НАЖАТИЙ ===

  const handlePressStart = (key: string, hasMenu: boolean) => {
    isLongPressTriggered.current = false;
    
    if (hasMenu) {
      longPressTimer.current = setTimeout(() => {
        isLongPressTriggered.current = true;
        setLongPressKey(key);
        // Вибрация
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(50);
        }
      }, 400); // Чуть уменьшил время для отзывчивости (было 500)
    }
  };

  const handlePressEnd = (e: React.SyntheticEvent, action: () => void) => {
    e.preventDefault(); // Важно для предотвращения двойных кликов/зума

    // Очищаем таймер долгого нажатия
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Если долгое нажатие НЕ сработало — значит это обычный клик
    if (!isLongPressTriggered.current) {
      action();
    }
    
    // Сбрасываем флаг
    isLongPressTriggered.current = false;
  };

  const handlePressCancel = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isLongPressTriggered.current = false;
  };

  // === ОБРАБОТКА ENTER НА КЛАВИАТУРЕ ПК ===
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [onSubmit]);

  // === LONG PRESS МЕНЮ ===
  const longPressMenus: { [key: string]: Array<{ label: string; cmd: string; arg: string }> } = {
    'sin': [
      { label: 'arcsin', cmd: 'insert', arg: '\\arcsin(#?)' },
      { label: 'sinh', cmd: 'insert', arg: '\\sinh(#?)' },
      { label: 'arcsinh', cmd: 'insert', arg: '\\text{arcsinh}(#?)' }
    ],
    'cos': [
      { label: 'arccos', cmd: 'insert', arg: '\\arccos(#?)' },
      { label: 'cosh', cmd: 'insert', arg: '\\cosh(#?)' },
      { label: 'arccosh', cmd: 'insert', arg: '\\text{arccosh}(#?)' }
    ],
    'tan': [
      { label: 'arctan', cmd: 'insert', arg: '\\arctan(#?)' },
      { label: 'tanh', cmd: 'insert', arg: '\\tanh(#?)' },
      { label: 'arctanh', cmd: 'insert', arg: '\\text{arctanh}(#?)' }
    ],
    'cot': [
      { label: 'arccot', cmd: 'insert', arg: '\\text{arccot}(#?)' },
      { label: 'coth', cmd: 'insert', arg: '\\coth(#?)' },
      { label: 'arccoth', cmd: 'insert', arg: '\\text{arccoth}(#?)' }
    ],
    'log': [
      { label: 'ln', cmd: 'insert', arg: '\\ln(#?)' },
      { label: 'lg', cmd: 'insert', arg: '\\lg(#?)' },
      { label: 'log₂', cmd: 'insert', arg: '\\log_{2}(#?)' }
    ],
    'sqrt': [
      { label: '∛', cmd: 'insert', arg: '\\sqrt[3]{#?}' },
      { label: '∜', cmd: 'insert', arg: '\\sqrt[4]{#?}' },
      { label: 'ⁿ√', cmd: 'insert', arg: '\\sqrt[#@]{#?}' }
    ]
  };

  // === СИМВОЛЫ ===
  const symbolsKeys = [
    { label: '±', cmd: 'insert', arg: '\\pm' },
    { label: 'C', cmd: 'insert', arg: 'C_{#?}^{#@}' },
    { label: '!', cmd: 'insert', arg: '!' },
    { label: '%', cmd: 'insert', arg: '\\%' },

    { label: '[ ]', cmd: 'insert', arg: '\\left[#?\\right]' },
    { label: '( )', cmd: 'insert', arg: '\\left(#?\\right)' },
    { label: '{ }', cmd: 'insert', arg: '\\left\\{#?\\right\\}' },
    { label: '|a|', cmd: 'insert', arg: '\\left|#?\\right|' },

    { label: '≠', cmd: 'insert', arg: '\\neq' },
    { label: '≈', cmd: 'insert', arg: '\\approx' },
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
    'n', 'm', 'k', 'p',
    'r', 's', 'i', 'j'
  ];

  // === КНОПКА (Универсальная) ===
  const Key = ({ 
    id, 
    label, 
    onClick, 
    className, 
    hasMenu = false,
    children 
  }: any) => (
    <button
      // Используем onPointer события для лучшей поддержки мобилок
      onPointerDown={() => handlePressStart(id, hasMenu)}
      onPointerUp={(e) => handlePressEnd(e, onClick)}
      onPointerLeave={handlePressCancel}
      onPointerCancel={handlePressCancel}
      
      // Отключаем контекстное меню при долгом нажатии
      onContextMenu={(e) => e.preventDefault()}
      
      tabIndex={-1} 
      className={`relative rounded-lg font-bold flex items-center justify-center select-none touch-manipulation transition-transform active:scale-95 active:brightness-110 shadow-[0_2px_0_0_rgba(0,0,0,0.3)] active:shadow-none active:translate-y-[2px] ${className} ${hasMenu ? 'ring-1 ring-cyan-500/20' : ''}`}
    >
      {children || label}
      {hasMenu && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-cyan-400 rounded-full opacity-50" />
      )}
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
    <>
      {/* === LONG PRESS МЕНЮ === */}
      {longPressKey && longPressMenus[longPressKey] && (
        <div 
          className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-end justify-center pb-safe animate-in fade-in duration-150"
          onPointerUp={() => setLongPressKey(null)}
        >
          <div 
            className="bg-slate-800 border-t-2 border-cyan-500 rounded-t-3xl p-4 w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-4 duration-200"
            onPointerUp={(e) => e.stopPropagation()} // Чтобы клик по меню не закрывал его сразу
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Варианты функции</h3>
              <button 
                onClick={() => setLongPressKey(null)}
                className="text-slate-400 hover:text-white px-2 py-1"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {longPressMenus[longPressKey].map((option, idx) => (
                <button
                  key={idx}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    onCommand(option.cmd, option.arg);
                    setLongPressKey(null);
                  }}
                  className="bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white py-4 px-3 rounded-xl font-bold text-sm transition-all active:scale-95"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === ОСНОВНАЯ КЛАВИАТУРА === */}
      <div className="flex flex-col gap-1.5 select-none pb-1 touch-none">
        
        {/* ВЕРХНЯЯ ПАНЕЛЬ - ПЕРЕКЛЮЧАТЕЛЬ СПРАВА */}
        <div className="grid grid-cols-5 gap-1.5">
           <Key onClick={() => onCommand('perform', 'moveToPreviousChar')} className="bg-slate-800 py-2.5 text-slate-400">
             <ArrowLeft className="w-5 h-5"/>
           </Key>
           <Key onClick={() => onCommand('perform', 'moveToNextChar')} className="bg-slate-800 py-2.5 text-slate-400">
             <ArrowRight className="w-5 h-5"/>
           </Key>
           <Key onClick={onDelete} className="bg-red-500/20 text-red-400 py-2.5">
             <Delete className="w-5 h-5"/>
           </Key>
           {/* CLR заметный */}
           <Key onClick={onClear} className="bg-gradient-to-br from-orange-600 to-red-600 text-white font-extrabold text-[10px] uppercase py-2.5 shadow-lg shadow-orange-900/40 border-2 border-orange-400/30">
             CLR
           </Key>
           {/* ПЕРЕКЛЮЧАТЕЛЬ ВСЕГДА ЗДЕСЬ - ФИКСИРОВАННОЕ ПОЛОЖЕНИЕ */}
           <Key onClick={toggleTab} className="bg-purple-900/40 border-2 border-purple-500/60 text-purple-200 font-extrabold text-xs py-2.5 shadow-lg">
             {getTabLabel()}
           </Key>
        </div>

        <div className="flex gap-1.5">
          
          {/* ЛЕВАЯ ЧАСТЬ */}
          <div className="flex-1 flex flex-col gap-1.5">
             
             {activeTab === 'num' && (
               <>
                 {/* ТРИГОНОМЕТРИЯ С LONG PRESS */}
                 <div className="grid grid-cols-4 gap-1.5">
                    <Key 
                      id="sin"
                      hasMenu={true}
                      onClick={() => onCommand('insert', '\\sin(#?)')} 
                      className="bg-slate-700 text-cyan-300 text-xs py-2.5"
                    >
                      sin
                    </Key>
                    <Key 
                      id="cos"
                      hasMenu={true}
                      onClick={() => onCommand('insert', '\\cos(#?)')} 
                      className="bg-slate-700 text-cyan-300 text-xs py-2.5"
                    >
                      cos
                    </Key>
                    <Key 
                      id="tan"
                      hasMenu={true}
                      onClick={() => onCommand('insert', '\\tan(#?)')} 
                      className="bg-slate-700 text-cyan-300 text-xs py-2.5"
                    >
                      tan
                    </Key>
                    <Key 
                      id="cot"
                      hasMenu={true}
                      onClick={() => onCommand('insert', '\\cot(#?)')} 
                      className="bg-slate-700 text-cyan-300 text-xs py-2.5"
                    >
                      cot
                    </Key>
                 </div>
                 
                 {/* ЦИФРЫ 3x3 */}
                  <div className="grid grid-cols-3 gap-1.5">
                     <Key onClick={() => onCommand('insert', '0')}>
                       0
                     </Key>
                     <Key onClick={() => onCommand('insert', '.')}>
                       ,
                     </Key>
                     <Key onClick={() => onCommand('insert', ';')}>
                       ;
                     </Key>
                  </div>

 => onCommand('insert', '.')} className="bg-slate-800 text-white text-xl py-3">
                      ,
                    </Key>
                    <Key onClick={() => onCommand('insert', ';')} className="bg-slate-800 text-white text-xl py-3">
                      ;
                    </Key>
                 </div>
               </>
             )}

             {activeTab === 'abc' && (
               <>
                 {/* ГРЕЧЕСКИЕ */}
                 <div className="grid grid-cols-4 gap-1.5">
                    <Key onClick={() => onCommand('insert', '\\alpha')} className="bg-slate-700 text-cyan-300 py-2.5">
                      α
                    </Key>
                    <Key onClick={() => onCommand('insert', '\\beta')} className="bg-slate-700 text-cyan-300 py-2.5">
                      β
                    </Key>
                    <Key onClick={() => onCommand('insert', '\\pi')} className="bg-slate-700 text-cyan-300 py-2.5 font-serif">
                      π
                    </Key>
                    <Key onClick={() => onCommand('insert', '\\theta')} className="bg-slate-700 text-cyan-300 py-2.5">
                      θ
                    </Key>
                 </div>

                 {/* ЛАТИНСКИЕ */}
                 <div className="grid grid-cols-4 gap-1.5">
                    {lettersKeys.map((char) => (
                      <Key key={char} onClick={() => onCommand('insert', char)} className="bg-slate-700 text-white text-lg py-3 font-serif italic">
                        {char}
                      </Key>
                    ))}
                 </div>
               </>
             )}

             {activeTab === 'sym' && (
               <>
                 <div className="grid grid-cols-4 gap-1.5">
                    {symbolsKeys.map((k, i) => (
                      <Key 
                        key={i} 
                        onClick={() => onCommand(k.cmd, k.arg)} 
                        className="bg-slate-700 text-cyan-300 py-3 text-sm"
                      >
                        {k.label}
                      </Key>
                    ))}
                    
                    {/* ФУНКЦИИ С LONG PRESS */}
                    <Key 
                      id="sqrt"
                      hasMenu={true}
                      onClick={() => onCommand('insert', '\\sqrt{#?}')} 
                      className="bg-slate-700 text-cyan-300 py-3"
                    >
                      √
                    </Key>
                    <Key onClick={() => onCommand('insert', '#@^{#?}')} className="bg-slate-700 text-cyan-300 py-3 text-sm">
                      xⁿ
                    </Key>
                    <Key onClick={() => onCommand('insert', '^\\circ')} className="bg-slate-700 text-cyan-300 py-3">
                      °
                    </Key>
                    <div></div> {/* Пустое место */}
                 </div>
               </>
             )}
          </div>

          {/* ПРАВАЯ КОЛОНКА - ОПЕРАЦИИ */}
          <div className="w-1/5 flex flex-col gap-1.5">
             <Key onClick={() => onCommand('insert', '\\frac{#@}{#?}')} className="bg-gradient-to-br from-orange-600 to-orange-700 text-white text-xl py-4 flex-1 shadow-lg">
               ÷
             </Key>
             <Key onClick={() => onCommand('insert', '\\cdot')} className="bg-gradient-to-br from-blue-600 to-blue-700 text-white text-xl py-4 flex-1 shadow-lg">
               ×
             </Key>
             <Key onClick={() => onCommand('insert', '-')} className="bg-gradient-to-br from-red-600 to-red-700 text-white text-xl py-4 flex-1 shadow-lg">
               −
             </Key>
             <Key onClick={() => onCommand('insert', '+')} className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white text-xl py-4 flex-1 shadow-lg">
               +
             </Key>
             <Key onClick={() => onCommand('insert', '=')} className="bg-gradient-to-br from-slate-600 to-slate-700 text-white text-xl py-4 flex-1 shadow-lg">
               =
             </Key>
          </div>
        </div>

        {/* НИЖНЯЯ ПАНЕЛЬ */}
        <div className="grid grid-cols-4 gap-1.5">
           <Key 
             id="log"
             hasMenu={true}
             onClick={() => onCommand('insert', '\\log_{#?}(#@)')} 
             className="bg-slate-700 text-cyan-300 text-xs font-bold py-3"
           >
             log
           </Key>
           <Key 
             onClick={() => onCommand('insert', '\\,')} 
             className="col-span-2 bg-slate-600 text-slate-300 border-b-4 border-slate-800 active:border-b-0 active:translate-y-[4px] py-3"
           >
             <Space className="w-5 h-5" />
           </Key>
           {/* ENTER ВНИЗУ СПРАВА */}
           <Key onClick={onSubmit} className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-900/50 py-3 border-2 border-emerald-400/30">
             <CornerDownLeft className="w-6 h-6"/>
           </Key>
        </div>

      </div>
    </>
  );
}