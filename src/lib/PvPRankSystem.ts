export type PvPTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master' | 'grandmaster';

export interface PvPRank {
  tier: PvPTier;
  division: number; // 1-4 (IV, III, II, I), 0 для Master/Grandmaster
  minMMR: number;
  maxMMR: number;
  name: string;
  fullName: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  icon: string;
  description: string;
}

// === ОПРЕДЕЛЕНИЕ ВСЕХ РАНГОВ ===
export const PVP_RANKS: PvPRank[] = [
  { tier: 'bronze', division: 4, minMMR: 500, maxMMR: 549, name: 'Bronze IV', fullName: 'Бронза IV', color: 'text-orange-700', gradientFrom: '#92400e', gradientTo: '#78350f', icon: '🥉', description: 'Начало пути' },
  { tier: 'bronze', division: 3, minMMR: 550, maxMMR: 599, name: 'Bronze III', fullName: 'Бронза III', color: 'text-orange-600', gradientFrom: '#9a3412', gradientTo: '#92400e', icon: '🥉', description: 'Учимся основам' },
  { tier: 'bronze', division: 2, minMMR: 600, maxMMR: 649, name: 'Bronze II', fullName: 'Бронза II', color: 'text-orange-500', gradientFrom: '#c2410c', gradientTo: '#9a3412', icon: '🥉', description: 'Прогресс виден' },
  { tier: 'bronze', division: 1, minMMR: 650, maxMMR: 699, name: 'Bronze I', fullName: 'Бронза I', color: 'text-orange-400', gradientFrom: '#ea580c', gradientTo: '#c2410c', icon: '🥉', description: 'Шаг до серебра' },
  { tier: 'silver', division: 4, minMMR: 700, maxMMR: 749, name: 'Silver IV', fullName: 'Серебро IV', color: 'text-slate-400', gradientFrom: '#475569', gradientTo: '#334155', icon: '🥈', description: 'Серебряная лига' },
  { tier: 'silver', division: 3, minMMR: 750, maxMMR: 799, name: 'Silver III', fullName: 'Серебро III', color: 'text-slate-300', gradientFrom: '#64748b', gradientTo: '#475569', icon: '🥈', description: 'Растущий навык' },
  { tier: 'silver', division: 2, minMMR: 800, maxMMR: 849, name: 'Silver II', fullName: 'Серебро II', color: 'text-slate-200', gradientFrom: '#94a3b8', gradientTo: '#64748b', icon: '🥈', description: 'Уверенная игра' },
  { tier: 'silver', division: 1, minMMR: 850, maxMMR: 899, name: 'Silver I', fullName: 'Серебро I', color: 'text-slate-100', gradientFrom: '#cbd5e1', gradientTo: '#94a3b8', icon: '🥈', description: 'Путь к золоту' },
  { tier: 'gold', division: 4, minMMR: 900, maxMMR: 949, name: 'Gold IV', fullName: 'Золото IV', color: 'text-yellow-600', gradientFrom: '#ca8a04', gradientTo: '#a16207', icon: '🥇', description: 'Золотая лига' },
  { tier: 'gold', division: 3, minMMR: 950, maxMMR: 999, name: 'Gold III', fullName: 'Золото III', color: 'text-yellow-500', gradientFrom: '#eab308', gradientTo: '#ca8a04', icon: '🥇', description: 'Сильный игрок' },
  { tier: 'gold', division: 2, minMMR: 1000, maxMMR: 1049, name: 'Gold II', fullName: 'Золото II', color: 'text-yellow-400', gradientFrom: '#facc15', gradientTo: '#eab308', icon: '🥇', description: 'Опытный боец' },
  { tier: 'gold', division: 1, minMMR: 1050, maxMMR: 1099, name: 'Gold I', fullName: 'Золото I', color: 'text-yellow-300', gradientFrom: '#fde047', gradientTo: '#facc15', icon: '🥇', description: 'Элита золота' },
  { tier: 'platinum', division: 4, minMMR: 1100, maxMMR: 1149, name: 'Platinum IV', fullName: 'Платина IV', color: 'text-cyan-500', gradientFrom: '#06b6d4', gradientTo: '#0891b2', icon: '💎', description: 'Платиновая лига' },
  { tier: 'platinum', division: 3, minMMR: 1150, maxMMR: 1199, name: 'Platinum III', fullName: 'Платина III', color: 'text-cyan-400', gradientFrom: '#22d3ee', gradientTo: '#06b6d4', icon: '💎', description: 'Высокий уровень' },
  { tier: 'platinum', division: 2, minMMR: 1200, maxMMR: 1249, name: 'Platinum II', fullName: 'Платина II', color: 'text-cyan-300', gradientFrom: '#67e8f9', gradientTo: '#22d3ee', icon: '💎', description: 'Топовый игрок' },
  { tier: 'platinum', division: 1, minMMR: 1250, maxMMR: 1299, name: 'Platinum I', fullName: 'Платина I', color: 'text-cyan-200', gradientFrom: '#a5f3fc', gradientTo: '#67e8f9', icon: '💎', description: 'Шаг до алмаза' },
  { tier: 'diamond', division: 4, minMMR: 1300, maxMMR: 1349, name: 'Diamond IV', fullName: 'Алмаз IV', color: 'text-blue-400', gradientFrom: '#60a5fa', gradientTo: '#3b82f6', icon: '💠', description: 'Алмазная лига' },
  { tier: 'diamond', division: 3, minMMR: 1350, maxMMR: 1399, name: 'Diamond III', fullName: 'Алмаз III', color: 'text-blue-300', gradientFrom: '#93c5fd', gradientTo: '#60a5fa', icon: '💠', description: 'Редкий навык' },
  { tier: 'diamond', division: 2, minMMR: 1400, maxMMR: 1449, name: 'Diamond II', fullName: 'Алмаз II', color: 'text-blue-200', gradientFrom: '#bfdbfe', gradientTo: '#93c5fd', icon: '💠', description: 'Элита элит' },
  { tier: 'diamond', division: 1, minMMR: 1450, maxMMR: 1499, name: 'Diamond I', fullName: 'Алмаз I', color: 'text-blue-100', gradientFrom: '#dbeafe', gradientTo: '#bfdbfe', icon: '💠', description: 'Грань мастерства' },
  { tier: 'master', division: 0, minMMR: 1500, maxMMR: 1699, name: 'Master', fullName: 'Мастер', color: 'text-purple-400', gradientFrom: '#c084fc', gradientTo: '#a855f7', icon: '👑', description: 'Мастер арены' },
  { tier: 'grandmaster', division: 0, minMMR: 1700, maxMMR: 9999, name: 'Grandmaster', fullName: 'Грандмастер', color: 'text-red-400', gradientFrom: '#f87171', gradientTo: '#ef4444', icon: '🏆', description: 'Легенда MathLab' },
];

