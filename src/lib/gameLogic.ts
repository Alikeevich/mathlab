import {
  getPvPRankByMMR,
  getRankProgress,
  checkRankUp,
  getShortRankName,
  getRankStats,
  PvPRank
} from './PvPRankSystem';

export type Rank = {
  title: string;
  minLevel: number;
  icon: string;
  description: string;
  color: string;
};

export const RANKS: Rank[] = [
  { title: "Подопытный", minLevel: 0, icon: "dna", description: "Доступ ограничен. Разрешены только базовые операции.", color: "text-slate-400" },
  { title: "Лаборант", minLevel: 1, icon: "flask-conical", description: "Получен доступ к реактивам класса B.", color: "text-cyan-400" },
  { title: "Младший Н.С.", minLevel: 3, icon: "microscope", description: "Доверенное лицо. Доступ к сложным вычислениям.", color: "text-blue-400" },
  { title: "Ведущий Инженер", minLevel: 5, icon: "cpu", description: "Полный контроль над системами.", color: "text-purple-400" },
  { title: "Легенда Науки", minLevel: 10, icon: "star", description: "Вы достигли вершины человеческого познания.", color: "text-emerald-400" }
];

export const ADMIN_RANK: Rank = { title: "Архитектор", minLevel: 999, icon: "crown", description: "Создатель системы. Управление реальностью.", color: "text-amber-400" };

export function getRank(level: number, role: string = 'student'): Rank {
  if (role === 'admin') return ADMIN_RANK;
  return [...RANKS].reverse().find(r => level >= r.minLevel) || RANKS[0];
}

export function getLevelProgress(totalExperiments: number): number {
  return (totalExperiments % 10) * 10;
}

// PvP helpers
export function getPvPRank(mmr: number): PvPRank { return getPvPRankByMMR(mmr); }
export function getPvPShortRank(mmr: number): string { return getShortRankName(mmr); }
export function getPvPColor(mmr: number): string { return getPvPRankByMMR(mmr).color; }
export function getPvPProgress(mmr: number): number { return getRankProgress(mmr); }
export function checkPvPRankUp(oldMMR: number, newMMR: number): PvPRank | null { return checkRankUp(oldMMR, newMMR); }
export function getPvPRankStats(mmr: number) { return getRankStats(mmr); }

export function getOldPvPRank(mmr: number): string {
  if (mmr < 700) return "Бронза";
  if (mmr < 900) return "Серебро";
  if (mmr < 1100) return "Золото";
  if (mmr < 1300) return "Платина";
  if (mmr < 1500) return "Алмаз";
  if (mmr < 1700) return "Мастер";
  return "Грандмастер";
}