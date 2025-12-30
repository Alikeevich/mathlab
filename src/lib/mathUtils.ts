import { evaluate } from 'mathjs';

// === КОНСТАНТЫ ДЛЯ АЛГЕБРЫ ===
// Подставляем вместо переменных простые числа, чтобы проверять равенство формул.
// Например, если x=3, то 2x = 6 и x+x = 6. Они равны.
const ALGEBRA_SCOPE = {
  x: 3, y: 7, z: 11, t: 13,
  a: 17, b: 19, c: 23, d: 29,
  m: 31, n: 37, k: 41, p: 43, q: 47,
  u: 53, v: 59, S: 61,
  e: 2.718281828
};

/**
 * Превращает математическую строку (LaTeX или человеческую) в формат, понятный mathjs
 */
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.trim(); 

  // === 0. ПРЕДВАРИТЕЛЬНАЯ ЗАЧИСТКА ===
  
  // Убираем "x =" или "y =" в начале, если это уравнение
  s = s.replace(/^[a-zA-Z]\s*=\s*/, '');

  // Пустое множество
  if (s.includes('\\emptyset') || s.includes('\\O') || 
      s.toLowerCase() === 'no solution' || s.toLowerCase() === 'нет решений') {
    return 'NaN';
  }

  // === 1. ЗАМЕНА ЗАПЯТОЙ НА ТОЧКУ ===
  // Делаем это в начале, чтобы десятичные дроби стали нормальными
  s = s.replace(/\{,\}/g, '.'); 
  s = s.replace(/,/g, '.');

  // === 2. СМЕШАННЫЕ ЧИСЛА (ВАЖНО!) ===
  // Если перед дробью стоит число, это сумма: 1 \frac{1}{2} -> 1 + \frac{1}{2}
  // Иначе mathjs посчитает это как умножение.
  s = s.replace(/(\d)\s*\\frac/g, '$1+\\frac');
  s = s.replace(/(\d)\s*\\dfrac/g, '$1+\\dfrac'); // на всякий случай

  // === 3. ЛОГАРИФМЫ ===
  // Сначала убираем \left( и \right), чтобы они не мешали
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');

  // Паттерн 1: \log_{2}{8} или \log_{2}(8) -> log(8, 2)
  s = s.replace(/\\log_\{(.+?)\}[\{\(](.+?)[\}\)]/g, 'log($2, $1)'); 
  // Паттерн 2: \log_{2} 8 -> log(8, 2)
  s = s.replace(/\\log_\{(.+?)\}(.+?)/g, 'log($2, $1)');

  // Обычные логарифмы
  s = s.replace(/\\ln/g, 'log'); // ln -> log (натуральный)
  s = s.replace(/\\lg/g, 'log10'); // lg -> log10
  // Если просто \log без основания -> log10 (школьный стандарт)
  s = s.replace(/\\log/g, 'log10'); 

  // === 4. ДРОБИ ===
  s = s.replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');
  s = s.replace(/\\dfrac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');

  // === 5. КОРНИ ===
  // Корень n-й степени: \sqrt[n]{x} -> nthRoot(x, n)
  s = s.replace(/\\sqrt\[(.+?)\]\{(.+?)\}/g, 'nthRoot($2, $1)'); 
  // Квадратный корень: \sqrt{x} -> sqrt(x)
  s = s.replace(/\\sqrt\{(.+?)\}/g, 'sqrt($1)');

  // === 6. МОДУЛЬ ===
  s = s.replace(/\\left\|(.+?)\\right\|/g, 'abs($1)');
  s = s.replace(/\|(.+?)\|/g, 'abs($1)');

  // === 7. СТЕПЕНИ И ПРОЦЕНТЫ ===
  s = s.replace(/\^\{(.+?)\}/g, '^($1)');
  s = s.replace(/\\%/g, '%'); // Проценты

  // === 8. ТРИГОНОМЕТРИЯ ===
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc)/g, '$1');
  
  // Градусы
  s = s.replace(/\^\{\\circ\}/g, ' deg');
  s = s.replace(/\\circ/g, ' deg');
  s = s.replace(/°/g, ' deg');

  // === 9. СПЕЦСИМВОЛЫ И УМНОЖЕНИЕ ===
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\times/g, '*');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  s = s.replace(/:/g, '/'); 

  s = s.replace(/\\infty/g, 'Infinity');
  s = s.replace(/∞/g, 'Infinity');
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/π/g, 'pi');

  // === 10. ФИНАЛЬНАЯ ЗАЧИСТКА ===
  s = s.replace(/[{}]/g, ''); // Убираем остатки LaTeX скобок
  
  // Приводим к нижнему регистру (кроме Infinity)
  s = s.toLowerCase();
  s = s.replace(/infinity/g, 'Infinity'); 

  // Неявное умножение и пробелы
  s = s.replace(/\s+/g, ''); // Убираем пробелы
  s = s.replace(/(\d)deg/g, '$1 deg'); // Возвращаем пробел для градусов

  // 2x -> 2*x, )x -> )*x, x( -> x*(
  s = s.replace(/(\d|\))(?=[a-z(])/g, '$1*');
  s = s.replace(/([a-z])(?=\()/g, '$1*'); // a(b) -> a*(b) (кроме имен функций, но они уже обработаны)
  
  // Исправление для функций: log*( -> log(
  const funcs = ['sin', 'cos', 'tan', 'cot', 'log', 'sqrt', 'abs', 'nthroot'];
  funcs.forEach(f => {
    s = s.replace(new RegExp(`${f}\\*\\(`, 'g'), `${f}(`);
  });

  return s;
}

