// src/lib/gameLogic.ts

export type Rank = {
  title: string;
  minLevel: number;
  icon: string; 
  description: string;
  color: string;
};

// 1. ОБЫЧНЫЕ РАНГИ (Я немного изменил 10 уровень, чтобы Архитектор был уникальным)
export const RANKS: Rank[] = [
  { 
    title: "Подопытный", 
    minLevel: 0, 
    icon: "dna", 
    description: "Доступ ограничен. Разрешены только базовые операции.", 
    color: "text-slate-400" 
  },
  { 
    title: "Лаборант", 
    minLevel: 1, 
    icon: "flask-conical", 
    description: "Получен доступ к реактивам класса B.", 
    color: "text-cyan-400" 
  },
  { 
    title: "Младший Н.С.", 
    minLevel: 3, 
    icon: "microscope", 
    description: "Доверенное лицо. Доступ к сложным вычислениям.", 
    color: "text-blue-400" 
  },
  { 
    title: "Ведущий Инженер", 
    minLevel: 5, 
    icon: "cpu", 
    description: "Полный контроль над системами.", 
    color: "text-purple-400" 
  },
  { 
    title: "Легенда Науки", // <--- ИЗМЕНИЛ (Архитектор теперь только админ)
    minLevel: 10, 
    icon: "star", 
    description: "Вы достигли вершины человеческого познания.", 
    color: "text-emerald-400" 
  }
];

// 2. СПЕЦ-РАНГ ДЛЯ АДМИНА
export const ADMIN_RANK: Rank = {
  title: "Архитектор",
  minLevel: 999, 
  icon: "crown", // Корона только у админа
  description: "Создатель системы. Управление реальностью.",
  color: "text-amber-400" 
};

// 3. ФУНКЦИЯ ПОЛУЧЕНИЯ РАНГА
// Теперь принимает второй аргумент: isAdmin
export function getRank(level: number, role: string = 'student'): Rank {
  if (role === 'admin') {
    return ADMIN_RANK;
  }
  return [...RANKS].reverse().find(r => level >= r.minLevel) || RANKS[0];
}

export function getLevelProgress(totalExperiments: number): number {
  return (totalExperiments % 10) * 10;
}

// 4. PVP РАНГИ (Оставляем как было)
export function getPvPRank(mmr: number): string {
  if (mmr < 1100) return "Новичок";
  if (mmr < 1300) return "Боец";
  if (mmr < 1600) return "Гладиатор";
  if (mmr < 2000) return "Мастер";
  return "Легенда";
}

export function getPvPColor(mmr: number): string {
  if (mmr < 1100) return "text-slate-400";
  if (mmr < 1300) return "text-green-400";
  if (mmr < 1600) return "text-blue-400";
  if (mmr < 2000) return "text-purple-400";
  return "text-amber-400";
}