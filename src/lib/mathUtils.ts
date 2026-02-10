import { evaluate } from 'mathjs';

// === КОНСТАНТЫ ДЛЯ АЛГЕБРЫ ===
const ALGEBRA_SCOPE = {
  x: 3, y: 7, z: 11, t: 13,
  a: 17, b: 19, c: 23, d: 29,
  m: 31, n: 37, k: 41, p: 43, q: 47,
  u: 53, v: 59, S: 61, h: 67, r: 71,
  e: 2.718281828, pi: Math.PI,
  
  // === КОМБИНАТОРНЫЕ ФУНКЦИИ ===
  // C(n, k) = n! / (k! * (n-k)!)
  combinations: (n: number, k: number): number => {
    if (k > n || k < 0 || n < 0) return 0;
    if (k === 0 || k === n) return 1;
    
    // Оптимизация: C(n,k) = C(n, n-k)
    k = Math.min(k, n - k);
    
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i) / (i + 1);
    }
    return Math.round(result);
  },
  
  // A(n, k) = n! / (n-k)!
  permutations: (n: number, k: number): number => {
    if (k > n || k < 0 || n < 0) return 0;
    
    let result = 1;
    for (let i = 0; i < k; i++) {
      result *= (n - i);
    }
    return result;
  }
};

/**
 * Главная функция нормализации.
 * Превращает любой математический "мусор" и LaTeX в чистую формулу для MathJS.
 */
