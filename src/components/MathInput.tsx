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
  
  // Блокируем автоскролл браузера
  useEffect(() => {
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };
    
    const container = containerRef.current;
    if (container) {
      // Блокируем все попытки браузера скроллить
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

    // Настройки MathLive
    mf.smartMode = true;
    mf.virtualKeyboardMode = 'manual';
    mf.menuItems = [];
    mf.keypressSound = null;
    
    // КРИТИЧНО: Отключаем автофокус MathLive
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

    // Устанавливаем начальный фокус БЕЗ скролла
    requestAnimationFrame(() => {
      if (mf && document.activeElement !== mf) {
        // Сохраняем текущую позицию скролла
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        mf.focus({ preventScroll: true });
        
        // Принудительно возвращаем скролл (для iOS)
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
      // Сохраняем позицию курсора
      const selectionRange = mf.selection;
      mf.setValue(value);
      // Восстанавливаем курсор
      try {
        mf.selection = selectionRange;
      } catch (e) {
        // Игнорируем ошибки восстановления курсора
      }
    }
  }, [value]);

  return (
    <div 
      ref={containerRef}
      className="w-full bg-slate-900 border border-cyan-500/30 rounded-xl px-4 py-2 shadow-inner min-h-[60px] flex items-center overflow-hidden"
      // Блокируем попытки браузера помочь
      onTouchMove={(e) => {
        // Разрешаем скролл только внутри самого поля
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
          touchAction: 'pan-x pan-y',
          
          // Убираем каретку
          '--caret-color': 'transparent',
          
          // GLASSMORPHISM ВЫДЕЛЕНИЕ 🔥
          '--selection-background-color': 'rgba(6, 182, 212, 0.25)', // Cyan с прозрачностью
          '--selection-color': 'white', // Текст остаётся белым
          
          // Добавляем blur эффект (работает в некоторых браузерах)
          '--contains-highlight-background-color': 'rgba(6, 182, 212, 0.15)',
          
          // Подсветка границ выделения
          '--primary': '#06b6d4', // Cyan для акцентов
        } as any}
      >
        {value}
      </math-field>
    </div>
  );
}