/**
 * Рекурсивно разворачивает строку с вариантами (±).
 */
function expandOptions(str: string): string[] {
  // Разделяем по точке с запятой
  const parts = str.split(';');
  let results: string[] = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    part = part.replace(/\+-/g, '±');
    part = part.replace(/\\pm/g, '±');

    if (part.includes('±')) {
      const idx = part.indexOf('±');
      const left = part.substring(0, idx).trim();
      const right = part.substring(idx + 1).trim();

      const isComplex = /[+\-*/^]/.test(right);
      const rStr = isComplex ? `(${right})` : right;

      const plus = `${left}+${rStr}`;
      const minus = `${left}-${rStr}`;
      
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

    // Функция вычисления с учетом алгебраического контекста
    const calculate = (expr: string): number => {
      try {
        const norm = normalizeForCalculation(expr);
        if (norm === 'NaN') return NaN;
        
        // Подставляем значения переменных из ALGEBRA_SCOPE
        const res = evaluate(norm, ALGEBRA_SCOPE);
        
        if (typeof res === 'number') return res;
        // Если результат Complex или Unit, пробуем привести к числу или сравниваем как есть
        // Для школьной программы обычно достаточно number
        return NaN;
      } catch (e) {
        return NaN;
      }
    };

    const userValues = userExprs.map(calculate);
    const dbValues = dbExprs.map(calculate);

    if (userValues.some(isNaN) || dbValues.some(isNaN)) {
       throw new Error("Fallback to string");
    }

    userValues.sort((a, b) => a - b);
    dbValues.sort((a, b) => a - b);

    if (userValues.length !== dbValues.length) return false;

    return userValues.every((uVal, i) => {
      const dVal = dbValues[i];
      
      if (!isFinite(uVal) || !isFinite(dVal)) {
        return uVal === dVal;
      }

      const diff = Math.abs(uVal - dVal);
      
      // Строгое сравнение для целых (защита от float погрешностей)
      if (Math.abs(Math.round(uVal) - uVal) < 1e-9 && Math.abs(Math.round(dVal) - dVal) < 1e-9) {
         return Math.abs(Math.round(uVal) - Math.round(dVal)) === 0;
      }
      
      // Относительная погрешность (чуть мягче)
      const tolerance = Math.max(0.001, Math.abs(dVal * 0.001));
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