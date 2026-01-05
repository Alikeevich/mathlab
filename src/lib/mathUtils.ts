import { evaluate } from 'mathjs';

// === КОНСТАНТЫ ДЛЯ АЛГЕБРЫ ===
const ALGEBRA_SCOPE = {
  x: 3, y: 7, z: 11, t: 13,
  a: 17, b: 19, c: 23, d: 29,
  m: 31, n: 37, k: 41, p: 43, q: 47,
  u: 53, v: 59, S: 61, h: 67, r: 71,
  e: 2.718281828, pi: Math.PI
};

/**
 * Главная функция нормализации.
 * Превращает любой математический "мусор" и LaTeX в чистую формулу для MathJS.
 */
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.trim();

  // === 0. БАЗОВЫЕ ПРОВЕРКИ ===
  // Убираем "x =" в начале
  s = s.replace(/^[a-zA-Z]\s*=\s*/, '');

  // Пустое множество и "нет корней"
  if (s.includes('\\emptyset') || s.includes('\\O') ||
      /no\s*solution/i.test(s) || /нет\s*решений/i.test(s) ||
      /корней\s*нет/i.test(s) || s === '∅') {
    return 'NaN';
  }

  // === 1. УБИРАЕМ LaTeX МУСОР ===
  // Удаляем text, mathrm, mathbf и т.д.
  s = s.replace(/\\text\{[^}]*\}/g, '');
  s = s.replace(/\\mathrm\{([^}]*)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]*)\}/g, '$1');
  s = s.replace(/\\displaystyle/g, '');
  
  // Убираем пробелы LaTeX
  s = s.replace(/\\,/g, '');
  s = s.replace(/\\:/g, '');
  s = s.replace(/\\;/g, '');
  s = s.replace(/\\quad/g, '');
  s = s.replace(/\\qquad/g, '');

  // === 2. СТАНДАРТИЗАЦИЯ СИМВОЛОВ ===
  s = s.replace(/\{,\}/g, '.'); // LaTeX запятая
  s = s.replace(/,/g, '.');     // Обычная запятая (ТОЛЬКО для десятичных!)
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\times/g, '*');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  s = s.replace(/\\div/g, '/');
  s = s.replace(/÷/g, '/');
  
  // Знак минус (различные Unicode варианты) -> обычный минус
  s = s.replace(/−/g, '-'); // Unicode minus sign U+2212
  s = s.replace(/–/g, '-'); // En dash U+2013
  s = s.replace(/—/g, '-'); // Em dash U+2014
  
  // Двоеточие как деление ТОЛЬКО если это не интервал (x:y где оба числа)
  s = s.replace(/(\d+):(\d+)/g, (match, a, b) => {
    // Если похоже на дробь (небольшие числа), заменяем на деление
    if (parseInt(a) < 100 && parseInt(b) < 100) return `${a}/${b}`;
    return match; // Иначе оставляем (может быть интервал)
  });

  // Проценты
  s = s.replace(/\\%/g, '/100');
  s = s.replace(/([0-9.]+)%/g, '($1/100)');

  // Градусы
  s = s.replace(/\^\{\\circ\}/g, ' deg');
  s = s.replace(/\\circ/g, ' deg');
  s = s.replace(/°/g, ' deg');

  // Бесконечность и Пи
  s = s.replace(/\\infty/g, 'Infinity');
  s = s.replace(/∞/g, 'Infinity');
  s = s.replace(/\\pi\b/g, 'pi');
  s = s.replace(/π/g, 'pi');

  // Константы e
  s = s.replace(/\\mathrm\{e\}/g, 'e');
  s = s.replace(/\\e\b/g, 'e');
  
  // Экспонента: e^x -> exp(x) (для лучшей точности при больших степенях)
  // НО делаем это ПОСЛЕ обработки всего остального
  // s = s.replace(/\be\^(.+?)(?=[\s+\-*/)]|$)/g, 'exp($1)'); // Опционально

  // === 3. УБИРАЕМ СЛЕШИ LaTeX ===
  // Делаем это рано, чтобы не мешали
  s = s.replace(/\\left/g, '');
  s = s.replace(/\\right/g, '');

  // === 4. МОДУЛЬ (АБС) ===
  // |x| или \|x\| -> abs(x)
  // Важно: делаем ДО обработки дробей, чтобы не сломать их
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');

  // === 5. ПЕРЕИМЕНОВАНИЕ ФУНКЦИЙ (TG -> TAN) ===
  // Делаем это ДО обработки степеней
  const functionMap: { [key: string]: string } = {
    'arctg': 'atan',
    'arcctg': 'acot', 
    'arcsin': 'asin',
    'arccos': 'acos',
    'arctan': 'atan',
    'arccot': 'acot',
    'arcsec': 'asec',
    'arccsc': 'acsc',
    'tg': 'tan',
    'ctg': 'cot',
    'sh': 'sinh',
    'ch': 'cosh',
    'th': 'tanh',
    'cth': 'coth',
    'lg': 'log10',
    'ln': 'log'
  };

  // Удаляем обратные слеши перед функциями
  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|coth|arcsin|arccos|arctan|arccot|log|ln|lg|exp|sqrt)/g, '$1');

  // Применяем замены функций
  for (const [oldFunc, newFunc] of Object.entries(functionMap)) {
    const regex = new RegExp(`\\b${oldFunc}\\b`, 'gi');
    s = s.replace(regex, newFunc);
  }

  // === 6. ТРИГОНОМЕТРИЧЕСКИЕ СТЕПЕНИ (tan^2 x -> (tan(x))^2) ===
  // Паттерн: функция^степень аргумент
  // tan^2 x -> (tan(x))^2
  // tan^2(x) -> (tan(x))^2
  const trigFuncs = 'sin|cos|tan|cot|sec|csc|asin|acos|atan|acot|sinh|cosh|tanh|coth|log|log10';
  const trigPowRegex = new RegExp(`(${trigFuncs})\\^\\{?(\\d+)\\}?\\s*(\\([^)]+\\)|[a-z0-9]+)`, 'gi');
  s = s.replace(trigPowRegex, '($1($3))^$2');

  // === 7. СМЕШАННЫЕ ЧИСЛА ===
  // 1 1/2 -> 1+1/2
  s = s.replace(/(\d)\s+(\d+\/\d+)/g, '$1+$2');

  // === 8. ДРОБИ ===
  // frac{a}{b} -> ((a)/(b))
  // Обрабатываем вложенные дроби в цикле
  let prevS = '';
  let iterations = 0;
  while (prevS !== s && iterations < 10) {
    prevS = s;
    s = s.replace(/d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
    iterations++;
  }
  // Финальная обработка оставшихся фигурных скобок во фракциях
  s = s.replace(/frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');

  // === 9. КОРНИ ===
  // Корень n-ной степени: \sqrt[3]{8} -> nthRoot(8, 3)
  s = s.replace(/sqrt\[(.+?)\]\{(.+?)\}/g, 'nthRoot($2, $1)');
  s = s.replace(/√\[(.+?)\]\{(.+?)\}/g, 'nthRoot($2, $1)');
  
  // Квадратный корень: \sqrt{4} -> sqrt(4)
  s = s.replace(/sqrt\{(.+?)\}/g, 'sqrt($1)');
  s = s.replace(/√\{(.+?)\}/g, 'sqrt($1)');
  
  // Корень без фигурных скобок: √2 -> sqrt(2)
  // ВАЖНО: только для одиночных символов, иначе √23 станет sqrt(2)3
  s = s.replace(/√(\d+\.?\d*)/g, 'sqrt($1)'); // √2.5 -> sqrt(2.5)
  s = s.replace(/√([a-z])/g, 'sqrt($1)');     // √x -> sqrt(x)

  // === 10. ЛОГАРИФМЫ ===
  // ВАЖНО: обрабатываем логарифмы с основанием ПЕРЕД log -> log10
  s = s.replace(/log_\{(.+?)\}\((.+?)\)/g, 'log($2, $1)');
  s = s.replace(/log_\{(.+?)\}\{(.+?)\}/g, 'log($2, $1)');
  s = s.replace(/log_\{(.+?)\}([a-z0-9]+)/g, 'log($2, $1)');
  
  // log без основания -> log10 (школьный стандарт)
  // НО: если уже есть log(x, base) с запятой, не трогаем!
  // Проверяем: нет ли уже запятой внутри скобок log(...)
  s = s.replace(/\blog\(/g, (match, offset) => {
    // Ищем закрывающую скобку и проверяем, есть ли внутри запятая
    let depth = 1;
    let hasComma = false;
    for (let i = offset + 4; i < s.length && depth > 0; i++) {
      if (s[i] === '(') depth++;
      if (s[i] === ')') depth--;
      if (s[i] === ',' && depth === 1) hasComma = true;
    }
    return hasComma ? 'log(' : 'log10(';
  });

  // === 11. ФАКТОРИАЛЫ И КОМБИНАТОРИКА ===
  // Обрабатываем факториалы: n! -> factorial(n)
  s = s.replace(/(\d+)!/g, 'factorial($1)');
  s = s.replace(/([a-z])!/g, 'factorial($1)'); // x! -> factorial(x)
  s = s.replace(/\(([^)]+)\)!/g, 'factorial(($1))'); // (n+1)! -> factorial((n+1))
  
  // Биномиальные коэффициенты: C(n,k) или C_n^k -> combinations(n, k)
  // ВАЖНО: mathjs может не иметь встроенной функции combinations
  // В этом случае нужно добавить в scope: combinations = (n, k) => factorial(n) / (factorial(k) * factorial(n-k))
  s = s.replace(/C\((\d+),\s*(\d+)\)/gi, 'combinations($1, $2)');
  s = s.replace(/C_\{?(\d+)\}?\^\{?(\d+)\}?/gi, 'combinations($1, $2)');
  
  // Размещения: A(n,k) или A_n^k -> permutations(n, k)  
  s = s.replace(/A\((\d+),\s*(\d+)\)/gi, 'permutations($1, $2)');
  s = s.replace(/A_\{?(\d+)\}?\^\{?(\d+)\}?/gi, 'permutations($1, $2)');

  // === 12. СТЕПЕНИ ===
  // Обрабатываем степени с фигурными скобками: x^{2} -> x^(2)
  s = s.replace(/\^\{(.+?)\}/g, '^($1)');
  
  // Python style ** -> ^
  s = s.replace(/\*\*/g, '^');
  
  // Отрицательные степени: x^-2 -> x^(-2) (для надежности)
  s = s.replace(/\^-(\d+)/g, '^(-$1)');

  // === 13. ЧИСТКА ===
  s = s.replace(/[{}]/g, ''); // Убираем остатки фигурных скобок
  s = s.replace(/\\/g, '');   // Убираем оставшиеся слеши

  // === 14. LOWERCASE (но сохраняем Infinity и deg) ===
  const preserveCase = s.match(/Infinity|\sdeg/g) || [];
  s = s.toLowerCase();
  // Восстанавливаем Infinity
  s = s.replace(/infinity/g, 'Infinity');

  // === 15. УБИРАЕМ ЛИШНИЕ ПРОБЕЛЫ (но НЕ перед deg) ===
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*([+\-*/^()=])\s*/g, '$1'); // Убираем пробелы вокруг операторов
  s = s.replace(/(\d)\s+deg/g, '$1 deg'); // Восстанавливаем пробел перед deg

  // === 16. НЕЯВНОЕ УМНОЖЕНИЕ ===
  // Это самая сложная часть. Нужно добавить * между:
  // - число и буква: 2x -> 2*x
  // - число и скобка: 2( -> 2*(
  // - скобка и буква: )x -> )*x
  // - скобка и скобка: )( -> )*(
  // - буква и скобка: x( -> x*(
  // НО НЕ внутри имен функций!

  // Защита: помечаем известные функции, чтобы не сломать их
  const knownFuncs = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'acot', 
                      'sinh', 'cosh', 'tanh', 'coth', 'sqrt', 'abs', 'log', 'log10', 'exp', 
                      'nthroot', 'factorial'];
  
  // 1. Число перед буквой (НЕ deg!) или скобкой: 2x -> 2*x, 2( -> 2*(
  s = s.replace(/(\d)(?=([a-z](?!deg)))/gi, '$1*');
  s = s.replace(/(\d)(?=\()/g, '$1*');
  
  // 2. Скобка перед буквой или скобкой: )x -> )*x, )( -> )*(
  s = s.replace(/(\))(?=[a-z])/gi, '$1*');
  s = s.replace(/(\))(?=\()/g, '$1*');
  
  // 3. Буква/слово перед скобкой (если это НЕ функция): x( -> x*(
  // Проверяем каждое слово перед скобкой
  s = s.replace(/([a-z]+)(?=\()/gi, (match, word) => {
    if (knownFuncs.includes(word.toLowerCase())) return word; // Это функция, не трогаем
    return `${word}*`; // Иначе добавляем умножение
  });
  
  // 4. Две буквы рядом (xy -> x*y), ТОЛЬКО для одиночных переменных
  // Разбиваем последовательности букв на токены и решаем, что с ними делать
  s = s.replace(/[a-z]+/g, (word) => {
    // Если это известная функция или константа - не трогаем
    if (knownFuncs.includes(word.toLowerCase()) || ['pi', 'infinity', 'deg'].includes(word.toLowerCase())) {
      return word;
    }
    
    // Если это последовательность переменных из scope - разделяем звездочками
    // Например: "xyz" -> "x*y*z", но только если x, y, z есть в ALGEBRA_SCOPE
    const chars = word.split('');
    if (chars.length > 1 && chars.every(c => ALGEBRA_SCOPE.hasOwnProperty(c))) {
      return chars.join('*');
    }
    
    return word;
  });

  return s;
}

