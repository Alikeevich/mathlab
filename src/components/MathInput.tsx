import { useEffect, useRef } from 'react';
import 'mathlive';

// Типизация для TypeScript, чтобы он не ругался на <math-field>
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'math-field': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: any;
      };
    }
  }
}

type Props = {
  value: string;
  onChange: (latex: string) => void;
  onSubmit: () => void;
  mfRef?: React.MutableRefObject<any>; // Реф для клавиатуры
};

export function MathInput({ value, onChange, onSubmit, mfRef }: Props) {
  const internalRef = useRef<any>(null);

  useEffect(() => {
    const mf = internalRef.current;
    if (!mf) return;

    // Настройки MathLive для вида "как в Photomath"
    mf.smartMode = true; 
    mf.virtualKeyboardMode = 'manual'; // Отключаем встроенную клаву, у нас своя
    mf.menuItems = []; // Убираем контекстное меню

    // Слушаем изменения
    const handleInput = (e: any) => {
      onChange(e.target.value);
    };

    // Слушаем Enter
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault(); // Чтобы не было переноса строки
        onSubmit();
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeydown);

    if (mfRef) mfRef.current = mf;

    // Инициализация значения
    if (value !== mf.value) {
      mf.setValue(value);
    }

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  // Синхронизация внешнего value с полем (если value изменилось извне, например очистка)
  useEffect(() => {
    const mf = internalRef.current;
    if (mf && value !== mf.value && document.activeElement !== mf) {
      mf.setValue(value);
    }
  }, [value]);

  return (
    <div className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-2 py-2 shadow-inner min-h-[60px] flex items-center">
      <math-field
        ref={internalRef}
        style={{
          width: '100%',
          fontSize: '24px',
          backgroundColor: 'transparent',
          color: 'white',
          border: 'none',
          outline: 'none',
          '--caret-color': '#22d3ee', // Цвет курсора (cyan-400)
          '--selection-background-color': 'rgba(34, 211, 238, 0.3)',
          '--contains-highlight-backgound-color': 'transparent',
        } as any}
      >
        {value}
      </math-field>
    </div>
  );
}