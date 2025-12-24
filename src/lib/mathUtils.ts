import { evaluate } from 'mathjs';

/**
 * Превращает математическую строку (LaTeX или человеческую) в формат, понятный mathjs
 */
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase().trim();
  
  // 1. Предварительная очистка символов
  s = s.replace(/,/g, '.');
  s = s.replace(/√/g, 'sqrt');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/°/g, 'deg');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  
  // Infinity (разные варианты написания)
  s = s.replace(/\\infty/g, 'Infinity');
  s = s.replace(/∞/g, 'Infinity');
  s = s.replace(/\binf(inity)?\b/g, 'Infinity');

  // Контекстная замена двоеточия (только между цифрами)
  s = s.replace(/(\d):(\d)/g, '$1/$2');

  // 2. Обработка LaTeX
  // Корни n-й степени: \sqrt[3]{8} -> nthRoot(8, 3)
  s = s.replace(/\\sqrt\[(\d+)\]\{(.+?)\}/g, 'nthRoot($2, $1)');
  
  // Обычные корни
  s = s.replace(/\\sqrt\{(.+?)\}/g, 'sqrt($1)');
  s = s.replace(/\\sqrt/g, 'sqrt');

  // Дроби
  s = s.replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');

  // Убираем слеши перед функциями
  const funcs = ['sin', 'cos', 'tan', 'cot', 'ln', 'lg', 'log'];
  funcs.forEach(f => {
    s = s.replace(new RegExp(`\\\\${f}`, 'g'), f);
  });
  
  // lg -> log10 (школьный стандарт)
  s = s.replace(/lg/g, 'log10'); 

  // Пи, умножение
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/\\cdot/g, '*');

  // Убираем LaTeX скобки { } -> ( )
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  s = s.replace(/\\/g, ''); // Остатки слешей

  // 3. УМНАЯ РАССТАНОВКА СКОБОК ДЛЯ ФУНКЦИЙ
  
  // log без пробела (log2 -> log10(2))
  // Ищем log, за которым идет цифра или переменная, но не скобка
  s = s.replace(/log(?!\()(\d+(\.\d+)?|pi|infinity|[a-z])/g, 'log10($1)');

  // Тригонометрия и функции без скобок (sin30 -> sin(30), sinx -> sin(x))
  // Поддерживаем: sin 30, sin30, sin x, sinx
  const trigFuncs = 'sin|cos|tan|cot|ln|log10|sqrt';
  
  // Сначала обрабатываем с градусами (sin30deg -> sin(30deg))
  // Нужно вставить пробел перед deg, если его нет, чтобы mathjs понял unit
  s = s.replace(/(\d)deg/g, '$1 deg');

  // Теперь оборачиваем аргумент в скобки
  // 1. Если аргумент - число/pi/inf/переменная (одна буква)
  // Исключаем случай, если уже есть скобка
  const regexArg = new RegExp(`(${trigFuncs})\\s*(?!\\()(\\d+(\\.\\d+)?( deg)?|pi|infinity|[a-z])`, 'g');
  s = s.replace(regexArg, '$1($2)');

  // 4. НЕЯВНОЕ УМНОЖЕНИЕ (Implicit Multiplication)
  
  s = s.replace(/\s+/g, ''); // Убираем все пробелы (mathjs не нужны пробелы внутри формул)

  // Число/Скобка перед Буквой/Функцией/Скобкой
  // 2x -> 2*x, )x -> )*x, 2sin -> 2*sin
  s = s.replace(/(\d|\))(?=[a-z\(]|sqrt|sin|cos|tan|ln|log)/g, '$1*');
  
  // Между буквами (xy -> x*y), но не внутри имен функций!
  // Это сложно регуляркой, поэтому mathjs сам часто справляется с xy.
  // Но для надежности можно добавить, если это точно переменные.
  // Пока оставим на откуп mathjs, он умный.

  // Если sqrt3 (без скобок) -> sqrt(3) - страховка
  s = s.replace(/sqrt(\d+(\.\d+)?)/g, 'sqrt($1)');

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
        const res = evaluate(norm);
        if (typeof res === 'number' && !isNaN(res)) {
          return res; // Разрешаем Infinity для сравнения
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
      
      // Относительная погрешность (Уменьшил для больших чисел)
      const tolerance = Math.max(0.05, Math.abs(dVal * 1e-6));
      return diff <= tolerance;
    });

  } catch (e) {
    // Fallback
    const clean = (s: string) => normalizeForCalculation(s);
    const userSorted = expandOptions(userAnswer).map(clean).sort().join(';');
    const dbSorted = expandOptions(dbAnswer).map(clean).sort().join(';');
    return userSorted === dbSorted;
  }
}