// Sort once (ascending by minMMR) so logic doesn't depend on declaration order
const SORTED_RANKS = [...PVP_RANKS].sort((a, b) => a.minMMR - b.minMMR);

// === ПОЛУЧИТЬ РАНГ ПО MMR ===
export function getPvPRankByMMR(mmr: number): PvPRank {
  // find highest rank with minMMR <= mmr
  for (let i = SORTED_RANKS.length - 1; i >= 0; i--) {
    const r = SORTED_RANKS[i];
    if (mmr >= r.minMMR) return r;
  }
  return SORTED_RANKS[0];
}

// === ПРОГРЕСС ВНУТРИ ДИВИЗИОНА (0-100%) ===
export function getRankProgress(mmr: number): number {
  const rank = getPvPRankByMMR(mmr);
  const range = Math.max(1, rank.maxMMR - rank.minMMR); // защита от 0
  const progress = mmr - rank.minMMR;
  return Math.min(Math.max((progress / range) * 100, 0), 100);
}

// === ПРОВЕРКА ПОВЫШЕНИЯ РАНГА ===
export function checkRankUp(oldMMR: number, newMMR: number): PvPRank | null {
  const oldRank = getPvPRankByMMR(oldMMR);
  const newRank = getPvPRankByMMR(newMMR);
  if (oldRank.name !== newRank.name) return newRank;
  return null;
}

// === КОРОТКОЕ НАЗВАНИЕ (Для UI) ===
export function getShortRankName(mmr: number): string {
  const rank = getPvPRankByMMR(mmr);
  if (rank.division === 0) return rank.name;
  return `${rank.tier.charAt(0).toUpperCase()}${rank.division}`;
}

// === РИМСКИЕ ЦИФРЫ ===
export function getDivisionRoman(division: number): string {
  const romans = ['', 'I', 'II', 'III', 'IV'];
  return romans[division] || '';
}

// === MMR ЗА ПОБЕДУ/ПОРАЖЕНИЕ (С УЧЕТОМ РАЗНИЦЫ) ===
export function calculateMMRChange(
  myMMR: number,
  oppMMR: number,
  won: boolean,
  options: { K?: number; MIN_ABS?: number; MAX_ABS?: number } = {}
): number {
  const { K = 32, MIN_ABS = 10, MAX_ABS = 50 } = options;
  const expectedScore = 1 / (1 + Math.pow(10, (oppMMR - myMMR) / 400));
  const actualScore = won ? 1 : 0;
  let change = Math.round(K * (actualScore - expectedScore));

  // Ограничение по абсолютной величине
  change = Math.max(-MAX_ABS, Math.min(MAX_ABS, change));

  // Гарантируем минимальную видимую реакцию (если не нулевой)
  if (change !== 0 && Math.abs(change) < MIN_ABS) {
    change = change > 0 ? MIN_ABS : -MIN_ABS;
  }

  return change;
}

// === СТАТИСТИКА ДЛЯ РАНГА ===
export function getRankStats(mmr: number): {
  rank: PvPRank;
  progress: number;
  nextRank: PvPRank | null;
  mmrToNext: number;
  shortName: string;
} {
  const rank = getPvPRankByMMR(mmr);
  const progress = getRankProgress(mmr);

  const currentIndex = SORTED_RANKS.findIndex(r => r.name === rank.name);
  const nextRank = currentIndex < SORTED_RANKS.length - 1 ? SORTED_RANKS[currentIndex + 1] : null;
  const mmrToNext = nextRank ? Math.max(0, nextRank.minMMR - mmr) : 0;

  return {
    rank,
    progress,
    nextRank,
    mmrToNext,
    shortName: getShortRankName(mmr)
  };
}