/**
 * Разворачивает ± (плюс-минус) в массив вариантов
 */
function expandOptions(str: string): string[] {
  const parts = str.split(';'); // Разделитель ответов
  let results: string[] = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    // Заменяем разные виды плюс-минуса на один
    part = part.replace(/\\pm/g, '±');
    part = part.replace(/\+-/g, '±');
    part = part.replace(/-\+/g, '∓'); // минус-плюс
    part = part.replace(/\\mp/g, '∓');

    // Обработка ±
    if (part.includes('±')) {
      const idx = part.indexOf('±');
      const left = part.substring(0, idx);
      const right = part.substring(idx + 1);

      const rStr = right.match(/[+\-*/^]/) ? `(${right})` : right;
      const plus = `${left}+${rStr}`;
      const minus = `${left}-${rStr}`;
      
      results = results.concat(expandOptions(plus));
      results = results.concat(expandOptions(minus));
      continue;
    }

    // Обработка ∓ (минус-плюс)
    if (part.includes('∓')) {
      const idx = part.indexOf('∓');
      const left = part.substring(0, idx);
      const right = part.substring(idx + 1);

      const rStr = right.match(/[+\-*/^]/) ? `(${right})` : right;
      const minus = `${left}-${rStr}`;
      const plus = `${left}+${rStr}`;
      
      results = results.concat(expandOptions(minus));
      results = results.concat(expandOptions(plus));
      continue;
    }

    results.push(part);
  }
  return results;
}

