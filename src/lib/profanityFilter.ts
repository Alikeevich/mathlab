// Корневые формы слов — regex подхватит все словоформы
const BAD_ROOTS = [
  // Русский мат
  'хуй', 'хуе', 'хуи', 'хую', 'хуя', 'хуёв',
  'пизд', 'пизда', 'пизде', 'пизду',
  'ёб', 'еб', 'ёба', 'еба', 'заёб', 'заеб', 'выёб', 'выеб', 'наёб', 'наеб',
  'блять', 'бля', 'блят',
  'мудак', 'мудил', 'мудозвон',
  'пидор', 'пидар', 'педик',
  'залуп', 'шлюх', 'проститут', 'гандон', 'ублюдок',
  'сука', 'сукин',
  // Английский мат
  'fuck', 'fuk', 'fck',
  'shit', 'sht',
  'bitch', 'btch',
  'cunt', 'dick', 'cock',
  'nigger', 'nigga',
  'faggot', 'fag',
  'asshole', 'bastard', 'whore', 'slut',
  // Зарезервированные
  'admin', 'moderator', 'support', 'system', 'root', 'superuser',
];

// Нормализация: leetspeak + убираем разделители
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[аa@4]/g, 'a').replace(/[еe3]/g, 'e')
    .replace(/[иi1!]/g, 'i').replace(/[оo0]/g, 'o')
    .replace(/[уuy]/g, 'u').replace(/[sS\$5]/g, 's')
    .replace(/[bB6]/g, 'b').replace(/[tT7+]/g, 't')
    .replace(/ph/g, 'f')
    .replace(/[_\-\.\s]/g, ''); // f_u_c_k → fuck
}

export function containsBadWord(username: string): boolean {
  const normalized = normalize(username);
  const original = username.toLowerCase();

  return BAD_ROOTS.some((root) => {
    const normRoot = normalize(root);
    return normalized.includes(normRoot) || original.includes(root.toLowerCase());
  });
}