function normalizeForCalculation(str: string): string {
  if (!str) return '';
  let s = str.trim();

  // === 0. БАЗОВЫЕ ПРОВЕРКИ ===
  s = s.replace(/^[a-zA-Z]\s*=\s*/, '');

  if (s.includes('\\emptyset') || s.includes('\\O') ||
      /no\s*solution/i.test(s) || /нет\s*решений/i.test(s) ||
      /корней\s*нет/i.test(s) || s === '∅') {
    return 'NaN';
  }

  // === 1. УБИРАЕМ LaTeX МУСОР ===
  s = s.replace(/\\text\{[^}]*\}/g, '');
  s = s.replace(/\\mathrm\{([^}]*)\}/g, '$1');
  s = s.replace(/\\mathbf\{([^}]*)\}/g, '$1');
  s = s.replace(/\\displaystyle/g, '');
  
  s = s.replace(/\\,/g, '');
  s = s.replace(/\\:/g, '');
  s = s.replace(/\\;/g, '');
  s = s.replace(/\\quad/g, '');
  s = s.replace(/\\qquad/g, '');

  // === 2. СТАНДАРТИЗАЦИЯ СИМВОЛОВ ===
  s = s.replace(/\{,\}/g, '.');
  s = s.replace(/,/g, '.');
  s = s.replace(/\\cdot/g, '*');
  s = s.replace(/\\times/g, '*');
  s = s.replace(/×/g, '*');
  s = s.replace(/⋅/g, '*');
  s = s.replace(/\\div/g, '/');
  s = s.replace(/÷/g, '/');
  
  s = s.replace(/−/g, '-');
  s = s.replace(/–/g, '-');
  s = s.replace(/—/g, '-');
  
  s = s.replace(/(\d+):(\d+)/g, (match, a, b) => {
    if (parseInt(a) < 100 && parseInt(b) < 100) return `${a}/${b}`;
    return match;
  });

  s = s.replace(/\\%/g, '/100');
  s = s.replace(/([0-9.]+)%/g, '($1/100)');

  s = s.replace(/\^\{\\circ\}/g, ' deg');
  s = s.replace(/\\circ/g, ' deg');
  s = s.replace(/°/g, ' deg');

  s = s.replace(/\\infty/g, 'Infinity');
  s = s.replace(/∞/g, 'Infinity');
  s = s.replace(/\\pi\b/g, 'pi');
  s = s.replace(/π/g, 'pi');

  s = s.replace(/\\mathrm\{e\}/g, 'e');
  s = s.replace(/\\e\b/g, 'e');

  // === 3. ПЛЮС-МИНУС (±) ===
  s = s.replace(/\\pm/g, '±');

  // === 4. УБИРАЕМ СЛЕШИ LaTeX ===
  s = s.replace(/\\left/g, '');
  s = s.replace(/\\right/g, '');

  // === 5. МОДУЛЬ ===
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');

  // === 6. ПЕРЕИМЕНОВАНИЕ ФУНКЦИЙ ===
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

  s = s.replace(/\\(sin|cos|tan|cot|sec|csc|sinh|cosh|tanh|coth|arcsin|arccos|arctan|arccot|log|ln|lg|exp|sqrt)/g, '$1');

  for (const [oldFunc, newFunc] of Object.entries(functionMap)) {
    const regex = new RegExp(`\\b${oldFunc}\\b`, 'gi');
    s = s.replace(regex, newFunc);
  }

  // === 7. ТРИГОНОМЕТРИЧЕСКИЕ СТЕПЕНИ ===
  const trigFuncs = 'sin|cos|tan|cot|sec|csc|asin|acos|atan|acot|sinh|cosh|tanh|coth|log|log10';
  const trigPowRegex = new RegExp(`(${trigFuncs})\\^\\{?(\\d+)\\}?\\s*(\\([^)]+\\)|[a-z0-9]+)`, 'gi');
  s = s.replace(trigPowRegex, '($1($3))^$2');

  // === 8. СМЕШАННЫЕ ЧИСЛА ===
  s = s.replace(/(\d)\s+(\d+\/\d+)/g, '$1+$2');

  // === 9. ДРОБИ ===
  let prevS = '';
  let iterations = 0;
  while (prevS !== s && iterations < 10) {
    prevS = s;
    s = s.replace(/d?frac\{([^{}]+)\}\{([^{}]+)\}/g, '(($1)/($2))');
    iterations++;
  }
  s = s.replace(/frac\{(.+?)\}\{(.+?)\}/g, '(($1)/($2))');

  // === 10. КОРНИ ===
  s = s.replace(/sqrt\[(.+?)\]\{(.+?)\}/g, 'nthRoot($2, $1)');
  s = s.replace(/√\[(.+?)\]\{(.+?)\}/g, 'nthRoot($2, $1)');
  
  s = s.replace(/sqrt\{(.+?)\}/g, 'sqrt($1)');
  s = s.replace(/√\{(.+?)\}/g, 'sqrt($1)');
  
  s = s.replace(/√(\d+\.?\d*)/g, 'sqrt($1)');
  s = s.replace(/√([a-z])/g, 'sqrt($1)');

  // === 11. ЛОГАРИФМЫ ===
  s = s.replace(/log_\{(.+?)\}\((.+?)\)/g, 'log($2, $1)');
  s = s.replace(/log_\{(.+?)\}\{(.+?)\}/g, 'log($2, $1)');
  s = s.replace(/log_\{(.+?)\}([a-z0-9]+)/g, 'log($2, $1)');
  
  s = s.replace(/\blog\(/g, (match, offset) => {
    let depth = 1;
    let hasComma = false;
    for (let i = offset + 4; i < s.length && depth > 0; i++) {
      if (s[i] === '(') depth++;
      if (s[i] === ')') depth--;
      if (s[i] === ',' && depth === 1) hasComma = true;
    }
    return hasComma ? 'log(' : 'log10(';
  });

  // === 12. ФАКТОРИАЛЫ И КОМБИНАТОРИКА ===
  s = s.replace(/(\d+)!/g, 'factorial($1)');
  s = s.replace(/([a-z])!/g, 'factorial($1)');
  s = s.replace(/\(([^)]+)\)!/g, 'factorial(($1))');
  
  // === НОВОЕ: Биномиальные коэффициенты C_n^k ===
  // C_{n}^{k} → combinations(n, k)
  s = s.replace(/C_\{(\d+)\}\^\{(\d+)\}/g, 'combinations($1, $2)');
  s = s.replace(/C_(\d+)\^(\d+)/g, 'combinations($1, $2)');
  
  // C(n,k) → combinations(n, k)
  s = s.replace(/C\((\d+),\s*(\d+)\)/gi, 'combinations($1, $2)');
  
  // Размещения A_n^k
  s = s.replace(/A_\{(\d+)\}\^\{(\d+)\}/g, 'permutations($1, $2)');
  s = s.replace(/A_(\d+)\^(\d+)/g, 'permutations($1, $2)');
  s = s.replace(/A\((\d+),\s*(\d+)\)/gi, 'permutations($1, $2)');

  // === 13. СТЕПЕНИ ===
  s = s.replace(/\^\{(.+?)\}/g, '^($1)');
  s = s.replace(/\*\*/g, '^');
  s = s.replace(/\^-(\d+)/g, '^(-$1)');

  // === 14. ЧИСТКА ===
  s = s.replace(/[{}]/g, '');
  s = s.replace(/\\/g, '');

  // === 15. LOWERCASE ===
  const preserveCase = s.match(/Infinity|\sdeg/g) || [];
  s = s.toLowerCase();
  s = s.replace(/infinity/g, 'Infinity');

  // === 16. УБИРАЕМ ПРОБЕЛЫ ===
  s = s.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*([+\-*/^()=])\s*/g, '$1');
  s = s.replace(/(\d)\s+deg/g, '$1 deg');

  // === 17. НЕЯВНОЕ УМНОЖЕНИЕ ===
  const knownFuncs = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'acot', 
                      'sinh', 'cosh', 'tanh', 'coth', 'sqrt', 'abs', 'log', 'log10', 'exp', 
                      'nthroot', 'factorial', 'combinations', 'permutations'];
  
  s = s.replace(/(\d)(?=([a-z](?!deg)))/gi, '$1*');
  s = s.replace(/(\d)(?=\()/g, '$1*');
  
  s = s.replace(/(\))(?=[a-z])/gi, '$1*');
  s = s.replace(/(\))(?=\()/g, '$1*');
  
  s = s.replace(/([a-z]+)(?=\()/gi, (match, word) => {
    if (knownFuncs.includes(word.toLowerCase())) return word;
    return `${word}*`;
  });
  
  s = s.replace(/[a-z]+/g, (word) => {
    if (knownFuncs.includes(word.toLowerCase()) || ['pi', 'infinity', 'deg'].includes(word.toLowerCase())) {
      return word;
    }
    
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
  const parts = str.split(';');
  let results: string[] = [];

  for (let part of parts) {
    part = part.trim();
    if (!part) continue;

    part = part.replace(/\\pm/g, '±');
    part = part.replace(/\+-/g, '±');
    part = part.replace(/-\+/g, '∓');
    part = part.replace(/\\mp/g, '∓');

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
 * Проверка интервала
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
    const userInterval = parseInterval(userAnswer);
    const dbInterval = parseInterval(dbAnswer);
    
    if (userInterval.isInterval && dbInterval.isInterval && userInterval.values && dbInterval.values) {
      return userInterval.values.every((v, i) => 
        Math.abs(v - dbInterval.values![i]) < 0.001
      );
    }

    const userExprs = expandOptions(userAnswer);
    const dbExprs = expandOptions(dbAnswer);

    const calculate = (expr: string): number => {
      try {
        const norm = normalizeForCalculation(expr);
        if (norm === 'NaN') return NaN;
        
        const res = evaluate(norm, ALGEBRA_SCOPE);
        
        if (typeof res === 'number') return res;
        if (typeof res === 'object' && res !== null) {
          if ('re' in res) return (res as any).re;
        }
        return NaN;
      } catch (e) {
        return NaN;
      }
    };

    const userValues = userExprs.map(calculate);
    const dbValues = dbExprs.map(calculate);

    if (userValues.some(isNaN) || dbValues.some(isNaN)) {
      throw new Error("Calculation failed");
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
      
      if (Math.abs(Math.round(uVal) - uVal) < 1e-9 && Math.abs(Math.round(dVal) - dVal) < 1e-9) {
        return Math.abs(Math.round(uVal) - Math.round(dVal)) === 0;
      }
      
      const tolerance = Math.max(0.001, Math.abs(dVal * 0.001));
      return diff <= tolerance;
    });

  } catch (e) {
    const clean = (s: string) => normalizeForCalculation(s).replace(/\s/g, '');
    const userSorted = expandOptions(userAnswer).map(clean).sort().join(';');
    const dbSorted = expandOptions(dbAnswer).map(clean).sort().join(';');
    return userSorted === dbSorted;
  }
}