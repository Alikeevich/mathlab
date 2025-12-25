import { useEffect, useRef } from 'react';
import ReactMathQuill, { addStyles as addMathQuillStyles } from 'react-mathquill';

// Внедряем стили JS (нужно для react-mathquill)
addMathQuillStyles();

type Props = {
  value: string;
  onChange: (latex: string) => void;
  onSubmit: () => void;
  mathQuillRef?: React.MutableRefObject<any>; // Чтобы управлять из клавиатуры
};

export function MathInput({ value, onChange, onSubmit, mathQuillRef }: Props) {
  
  return (
    <div className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-4 py-3 text-white text-xl font-mono shadow-inner relative flex items-center min-h-[60px]">
      <ReactMathQuill
        latex={value}
        onChange={(mathField) => {
          onChange(mathField.latex());
        }}
        mathquillDidMount={(el) => {
          if (mathQuillRef) mathQuillRef.current = el;
        }}
        config={{
          spaceBehavesLikeTab: true,
          leftRightIntoCmdGoes: 'up',
          restrictMismatchedBrackets: true,
          sumStartsWithNEquals: true,
          supSubsRequireOperand: true,
          charsThatBreakOutOfSupSub: '+-=<>',
          autoSubscriptNumerals: false,
          autoCommands: 'pi theta sqrt sum',
          autoOperatorNames: 'sin cos tan cot log ln'
        }}
        style={{ 
          width: '100%', 
          border: 'none', 
          outline: 'none',
          fontSize: '24px',
          color: 'white',
          background: 'transparent'
        }}
      />
      
      {/* Скрытая кнопка для сабмита по Enter (MathQuill перехватывает Enter) */}
      <input 
        type="text" 
        className="opacity-0 absolute w-0 h-0" 
        onKeyDown={(e) => {
           if (e.key === 'Enter') onSubmit();
        }} 
      />
    </div>
  );
}