import { evaluate } from 'mathjs';

// Функция для превращения "человеческой" или LaTeX записи в понятную для MathJS
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.toLowerCase().trim();
  
  // 1. Заменяем запятые на точки
  s = s.replace(/,/g, '.');

  // 2. LaTeX синтаксис (то, что лежит в базе)
  // \sqrt{3} -> sqrt(3)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  // \frac{a}{b} -> (a)/(b)
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');
  // \cdot -> *
  s = s.replace(/\\cdot/g, '*');
  // \pi -> pi
  s = s.replace(/\\pi/g, 'pi');
  // Степени: {2} -> (2) (чтобы x^{2} стало x^(2))
  s = s.replace(/\{([^}]+)\}/g, '($1)');
  // Убираем оставшиеся слеши
  s = s.replace(/\\/g, '');

  // 3. Пользовательский ввод (с клавиатуры)
  s = s.replace(/√/g, 'sqrt');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/°/g, 'deg'); // MathJS понимает 90deg как градусы
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  
  // 4. ГЛАВНОЕ: Исправление синтаксиса (Implicit Multiplication)
  
  // Если число стоит перед sqrt, pi или скобкой — добавляем умножение
  // Пример: "8sqrt" -> "8*sqrt"
  s = s.replace(/(\d)\s*sqrt/g, '$1*sqrt');
  s = s.replace(/(\d)\s*pi/g, '$1*pi');
  s = s.replace(/(\d)\s*\(/g, '$1*(');

  // Если после sqrt идет просто число без скобок — добавляем скобки
  // Пример: "sqrt3" -> "sqrt(3)"
  // (Ловим sqrt, за которым НЕ идет скобка, а идет число)
  s = s.replace(/sqrt\s*(\d+(\.\d+)?)/g, 'sqrt($1)');

  return s;
}

export function checkAnswer(userAnswer: string, dbAnswer: string): boolean {
  if (!userAnswer) return false;

  // === 1. ОБРАБОТКА ± (ПЛЮС-МИНУС) ===
  function expandPlusMinus(str: string): string[] {
    const clean = str.replace(/\s+/g, '');
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
      // Пытаемся вычислить
      try {
        return evaluate(normalized);
      } catch (e) {
        return NaN;
      }
    };

    const dbValues = dbOptions.map(getNumber).sort((a, b) => a - b);
    const userValues = userOptions.map(getNumber).sort((a, b) => a - b);

    // Сравниваем массивы чисел
    if (dbValues.length === userValues.length && dbValues.length > 0) {
      const allMatch = dbValues.every((val, index) => {
        const uVal = userValues[index];
        // Если оба числа валидные
        if (typeof val === 'number' && !isNaN(val) && typeof uVal === 'number' && !isNaN(uVal)) {
          // Погрешность 0.05
          return Math.abs(val - uVal) < 0.05;
        }
        return false;
      });
      
      if (allMatch) return true;
    }

    // Фоллбэк: Прямое сравнение строк после нормализации
    // (Если вычисление вернуло NaN, например для "x>5")
    return normalizeForCalculation(userAnswer) === normalizeForCalculation(dbAnswer);

  } catch (e) {
    const cleanUser = userAnswer.toLowerCase().trim().replace(/,/g, '.');
    const cleanDb = dbAnswer.toLowerCase().trim().replace(/,/g, '.');
    return cleanUser === cleanDb;
  }
}