import { describe, it, expect } from 'vitest';
import { checkAnswer } from './mathUtils';

describe('Math Verification System', () => {
  
  // 1. БАЗОВАЯ АРИФМЕТИКА
  it('checks simple integers', () => {
    expect(checkAnswer('5', '5')).toBe(true);
    expect(checkAnswer('5', '6')).toBe(false);
  });

  it('checks simple fractions', () => {
    expect(checkAnswer('0.5', '1/2')).toBe(true); // 0.5 == 1/2
    expect(checkAnswer('1/4', '0.25')).toBe(true);
    expect(checkAnswer('1/3', '0.333333')).toBe(true); // Точность
  });

  // 2. РАБОТА С LATEX И КОРНЯМИ
  it('handles LaTeX and roots', () => {
    // Пользователь пишет 8√3, в базе 8\sqrt{3}
    expect(checkAnswer('8√3', '8\\sqrt{3}')).toBe(true);
    
    // Просто корень
    expect(checkAnswer('√4', '2')).toBe(true);
    
    // С умножением
    expect(checkAnswer('2sqrt(3)', '2\\sqrt{3}')).toBe(true);
  });

  // 3. ПЛЮС-МИНУС (±)
  it('handles plus-minus symbol', () => {
    // ±5 равносильно 5 и -5
    expect(checkAnswer('±5', '5; -5')).toBe(true);
    expect(checkAnswer('+-5', '5; -5')).toBe(true);
    
    // Уравнения
    expect(checkAnswer('2 ± 3', '5; -1')).toBe(true); // 2+3=5, 2-3=-1
  });

  // 4. СПИСКИ ОТВЕТОВ (ПОРЯДОК НЕ ВАЖЕН)
  it('handles lists independent of order', () => {
    expect(checkAnswer('2; 5', '5; 2')).toBe(true);
    expect(checkAnswer('x=1; x=2', '2; 1')).toBe(true);
  });

  // 5. ТРИГОНОМЕТРИЯ
  it('handles trigonometry', () => {
    // sin(30 deg) = 0.5
    expect(checkAnswer('sin(30°)', '0.5')).toBe(true);
    // pi
    expect(checkAnswer('π', '3.14159')).toBe(true);
  });

  // 6. ПРОВЕРКА ТОЧНОСТИ (Anti-Bug)
  it('is strict with large integers', () => {
    // 1000 не должно быть равно 1001 (раньше был баг)
    expect(checkAnswer('1000', '1001')).toBe(false);
    expect(checkAnswer('1000', '1000.0000001')).toBe(true); // Но очень близко - ок
  });

  // 7. СЛОЖНЫЙ СИНТАКСИС (Implicit mult)
  it('handles implicit multiplication', () => {
    expect(checkAnswer('2x', '2*x')).toBe(true); // Если x не определен, упадет в string compare
    expect(checkAnswer('2(3)', '6')).toBe(true);
    expect(checkAnswer('8sqrt3', '13.856')).toBe(true);
  });
});