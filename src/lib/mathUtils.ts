import { evaluate } from 'mathjs';

/**
 * Превращает математическую строку (LaTeX или человеческую) в формат, понятный mathjs
 */
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase().trim();
  
  // 1. Предварительная очистка
  s = s.replace(/\s+/g, ''); // Убираем пробелы
  s = s.replace(/,/g, '.');  // Запятые в точки

  // 2. Замена символов
  s = s.replace(/√/g, 'sqrt');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/°/g, 'deg');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  s = s.replace(/:/g, '/');
  s = s.replace(/∞/g, 'Infinity');
  s = s.replace(/\\infty/g, 'Infinity');

  // 3. Обработка LaTeX
  // Корни n-й степени: \sqrt[3]{8} -> nthRoot(8, 3)
  s = s.replace(/\\sqrt\[(\d+)\]\{(.+?)\}/g, 'nthRoot($2, $1)');
  
  // Обычные корни
  s = s.replace(/\\sqrt\{(.+?)\}/g, 'sqrt($1)');
  s = s.replace(/\\sqrt/g, 'sqrt');

  // Дроби
  s = s.replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');

  // Тригонометрия и функции (sin^2 x -> (sin(x))^2)
  // Это сложный кейс, пока упростим до базового удаления слешей
  s = s.replace(/\\sin/g, 'sin');
  s = s.replace(/\\cos/g, 'cos');
  s = s.replace(/\\tan/g, 'tan');
  s = s.replace(/\\cot/g, 'cot');
  s = s.replace(/\\ln/g, 'ln');
  s = s.replace(/\\lg/g, 'log10');
  s = s.replace(/\\log/g, 'log10'); // log без основания обычно 10 в школах

  // Пи, умножение
  s = s.replace(/\\pi/g, 'pi');
  s = s.replace(/\\cdot/g, '*');

  // Убираем LaTeX скобки { } -> ( )
  // Но аккуратно, чтобы не сломать вложенность. 
  // Для простых случаев просто меняем.
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  
  // Убираем все оставшиеся слеши
  s = s.replace(/\\/g, '');

  // 4. Неявное умножение (Implicit Multiplication)
  
  // Число перед буквой/функцией/скобкой: 2x -> 2*x, 2sqrt -> 2*sqrt, 2( -> 2*(
  s = s.replace(/(\d)(?=[a-z\(]|sqrt|pi|sin|cos|tan|ln|log)/g, '$1*');
  
  // Скобка перед скобкой/буквой/числом: )( -> )*(, )x -> )*x
  s = s.replace(/\)(?=[\d a-z\(])/g, ')*');

  // Если sqrt3 (без скобок) -> sqrt(3)
  s = s.replace(/sqrt(\d+(\.\d+)?)/g, 'sqrt($1)');
  
  // Тригонометрия без скобок: sin30 -> sin(30)
  s = s.replace(/(sin|cos|tan|cot|ln|log10)(\d+(\.\d+)?)/g, '$1($2)');

  return s;
}

/**
 * Рекурсивно разворачивает строку с вариантами (±).
 * Поддерживает вложенность, но без фанатизма (глубина 2-3).
 */
function expandOptions(str: string): string[] {
  // 1. Разбиваем по точке с запятой (независимые ответы)
  const parts = str.split(';');
  let results: string[] = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    part = part.replace(/\+-/g, '±');

    if (part.includes('±')) {
      // Ищем первое вхождение
      const idx = part.indexOf('±');
      const left = part.substring(0, idx);
      const right = part.substring(idx + 1);
      
      // Рекурсивно разворачиваем остаток (если там еще ±)
      // Для простоты: берем текущее разветвление
      const variantPlus = `${left}+(${right})`;
      const variantMinus = `${left}-(${right})`;
      
      // Если нужно поддерживать 2±3±4, тут нужна рекурсия, 
      // но для ЕНТ обычно 1 уровень достаточно.
      // Добавим простую поддержку для 2 уровней через повторный вызов
      if (variantPlus.includes('±')) {
         results = results.concat(expandOptions(variantPlus));
         results = results.concat(expandOptions(variantMinus));
      } else {
         results.push(variantPlus);
         results.push(variantMinus);
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

    // Функция вычисления
    const calculate = (expr: string): number => {
      try {
        const norm = normalizeForCalculation(expr);
        const res = evaluate(norm);
        // Проверяем на валидность числа (не Infinity, не Complex, не null)
        if (typeof res === 'number' && !isNaN(res) && isFinite(res)) {
          return res;
        }
        return NaN;
      } catch (e) {
        return NaN;
      }
    };

    // Вычисляем
    const userValues = userExprs.map(calculate);
    const dbValues = dbExprs.map(calculate);

    // Если хоть одно значение не посчиталось (NaN) -> переходим к текстовому сравнению
    if (userValues.some(isNaN) || dbValues.some(isNaN)) {
      throw new Error("Calculation failed, fallback to string");
    }

    // Сортируем для сравнения множеств
    userValues.sort((a, b) => a - b);
    dbValues.sort((a, b) => a - b);

    // Сравниваем количество
    if (userValues.length !== dbValues.length) return false;

    // Сравниваем значения
    return userValues.every((uVal, i) => {
      const dVal = dbValues[i];
      
      // АДАПТИВНАЯ ПОГРЕШНОСТЬ
      // Если числа целые и большие (>100), требуем точность.
      // Если дробные, разрешаем 0.05
      
      const diff = Math.abs(uVal - dVal);
      
      // Если это "почти целые" числа (например 1000 vs 1000.00001)
      if (Math.abs(Math.round(uVal) - uVal) < 1e-9 && Math.abs(Math.round(dVal) - dVal) < 1e-9) {
         // Требуем строгого равенства для целых (1000 != 1001)
         return Math.abs(Math.round(uVal) - Math.round(dVal)) === 0;
      }
      
      // Для дробей/корней - погрешность 0.05 или 0.1% от значения
      const tolerance = Math.max(0.05, Math.abs(dVal * 0.001));
      return diff <= tolerance;
    });

  } catch (e) {
    // FALLBACK: Текстовое сравнение
    const clean = (s: string) => {
        return normalizeForCalculation(s); // Используем наш нормализатор, он хорошо чистит
    };
    
    // Сортируем строковые варианты (x=1; x=2 vs x=2; x=1)
    const userSorted = expandOptions(userAnswer).map(clean).sort().join(';');
    const dbSorted = expandOptions(dbAnswer).map(clean).sort().join(';');
    
    return userSorted === dbSorted;
  }
}