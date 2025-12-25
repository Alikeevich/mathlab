import { useEffect, useRef } from 'react';
import 'mathlive';

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
};

export function MathInput({ value, onChange, onSubmit }: Props) {
  const internalRef = useRef<any>(null);

  useEffect(() => {
    const mf = internalRef.current;
    if (!mf) return;

    // === НАСТРОЙКИ MATHLIVE ===
    // 'onfocus' — клавиатура выезжает сама (как на телефоне)
    mf.setOptions({
      smartMode: true,
      virtualKeyboardMode: 'onfocus', 
      virtualKeyboardTheme: 'apple', // Тема как на iOS (светлая/темная)
      menuItems: [], // Убираем кнопку "Меню" (три точки), она лишняя
    });

    // Слушаем ввод
    const handleInput = (e: any) => {
      onChange(e.target.value);
    };

    // Слушаем Enter на физической клавиатуре (для ПК)
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onSubmit();
      }
    };

    mf.addEventListener('input', handleInput);
    mf.addEventListener('keydown', handleKeydown);

    // Инициализация
    if (value !== mf.value) {
      mf.setValue(value);
    }

    return () => {
      mf.removeEventListener('input', handleInput);
      mf.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  // Синхронизация при очистке поля извне
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
          '--caret-color': '#22d3ee',
          '--selection-background-color': 'rgba(34, 211, 238, 0.3)',
        } as any}
      >
        {value}
      </math-field>
    </div>
  );
}