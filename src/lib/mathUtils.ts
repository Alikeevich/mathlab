import { evaluate } from 'mathjs';

export function checkAnswer(userAnswer: string, dbAnswer: string): boolean {
  if (!userAnswer) return false;

  // 1. Базовая очистка
  let cleanUser = userAnswer.toLowerCase().trim().replace(/,/g, '.');
  let cleanDb = dbAnswer.toLowerCase().trim().replace(/,/g, '.');

  // === МАГИЯ ± ===
  // Функция, которая превращает "±5" в "5; -5"
  function expandPlusMinus(str: string): string {
    if (str.includes('±')) {
       const val = str.replace('±', '').trim();
       return `${val}; -${val}`; // Превращаем в список
    }
    if (str.startsWith('+-')) {
       const val = str.replace('+-', '').trim();
       return `${val}; -${val}`;
    }
    return str;
  }

  // Применяем расширение к обоим ответам
  cleanUser = expandPlusMinus(cleanUser);
  cleanDb = expandPlusMinus(cleanDb);

  // 2. Если строки идентичны — сразу да
  if (cleanUser === cleanDb) return true;

  try {
    // 3. Проверка на МНОЖЕСТВО ответов (или если мы раскрыли ±)
    // Разделитель может быть ; или пробел
    if (cleanDb.includes(';') || cleanDb.includes(' ') || cleanUser.includes(';')) {
      
      const extractNumbers = (str: string) => {
        // Ищем числа, игнорируем мусор. 
        // Важно: эта регулярка ловит -5, 5.5, но пропускает ± (мы его уже обработали выше)
        const matches = str.match(/-?\d+(\.\d+)?/g);
        return matches ? matches.map(n => parseFloat(n)).sort((a, b) => a - b) : [];
      };

      const userNums = extractNumbers(cleanUser);
      const dbNums = extractNumbers(cleanDb);

      // Сравниваем количество чисел
      if (userNums.length !== dbNums.length) return false;
      if (userNums.length === 0) return false;

      // Сравниваем каждое число с погрешностью
      return userNums.every((val, index) => Math.abs(val - dbNums[index]) < 0.001);
    }

    // 4. Обычное математическое вычисление (для 1/2 == 0.5)
    const userValue = evaluate(cleanUser);
    const dbValue = evaluate(cleanDb);

    if (typeof userValue === 'number' && typeof dbValue === 'number') {
      return Math.abs(userValue - dbValue) < 0.001; 
    }

  } catch (e) {
    // Если формула сложная (например "x > 5"), сравниваем как текст
    return cleanUser === cleanDb;
  }

  return false;
}