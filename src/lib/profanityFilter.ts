import { Filter } from 'glin-profanity';

const filter = new Filter({
  languages: ['english', 'russian'],
  detectLeetspeak: true,
  leetspeakLevel: 'aggressive',
  normalizeUnicode: true,
});

filter.addWords([
  'admin', 'moderator', 'support', 'system', 'root',
  'залупа', 'залупин', 'шлюха', 'шлюшка', 'пидорас', 'пизда', 'пиздабол', 'долбаеб', 'блядина', 'хуй', '667', 'котак', 'ам', 'амшелек', 'ебарь',  'пидараз', 'щщс', 'ёбарь', 'секс', 'уебан', 'бля', 'пидарас', 'уебок', 'мал',
  ]);

export function containsBadWord(username: string): boolean {
  return filter.isProfane(username);
}