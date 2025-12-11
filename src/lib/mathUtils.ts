import { evaluate } from 'mathjs';

// Функция для превращения любого математического текста в формулу для JS
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase().trim();
  
  // 1. Убираем пробелы, они мешают парсингу (кроме случаев типа "x y")
  // Но для формул типа "8 sqrt 3" лучше убрать пробелы
  s = s.replace(/\s+/g, '');

  // 2. Меняем символы
  s = s.replace(/,/g, '.');
  s = s.replace(/√/g, 'sqrt');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/°/g, 'deg');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  s = s.replace(/:/g, '/');
  
  // 3. Обработка LaTeX (из базы)
  // Сначала дроби: \frac{a}{b} -> (a)/(b)
  s = s.replace(/\\frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');
  // Корни с аргументом: \sqrt{3} -> sqrt(3)
  s = s.replace(/\\sqrt\{(.+?)\}/g, 'sqrt($1)');
  // Просто \sqrt -> sqrt (если вдруг без скобок)
  s = s.replace(/\\sqrt/g, 'sqrt');
  // \pi -> pi
  s = s.replace(/\\pi/g, 'pi');
  // \cdot -> *
  s = s.replace(/\\cdot/g, '*');
  // Убираем лишние фигурные скобки от LaTeX (например 2^{3} -> 2^3)
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  // Убираем все оставшиеся слеши
  s = s.replace(/\\/g, '');

  // 4. ГЛАВНОЕ: Исправление "человеческой" записи (8sqrt3 -> 8*sqrt(3))
  
  // Если после цифры идет буква (2x), скобка (2(x)), или sqrt (2sqrt) — ставим *
  // Пример: "8sqrt" -> "8*sqrt"
  s = s.replace(/(\d)(?=[a-z\(]|sqrt)/g, '$1*');
  
  // Если после sqrt идет просто число (sqrt3) — оборачиваем число в скобки
  // Пример: "sqrt3" -> "sqrt(3)", "sqrt25" -> "sqrt(25)"
  s = s.replace(/sqrt(\d+(\.\d+)?)/g, 'sqrt($1)');

  // Если после pi идет число (pi2) или наоборот (2pi) — мы это уже обработали в шаге 4 (цифра перед буквой)
  
  return s;
}

export function checkAnswer(userAnswer: string, dbAnswer: string): boolean {
  if (!userAnswer) return false;

  // === 1. ОБРАБОТКА ± (ПЛЮС-МИНУС) ===
  function expandPlusMinus(str: string): string[] {
    const clean = str.replace(/\s+/g, ''); // Удаляем пробелы
    if (clean.includes('±') || clean.startsWith('+-')) {
       const val = clean.replace('±', '').replace('+-', '');
       return [val, `-${val}`];
    }
    if (clean.includes(';')) {
      return clean.split(';');
    }
    return [clean];
  }

  const userOptions = expandPlusMinus(userAnswer);
  const dbOptions = expandPlusMinus(dbAnswer);

  // === 2. СРАВНЕНИЕ ВАРИАНТОВ ===
  try {
    const getNumber = (str: string) => {
      const normalized = normalizeForCalculation(str);
      try {
        const result = evaluate(normalized);
        // Если результат комплексное число или объект — приводим к строке или NaN, 
        // но для ЕНТ обычно нужны просто числа.
        if (typeof result === 'object') return NaN;
        return result;
      } catch (e) {
        return NaN;
      }
    };

    const dbValues = dbOptions.map(getNumber).sort((a, b) => a - b);
    const userValues = userOptions.map(getNumber).sort((a, b) => a - b);

    // Если удалось получить числа из обоих ответов
    if (dbValues.length > 0 && userValues.length > 0 && !dbValues.some(isNaN) && !userValues.some(isNaN)) {
       if (dbValues.length !== userValues.length) return false;
       
       const allMatch = dbValues.every((val, index) => {
          const uVal = userValues[index];
          // Погрешность 0.05 для корней и дробей
          return Math.abs(val - uVal) < 0.05;
       });
       
       if (allMatch) return true;
    }

    // === 3. ЗАПАСНОЙ ВАРИАНТ (ТЕКСТОВОЕ СРАВНЕНИЕ) ===
    // Если mathjs не справился или вернул NaN (например, ответ "x>5"), сравниваем строки
    return normalizeForCalculation(userAnswer) === normalizeForCalculation(dbAnswer);

  } catch (e) {
    // Совсем всё плохо — просто сравниваем очищенные строки
    const cleanUser = userAnswer.toLowerCase().replace(/\s+/g, '').replace(/,/g, '.');
    const cleanDb = dbAnswer.toLowerCase().replace(/\s+/g, '').replace(/,/g, '.');
    return cleanUser === cleanDb;
  }
}