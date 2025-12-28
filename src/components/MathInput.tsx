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
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Хак: Блокируем попытки браузера скроллить при фокусе
  useEffect(() => {
    const preventScroll = (e: Event) => {
      // Это не дает браузеру делать "Scroll Into View"
      e.preventDefault(); 
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('focus', preventScroll, true); // true = capture phase
      
      return () => {
        container.removeEventListener('focus', preventScroll, true);
      };
    }
  }, []);

  useEffect(() => {
    const mf = internalRef.current;
    if (!mf) return;

    mf.smartMode = true;
    mf.virtualKeyboardMode = 'manual';
    mf.menuItems = [];
    mf.keypressSound = null;
    
    // Отключаем встроенные отступы MathLive
    mf.mathModeSpace = '\\,';
    
    const handleInput = (e: any) => {
      onChange(e.target.value);
    };

    mf.addEventListener('input', handleInput);

    if (mfRef) {
      mfRef.current = mf;
    }

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
      // Пытаемся сохранить позицию курсора, если это возможно
      const selectionRange = mf.selection;
      mf.setValue(value);
      try {
        mf.selection = selectionRange;
      } catch (e) { /* игнор */ }
    }
  }, [value]);

  return (
    <div 
      ref={containerRef}
      className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-4 py-2 shadow-inner min-h-[60px] flex items-center overflow-hidden"
      // Блокируем свайпы по полю, чтобы не сдвигать страницу
      onTouchMove={(e) => {
        if (e.target === internalRef.current) {
          e.stopPropagation();
        }
      }}
    >
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
          touchAction: 'pan-x', // Разрешаем скроллить формулу влево-вправо, но не страницу
          
          '--caret-color': '#22d3ee', // Вернул цвет, чтобы ты видел курсор
          '--selection-background-color': 'rgba(34, 211, 238, 0.2)',
          '--contains-highlight-backgound-color': 'transparent',
        } as any}
      >
        {value}
      </math-field>
    </div>
  );
}