/**
 * Проверка, является ли строка интервалом (x, y) или [x, y]
 */
function parseInterval(str: string): { isInterval: boolean; values?: number[] } {
  const intervalRegex = /^[\[\(](.+?)[,;](.+?)[\]\)]$/;
  const match = str.match(intervalRegex);
  if (!match) return { isInterval: false };

  try {
    const v1 = parseFloat(match[1].trim());
    const v2 = parseFloat(match[2].trim());
    if (!isNaN(v1) && !isNaN(v2)) {
      return { isInterval: true, values: [v1, v2].sort((a, b) => a - b) };
    }
  } catch (e) {
    // не интервал
  }
  return { isInterval: false };
}

export function checkAnswer(userAnswer: string, dbAnswer: string): boolean {
  if (!userAnswer) return false;

  try {
    // Проверка на интервалы
    const userInterval = parseInterval(userAnswer);
    const dbInterval = parseInterval(dbAnswer);
    
    if (userInterval.isInterval && dbInterval.isInterval && userInterval.values && dbInterval.values) {
      return userInterval.values.every((v, i) => 
        Math.abs(v - dbInterval.values![i]) < 0.001
      );
    }

    const userExprs = expandOptions(userAnswer);
    const dbExprs = expandOptions(dbAnswer);

    // Функция вычисления значения
    const calculate = (expr: string): number => {
      try {
        const norm = normalizeForCalculation(expr);
        if (norm === 'NaN') return NaN;
        
        // Считаем с подстановкой "алгебраических" чисел
        const res = evaluate(norm, ALGEBRA_SCOPE);
        
        if (typeof res === 'number') return res;
        if (typeof res === 'object' && res !== null) {
          // Может быть комплексное число, единица измерения и т.д.
          // Пытаемся извлечь число
          if ('re' in res) return (res as any).re; // Комплексное число
        }
        return NaN;
      } catch (e) {
        return NaN;
      }
    };

    const userValues = userExprs.map(calculate);
    const dbValues = dbExprs.map(calculate);

    // Если есть NaN (не смогли посчитать), падаем в текстовое сравнение
    if (userValues.some(isNaN) || dbValues.some(isNaN)) {
      throw new Error("Calculation failed");
    }

    // Сортируем значения, чтобы порядок ответов не влиял (x1; x2)
    userValues.sort((a, b) => a - b);
    dbValues.sort((a, b) => a - b);

    if (userValues.length !== dbValues.length) return false;

    // Сравниваем каждое значение с допуском погрешности
    return userValues.every((uVal, i) => {
      const dVal = dbValues[i];
      
      // Infinity == Infinity
      if (!isFinite(uVal) || !isFinite(dVal)) {
        return uVal === dVal;
      }

      const diff = Math.abs(uVal - dVal);
      
      // 1. Абсолютная точность для целых (защита от 3.00000004)
      if (Math.abs(Math.round(uVal) - uVal) < 1e-9 && Math.abs(Math.round(dVal) - dVal) < 1e-9) {
        return Math.abs(Math.round(uVal) - Math.round(dVal)) === 0;
      }
      
      // 2. Относительная точность для дробей и корней
      const tolerance = Math.max(0.001, Math.abs(dVal * 0.001)); // 0.1% погрешность
      return diff <= tolerance;
    });

  } catch (e) {
    // FALLBACK: Строковое сравнение нормализованных формул
    const clean = (s: string) => normalizeForCalculation(s).replace(/\s/g, '');
    const userSorted = expandOptions(userAnswer).map(clean).sort().join(';');
    const dbSorted = expandOptions(dbAnswer).map(clean).sort().join(';');
    return userSorted === dbSorted;
  }
}
