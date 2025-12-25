import { evaluate } from 'mathjs';

/**
 * Превращает математическую строку (LaTeX или человеческую) в формат, понятный mathjs
 */
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.trim(); // НЕ делаем toLowerCase сразу, чтобы не сломать LaTeX команды типа \Delta

  // === 1. Базовая зачистка MathQuill ===
  // Пустое множество
  if (s.includes('\\emptyset') || s.includes('\\O') || s.toLowerCase() === 'no solution' || s.toLowerCase() === 'нет решений') return 'NaN';

  // MathQuill пишет \log_{2}{x}. Нам нужно log(x, 2)
  // Регулярка: \log_{основание}{аргумент}
  // Внимание: MathQuill может давать \log_{2}8 без скобок для аргумента, если это одна цифра
  s = s.replace(/\\log_\{(.+?)\}\{(.+?)\}/g, 'log($2, $1)'); // \log_{2}{8}
  s = s.replace(/\\log_\{(.+?)\}(.+?)/g, 'log($2, $1)');     // \log_{2}8
  
  // Обычный логарифм \log{x} -> log10(x)
  s = s.replace(/\\log\\left\((.+?)\\right\)/g, 'log10($1)');
  s = s.replace(/\\log\{(.+?)\}/g, 'log10($1)');

  // Дроби \frac{a}{b} -> (a)/(b)
  s = s.replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');

  // Корни
  s = s.replace(/\\sqrt\[(.+?)\]\{(.+?)\}/g, 'nthRoot($2, $1)'); // корень n степени
  s = s.replace(/\\sqrt\{(.+?)\}/g, 'sqrt($1)');

  // Тригонометрия (убираем слеши)
  // \sin\left(30\right) -> sin(30)
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc)/g, '$1');
  
  // Убираем \left( и \right)
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\|/g, 'abs(').replace(/\\right\|/g, ')');
  
  // Градусы: ^\circ -> deg
  s = s.replace(/\^\{\\circ\}/g, 'deg');
  s = s.replace(/\\circ/g, 'deg');
  s = s.replace(/°/g, 'deg');

  // Умножение
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\times/g, '*');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');

  // Бесконечность
  s = s.replace(/\\infty/g, 'Infinity');
  s = s.replace(/∞/g, 'Infinity');

  // Пи
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/π/g, 'pi');

  // Очистка от остальных LaTeX символов
  s = s.replace(/[{}]/g, ''); // Убираем фигурные скобки, которые остались
  
  // Теперь можно в lowerCase
  s = s.toLowerCase();

  // Неявное умножение и пробелы
  s = s.replace(/\s+/g, '');
  
  // 2x -> 2*x
  s = s.replace(/(\d)(?=[a-z(])/g, '$1*');

  return s;
}

/**
 * Рекурсивно разворачивает строку с вариантами (±).
 */
function expandOptions(str: string): string[] {
  const parts = str.split(';');
  let results: string[] = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    part = part.replace(/\+-/g, '±');
    part = part.replace(/\\pm/g, '±'); // LaTeX plus-minus

    if (part.includes('±')) {
      const idx = part.indexOf('±');
      const left = part.substring(0, idx).trim();
      const right = part.substring(idx + 1).trim();

      // Добавляем скобки только если правая часть сложная
      const isComplex = /[+\-*/^]/.test(right);
      const rStr = isComplex ? `(${right})` : right;

      const plus = `${left}+${rStr}`;
      const minus = `${left}-${rStr}`;
      
      // Рекурсия (допускаем простую вложенность)
      if (plus.includes('±')) {
         results = results.concat(expandOptions(plus));
         results = results.concat(expandOptions(minus));
      } else {
         results.push(plus);
         results.push(minus);
      }
    } else {
      results.push(part);
    }
  }
  return results;
}

export function checkAnswer(userAnswer: string, dbAnswer: string): boolean {
  if (!userAnswer) return false;

  try {
    const userExprs = expandOptions(userAnswer);
    const dbExprs = expandOptions(dbAnswer);

    const calculate = (expr: string): number => {
      try {
        const norm = normalizeForCalculation(expr);
        if (norm === 'NaN') return NaN;
        
        const res = evaluate(norm);
        if (typeof res === 'number') {
          return res; 
        }
        return NaN;
      } catch (e) {
        return NaN;
      }
    };

    const userValues = userExprs.map(calculate);
    const dbValues = dbExprs.map(calculate);

    // Если есть NaN, идем в строковое сравнение
    if (userValues.some(isNaN) || dbValues.some(isNaN)) {
       throw new Error("Fallback to string");
    }

    userValues.sort((a, b) => a - b);
    dbValues.sort((a, b) => a - b);

    if (userValues.length !== dbValues.length) return false;

    return userValues.every((uVal, i) => {
      const dVal = dbValues[i];
      
      // Обработка Бесконечности
      if (!isFinite(uVal) || !isFinite(dVal)) {
        return uVal === dVal;
      }

      const diff = Math.abs(uVal - dVal);
      
      // Строгое сравнение для "почти целых" чисел
      if (Math.abs(Math.round(uVal) - uVal) < 1e-9 && Math.abs(Math.round(dVal) - dVal) < 1e-9) {
         return Math.abs(Math.round(uVal) - Math.round(dVal)) === 0;
      }
      
      // Относительная погрешность
      const tolerance = Math.max(0.05, Math.abs(dVal * 1e-6));
      return diff <= tolerance;
    });

  } catch (e) {
    // Fallback: строковое сравнение нормализованных значений
    const clean = (s: string) => normalizeForCalculation(s);
    const userSorted = expandOptions(userAnswer).map(clean).sort().join(';');
    const dbSorted = expandOptions(dbAnswer).map(clean).sort().join(';');
    return userSorted === dbSorted;
  }
}