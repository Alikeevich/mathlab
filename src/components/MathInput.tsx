import { useEffect, useRef } from 'react';
import 'mathlive';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: any;
        'virtual-keyboard-mode'?: string;
        inputmode?: string;
      };
    }
  }
}

type Props = {
  value: string;
  onChange: (latex: string) => void;
  onSubmit: () => void;
  mfRef?: React.MutableRefObject<any>;
};

export function MathInput({ value, onChange, onSubmit, mfRef }: Props) {
  const internalRef = useRef<any>(null);

  useEffect(() => {
    const mf = internalRef.current;
    if (!mf) return;

    mf.smartMode = true; 
    mf.virtualKeyboardMode = 'manual'; 
    mf.menuItems = []; 
    mf.keypressSound = null;

    const handleInput = (e: any) => {
      onChange(e.target.value);
    };

    mf.addEventListener('input', handleInput);

    if (mfRef) mfRef.current = mf;

    if (value !== mf.value) {
      mf.setValue(value);
    }

    return () => {
      mf.removeEventListener('input', handleInput);
    };
  }, []);

  useEffect(() => {
    const mf = internalRef.current;
    if (mf && value !== mf.value) {
      mf.setValue(value);
    }
  }, [value]);

  return (
    <div className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-4 py-2 shadow-inner min-h-[60px] flex items-center overflow-hidden">
      <math-field
        ref={internalRef}
        inputmode="none" 
        virtual-keyboard-mode="manual"
        style={{
          width: '100%',
          fontSize: '24px',
          backgroundColor: 'transparent',
          color: 'white',
          border: 'none',
          outline: 'none',
          touchAction: 'none', // Запрещаем браузеру обрабатывать жесты
          
          // === УБИРАЕМ МИГАЮЩУЮ ПАЛКУ ===
          '--caret-color': 'transparent', 
          
          // Оставляем подсветку выделения, чтобы было понятно, что происходит, но без палки
          '--selection-background-color': 'rgba(34, 211, 238, 0.2)',
          '--contains-highlight-backgound-color': 'transparent',
        } as any}
      >
        {value}
      </math-field>
    </div>
  );
}