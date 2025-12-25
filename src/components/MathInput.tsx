import { useEffect, useRef } from 'react';
import 'mathlive';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: any;
        // Добавляем типизацию для новых атрибутов, чтобы TS не ругался
        'virtual-keyboard-mode'?: string; 
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

    // === ЖЕСТКИЕ НАСТРОЙКИ ===
    mf.smartMode = true; 
    mf.virtualKeyboardMode = 'manual'; // Запрещаем авто-открытие встроенной клавы
    mf.menuItems = []; // Полностью очищаем меню (на всякий случай)
    
    // Отключаем звуки при нажатии (иногда они есть по умолчанию)
    mf.keypressSound = null;

    const handleInput = (e: any) => {
      onChange(e.target.value);
    };

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault(); 
        onSubmit();
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeydown);

    if (mfRef) mfRef.current = mf;

    if (value !== mf.value) {
      mf.setValue(value);
    }

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  useEffect(() => {
    const mf = internalRef.current;
    if (mf && value !== mf.value && document.activeElement !== mf) {
      mf.setValue(value);
    }
  }, [value]);

  return (
    <div className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-4 py-2 shadow-inner min-h-[60px] flex items-center overflow-hidden">
      <math-field
        ref={internalRef}
        // Дополнительная страховка через атрибут
        virtual-keyboard-mode="manual"
        style={{
          width: '100%',
          fontSize: '24px',
          backgroundColor: 'transparent',
          color: 'white',
          border: 'none',
          outline: 'none',
          // Настройка цветов курсора
          '--caret-color': '#22d3ee', 
          '--selection-background-color': 'rgba(34, 211, 238, 0.3)',
          '--contains-highlight-backgound-color': 'transparent',
        } as any}
      >
        {value}
      </math-field>
    </div>
  );
}