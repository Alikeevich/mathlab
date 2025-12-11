import { evaluate } from 'mathjs';

// Функция для превращения "человеческой" или LaTeX записи в понятную для MathJS
function normalizeForCalculation(str: string): string {
  let s = str.toLowerCase().trim();
  
  // 1. Заменяем запятые на точки
  s = s.replace(/,/g, '.');

  // 2. Символы с нашей клавиатуры
  s = s.replace(/√/g, 'sqrt');
  s = s.replace(/π/g, 'pi');
  s = s.replace(/°/g, 'deg'); // MathJS понимает 90deg как градусы
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  
  // 3. LaTeX синтаксис (то, что лежит в базе)
  // Корни: \sqrt{3} -> sqrt(3)
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  // Если корень без скобок (редко, но бывает): \sqrt -> sqrt
  s = s.replace(/\\sqrt/g, 'sqrt');
  
  // Дроби: \frac{1}{2} -> (1)/(2)
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '(($1)/($2))');
  
  // Умножение: \cdot -> *
  s = s.replace(/\\cdot/g, '*');
  
  // Пи: \pi -> pi
  s = s.replace(/\\pi/g, 'pi');
  
  // Степени: {2} -> (2) (чтобы x^{2} стало x^(2))
  s = s.replace(/\{([^}]+)\}/g, '($1)');
  
  // Убираем оставшиеся слеши
  s = s.replace(/\\/g, '');

  return s;
}

export function checkAnswer(userAnswer: string, dbAnswer: string): boolean {
  if (!userAnswer) return false;

  // === 1. ОБРАБОТКА ± (ПЛЮС-МИНУС) ===
  // Превращаем "±5" в массив ["5", "-5"]
  function expandPlusMinus(str: string): string[] {
    // Чистим от пробелов
    const clean = str.replace(/\s+/g, '');
    
    if (clean.includes('±') || clean.startsWith('+-')) {
       const val = clean.replace('±', '').replace('+-', '');
       return [val, `-${val}`];
    }
    // Если это список через точку с запятой (2; -2)
    if (clean.includes(';')) {
      return clean.split(';');
    }
    return [clean];
  }

  const userOptions = expandPlusMinus(userAnswer);
  const dbOptions = expandPlusMinus(dbAnswer);

  // === 2. СРАВНЕНИЕ ВАРИАНТОВ ===
  // Если количество ответов не совпадает (например, уравнение имеет 2 корня, а ввели 1)
  // Но для ± мы обычно требуем просто совпадения значений
  
  // Попробуем вычислить каждое значение
  try {
    // Функция для получения числа из строки
    const getNumber = (str: string) => {
      const normalized = normalizeForCalculation(str);
      return evaluate(normalized);
    };

    // Превращаем ответы из базы в числа
    const dbValues = dbOptions.map(getNumber).sort((a, b) => a - b);
    
    // Превращаем ответы юзера в числа
    const userValues = userOptions.map(getNumber).sort((a, b) => a - b);

    // Сравниваем массивы чисел
    if (dbValues.length === userValues.length) {
      return dbValues.every((val, index) => {
        if (typeof val === 'number' && typeof userValues[index] === 'number') {
          // Допускаем погрешность 0.01 для неточных вычислений
          return Math.abs(val - userValues[index]) < 0.05;
        }
        return false;
      });
    }

    // Фоллбэк: Если массивы разной длины, но пользователь ввел просто "5" вместо "5.0"
    // (Прямое сравнение строк после нормализации)
    return normalizeForCalculation(userAnswer) === normalizeForCalculation(dbAnswer);

  } catch (e) {
    // Если вычислить не удалось (например, там текст "x > 5"), сравниваем строки
    const cleanUser = userAnswer.toLowerCase().trim().replace(/,/g, '.');
    const cleanDb = dbAnswer.toLowerCase().trim().replace(/,/g, '.');
    return cleanUser === cleanDb;
  }
}