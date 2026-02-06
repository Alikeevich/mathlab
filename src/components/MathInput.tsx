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
  
  useEffect(() => {
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('focus', preventScroll, true);
      container.addEventListener('focusin', preventScroll, true);
      
      return () => {
        container.removeEventListener('focus', preventScroll, true);
        container.removeEventListener('focusin', preventScroll, true);
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

    requestAnimationFrame(() => {
      if (mf && document.activeElement !== mf) {
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        mf.focus({ preventScroll: true });
        
        window.scrollTo(scrollX, scrollY);
      }
    });

    return () => {
      mf.removeEventListener('input', handleInput);
    };
  }, []);

  useEffect(() => {
    const mf = internalRef.current;
    if (mf && value !== mf.value) {
      const selectionRange = mf.selection;
      mf.setValue(value);
      try {
        mf.selection = selectionRange;
      } catch (e) {
        // ignore
      }
    }
  }, [value]);

  return (
    <div 
      ref={containerRef}
      className="w-full bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-1.5 shadow-inner min-h-[50px] flex items-center overflow-hidden"
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
          fontSize: '20px',
          backgroundColor: 'transparent',
          color: 'white',
          border: 'none',
          outline: 'none',
          touchAction: 'pan-x pan-y',
          
          '--caret-color': 'transparent',
          '--selection-background-color': 'rgba(6, 182, 212, 0.25)',
          '--selection-color': 'white',
          '--contains-highlight-background-color': 'rgba(6, 182, 212, 0.15)',
          '--primary': '#06b6d4',
        } as any}
      >
        {value}
      </math-field>
    </div>
  );
}