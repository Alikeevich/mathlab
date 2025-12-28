import { evaluate } from 'mathjs';

/**
 * Превращает математическую строку (LaTeX или человеческую) в формат, понятный mathjs
 */
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.trim(); 

  // === 0. ПРОВЕРКА НА ПУСТОЕ МНОЖЕСТВО / НЕТ РЕШЕНИЙ ===
  if (s.includes('\\emptyset') || s.includes('\\O') || 
      s.toLowerCase() === 'no solution' || s.toLowerCase() === 'нет решений') {
    return 'NaN';
  }

  // === 1. ЗАМЕНА ЗАПЯТОЙ НА ТОЧКУ (КРИТИЧНО) ===
  // MathLive может выдавать запятую как "," или как "{,}"
  s = s.replace(/\{,\}/g, '.'); 
  s = s.replace(/,/g, '.');

  // === 2. ЛОГАРИФМЫ (Сложная обработка) ===
  // MathLive пишет: \log_{2}(8) или \log_{2}{8} или \log_{2}8
  
  // Сначала убираем \left( и \right), чтобы они не мешали парсить аргументы
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');

  // Паттерн 1: \log_{основание}{аргумент} или \log_{основание}(аргумент)
  // Превращаем в log(аргумент, основание)
  s = s.replace(/\\log_\{(.+?)\}[\{\(](.+?)[\}\)]/g, 'log($2, $1)'); 
  
  // Паттерн 2: \log_{основание} аргумент (без скобок, например \log_{2}8)
  s = s.replace(/\\log_\{(.+?)\}(.+?)/g, 'log($2, $1)');

  // Обычный логарифм (ln или log10)
  s = s.replace(/\\ln/g, 'log'); // В mathjs log(x) - это натуральный, log10(x) - десятичный
  // Если просто \log без основания - считаем log10
  s = s.replace(/\\log/g, 'log10'); 

  // === 3. ДРОБИ ===
  // \frac{a}{b} -> ((a)/(b))
  s = s.replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');

  // === 4. КОРНИ ===
  // Корень n-й степени: \sqrt[n]{x} -> nthRoot(x, n)
  s = s.replace(/\\sqrt\[(.+?)\]\{(.+?)\}/g, 'nthRoot($2, $1)'); 
  // Квадратный корень: \sqrt{x} -> sqrt(x)
  s = s.replace(/\\sqrt\{(.+?)\}/g, 'sqrt($1)');

  // === 5. МОДУЛЬ ===
  // \left|x\right| -> abs(x)
  s = s.replace(/\\left\|(.+?)\\right\|/g, 'abs($1)');
  s = s.replace(/\|(.+?)\|/g, 'abs($1)'); // Если просто палки

  // === 6. СТЕПЕНИ ===
  // {x}^{2} -> (x)^(2)
  // Убираем фигурные скобки вокруг основания и показателя, если они есть, но аккуратно
  // MathJS понимает ^, но лучше очистить LaTeX мусор
  s = s.replace(/\^\{(.+?)\}/g, '^($1)');

  // === 7. ТРИГОНОМЕТРИЯ ===
  // Убираем слеши: \sin -> sin
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc)/g, '$1');
  
  // Градусы: ^\circ или \circ -> deg
  // mathjs требует пробел перед deg: "30 deg"
  s = s.replace(/\^\{\\circ\}/g, ' deg');
  s = s.replace(/\\circ/g, ' deg');
  s = s.replace(/°/g, ' deg');

  // === 8. СПЕЦСИМВОЛЫ И УМНОЖЕНИЕ ===
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\times/g, '*');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  s = s.replace(/:/g, '/'); // Двоеточие как деление

  // Бесконечность
  s = s.replace(/\\infty/g, 'Infinity');
  s = s.replace(/∞/g, 'Infinity');

  // Пи
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/π/g, 'pi');

  // === 9. ФИНАЛЬНАЯ ЗАЧИСТКА ===
  // Убираем оставшиеся фигурные скобки LaTeX, которые не были обработаны
  s = s.replace(/[{}]/g, ''); 
  
  // Нижний регистр (кроме Infinity, но мы его уже заменили)
  // Чтобы не сломать Infinity, временно заменим его на плейсхолдер или просто будем аккуратны
  // Проще сделать toLowerCase(), а Infinity mathjs поймет и так (или мы его восстановим)
  s = s.toLowerCase();
  s = s.replace(/infinity/g, 'Infinity'); // Восстанавливаем регистр для JS

  // Неявное умножение и пробелы
  s = s.replace(/\s+/g, ''); // Убираем пробелы (но deg мы обрабатывали выше, mathjs поймет 30deg)
  // Вернем пробел для deg, если стерли
  s = s.replace(/(\d)deg/g, '$1 deg');

  // 2x -> 2*x, )x -> )*x
  s = s.replace(/(\d|\))(?=[a-z(])/g, '$1*');

  return s;
}

/**
 * Рекурсивно разворачивает строку с вариантами (±).
 */
function expandOptions(str: string): string[] {
  // Разделяем по точке с запятой ИЛИ по "или" (если вдруг)
  // Но мы договорились, что запятая - это дробь.
  // Поэтому разделитель ответов ТОЛЬКО точка с запятой (;).
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
      
      // Рекурсия
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
        // console.log('Parse error:', e, expr); // Для отладки
        return NaN;
      }
    };

    const userValues = userExprs.map(calculate);
    const dbValues = dbExprs.map(calculate);

    // Если есть NaN, идем в строковое сравнение (fallback)
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
      
      // Строгое сравнение для "почти целых" чисел (защита от 3.999999)
      if (Math.abs(Math.round(uVal) - uVal) < 1e-9 && Math.abs(Math.round(dVal) - dVal) < 1e-9) {
         return Math.abs(Math.round(uVal) - Math.round(dVal)) === 0;
      }
      
      // Относительная погрешность (чтобы 1/3 == 0.33333)
      // Допускаем погрешность 0.001 или 5% (что больше)
      const tolerance = Math.max(0.001, Math.abs(dVal * 0.05));
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