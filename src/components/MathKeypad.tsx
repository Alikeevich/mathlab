import { useState } from 'react';
import { Delete, ArrowLeft, ArrowRight, CornerDownLeft, Space } from 'lucide-react';

type MathKeypadProps = {
  onCommand: (cmd: string, arg?: string) => void;
  onDelete: () => void;
  onClear: () => void;
  onSubmit: () => void;
};

type Tab = 'num' | 'abc' | 'fun';

export function MathKeypad({ onCommand, onDelete, onClear, onSubmit }: MathKeypadProps) {
  const [activeTab, setActiveTab] = useState<Tab>('num');

  // ЯДЕРНАЯ ЗАЩИТА ОТ ПРЫЖКОВ (как и раньше)
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

  // Компонент Кнопки
  const Key = ({ label, onClick, className, children, width = 'col-span-1' }: any) => (
    <button
      onPointerDown={preventAll}
      onTouchStart={preventAll}
      onClick={handleSafeClick(onClick)}
      tabIndex={-1}
      className={`
        relative rounded-lg font-bold flex items-center justify-center transition-all 
        active:scale-95 shadow-[0_2px_0_0_rgba(0,0,0,0.3)] 
        active:shadow-none active:translate-y-[2px]
        py-3 text-lg md:text-xl
        ${width}
        ${className}
      `}
      style={{ touchAction: 'none' }}
    >
      {children || label}
    </button>
  );

  // Компонент переключателя вкладок
  const TabButton = ({ id, label }: { id: Tab, label: string }) => (
    <Key 
      onClick={() => setActiveTab(id)}
      className={`text-xs font-bold uppercase border-b-4 ${
        activeTab === id 
        ? 'bg-cyan-600 text-white border-cyan-800' 
        : 'bg-slate-800 text-slate-400 border-slate-900'
      }`}
    >
      {label}
    </Key>
  );

  return (
    <div className="flex flex-col gap-2 select-none pb-2 bg-slate-900/50 p-2 rounded-t-2xl backdrop-blur-sm border-t border-white/10" style={{ touchAction: 'none' }}>
      
      {/* 1. ВЕРХНЯЯ СТРОКА: НАВИГАЦИЯ И УДАЛЕНИЕ */}
      <div className="grid grid-cols-5 gap-2 mb-1">
         <Key onClick={() => onCommand('perform', 'moveToPreviousChar')} className="bg-slate-800 text-slate-400"><ArrowLeft className="w-5 h-5"/></Key>
         <Key onClick={() => onCommand('perform', 'moveToNextChar')} className="bg-slate-800 text-slate-400"><ArrowRight className="w-5 h-5"/></Key>
         {/* Пробел (важен для смешанных дробей) */}
         <Key onClick={() => onCommand('insert', ' ')} className="bg-slate-800 text-slate-400"><Space className="w-5 h-5"/></Key>
         <Key onClick={onDelete} className="bg-red-500/20 text-red-400"><Delete className="w-5 h-5"/></Key>
         <Key onClick={onClear} className="bg-slate-800 text-slate-500 text-[10px]">СБРОС</Key>
      </div>

      {/* 2. ОСНОВНАЯ ЗОНА (МЕНЯЕТСЯ) */}
      <div className="h-[220px]"> {/* Фиксированная высота, чтобы не прыгало */}
        
        {/* === ВКЛАДКА 1: ЦИФРЫ (NUM) === */}
        {activeTab === 'num' && (
          <div className="grid grid-cols-5 gap-2 h-full">
            {/* Переменные x,y,z всегда под рукой */}
            <div className="flex flex-col gap-2">
               <Key onClick={() => onCommand('insert', 'x')} className="bg-slate-700 text-cyan-300 flex-1">x</Key>
               <Key onClick={() => onCommand('insert', 'y')} className="bg-slate-700 text-cyan-300 flex-1">y</Key>
               <Key onClick={() => onCommand('insert', 'z')} className="bg-slate-700 text-cyan-300 flex-1">z</Key>
               <Key onClick={() => onCommand('insert', 't')} className="bg-slate-700 text-cyan-300 flex-1">t</Key>
            </div>

            {/* Цифровая панель */}
            <div className="col-span-3 grid grid-cols-3 gap-2">
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map(n => (
                <Key key={n} onClick={() => onCommand('insert', n.toString())} className="bg-slate-800 text-white text-2xl">{n}</Key>
              ))}
              <Key onClick={() => onCommand('insert', '0')} width="col-span-2" className="bg-slate-800 text-white text-2xl">0</Key>
              <Key onClick={() => onCommand('insert', '.')} className="bg-slate-800 text-white text-2xl">.</Key>
            </div>

            {/* Операторы */}
            <div className="flex flex-col gap-2">
               <Key onClick={() => onCommand('insert', '\\frac{#@}{#?}')} className="bg-slate-700 text-white flex-1">÷</Key>
               <Key onClick={() => onCommand('insert', '\\cdot')} className="bg-slate-700 text-white flex-1">×</Key>
               <Key onClick={() => onCommand('insert', '-')} className="bg-slate-700 text-white flex-1">−</Key>
               <Key onClick={() => onCommand('insert', '+')} className="bg-slate-700 text-white flex-1">+</Key>
            </div>
          </div>
        )}

        {/* === ВКЛАДКА 2: БУКВЫ (ABC) === */}
        {activeTab === 'abc' && (
          <div className="grid grid-cols-5 gap-2 h-full content-start">
             {/* Латиница (самые частые) */}
             {['a','b','c','d','m'].map(l => <Key key={l} onClick={() => onCommand('insert', l)} className="bg-slate-700 text-cyan-200">{l}</Key>)}
             {['n','p','q','k','u'].map(l => <Key key={l} onClick={() => onCommand('insert', l)} className="bg-slate-700 text-cyan-200">{l}</Key>)}
             {['v','S','F','h','r'].map(l => <Key key={l} onClick={() => onCommand('insert', l)} className="bg-slate-700 text-cyan-200">{l}</Key>)}

             {/* Греческие */}
             <Key onClick={() => onCommand('insert', '\\alpha')} className="bg-slate-800 text-amber-300">α</Key>
             <Key onClick={() => onCommand('insert', '\\beta')} className="bg-slate-800 text-amber-300">β</Key>
             <Key onClick={() => onCommand('insert', '\\gamma')} className="bg-slate-800 text-amber-300">γ</Key>
             <Key onClick={() => onCommand('insert', '\\varphi')} className="bg-slate-800 text-amber-300">φ</Key>
             <Key onClick={() => onCommand('insert', '\\pi')} className="bg-slate-800 text-amber-300">π</Key>

             {/* Знаки сравнения и логика */}
             <Key onClick={() => onCommand('insert', '=')} className="bg-slate-600 text-white">=</Key>
             <Key onClick={() => onCommand('insert', '>')} className="bg-slate-600 text-white">&gt;</Key>
             <Key onClick={() => onCommand('insert', '<')} className="bg-slate-600 text-white">&lt;</Key>
             <Key onClick={() => onCommand('insert', '\\ge')} className="bg-slate-600 text-white">≥</Key>
             <Key onClick={() => onCommand('insert', '\\le')} className="bg-slate-600 text-white">≤</Key>
          </div>
        )}

        {/* === ВКЛАДКА 3: ФУНКЦИИ (FUN) === */}
        {activeTab === 'fun' && (
          <div className="grid grid-cols-4 gap-2 h-full content-start">
             {/* Тригонометрия */}
             <Key onClick={() => onCommand('insert', '\\sin(#?)')} className="bg-slate-800 text-white text-sm">sin</Key>
             <Key onClick={() => onCommand('insert', '\\cos(#?)')} className="bg-slate-800 text-white text-sm">cos</Key>
             <Key onClick={() => onCommand('insert', '\\tan(#?)')} className="bg-slate-800 text-white text-sm">tg</Key>
             <Key onClick={() => onCommand('insert', '\\cot(#?)')} className="bg-slate-800 text-white text-sm">ctg</Key>
             
             {/* Обратные триг */}
             <Key onClick={() => onCommand('insert', '\\arcsin(#?)')} className="bg-slate-800 text-slate-300 text-xs">asin</Key>
             <Key onClick={() => onCommand('insert', '\\arccos(#?)')} className="bg-slate-800 text-slate-300 text-xs">acos</Key>
             <Key onClick={() => onCommand('insert', '\\arctan(#?)')} className="bg-slate-800 text-slate-300 text-xs">atg</Key>
             <Key onClick={() => onCommand('insert', '\\text{arcctg}(#?)')} className="bg-slate-800 text-slate-300 text-xs">actg</Key>

             {/* Алгебра */}
             <Key onClick={() => onCommand('insert', '\\sqrt{#?}')} className="bg-slate-700 text-cyan-300">√</Key>
             <Key onClick={() => onCommand('insert', '\\sqrt[#?]{#@}')} className="bg-slate-700 text-cyan-300 text-xs">ⁿ√</Key>
             <Key onClick={() => onCommand('insert', '#@^{#?}')} className="bg-slate-700 text-cyan-300">xⁿ</Key>
             <Key onClick={() => onCommand('insert', '\\log_{#?}(#@)')} className="bg-slate-700 text-cyan-300 text-sm">log</Key>
             
             {/* Скобки и символы */}
             <Key onClick={() => onCommand('insert', '(')} className="bg-slate-700 text-white">(</Key>
             <Key onClick={() => onCommand('insert', ')')} className="bg-slate-700 text-white">)</Key>
             <Key onClick={() => onCommand('insert', '\\infty')} className="bg-slate-700 text-white">∞</Key>
             <Key onClick={() => onCommand('insert', '\\emptyset')} className="bg-slate-700 text-white">∅</Key>

             {/* Интеграл и градус */}
             <Key onClick={() => onCommand('insert', '\\int_{#?}^{#?}')} className="bg-slate-700 text-white">∫</Key>
             <Key onClick={() => onCommand('insert', '^\\circ')} className="bg-slate-700 text-white">°</Key>
             <Key onClick={() => onCommand('insert', '\\approx')} className="bg-slate-700 text-white">≈</Key>
             <Key onClick={() => onCommand('insert', '\\neq')} className="bg-slate-700 text-white">≠</Key>
          </div>
        )}

      </div>

      {/* 3. ПЕРЕКЛЮЧАТЕЛИ ВЛАДОК И ENTER */}
      <div className="grid grid-cols-4 gap-2 mt-1">
         <TabButton id="num" label="123" />
         <TabButton id="abc" label="abc" />
         <TabButton id="fun" label="f(x)" />
         <Key onClick={onSubmit} className="bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"><CornerDownLeft className="w-6 h-6"/></Key>
      </div>

    </div>
  );
}