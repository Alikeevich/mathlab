import { useState, useEffect, useRef } from 'react';

// Экспортируем массив и функцию, чтобы использовать их в PvPMode при реконнекте
export const BOT_NAMES = [
  'Aizere_2008', 'Санжик', 'КиборгУбийца', 'Alikhan07', 
  'Шапи', 'Ералы', 'Aleke', 'Райан-Гослинг', 'Мерей',
  'Math_Terminator', 'X_Ae_A-12', 'Сын Маминой Подруги'
];

// Функция для получения имени бота по ID дуэли (всегда одинаковое для одной дуэли)
export function getDeterministicBotName(duelId: string | null): string {
  if (!duelId) return '???';
  let hash = 0;
  for (let i = 0; i < duelId.length; i++) {
    hash = duelId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % BOT_NAMES.length;
  return BOT_NAMES[index];
}

type BotConfig = {
  isEnabled: boolean;
  duelId: string | null;    // <--- НОВОЕ: ID дуэли для генерации имени
  difficulty?: 'easy' | 'medium' | 'hard';
  maxQuestions: number;
  initialScore?: number;
  initialProgress?: number;
  onProgressUpdate: (score: number, progress: number) => void;
};

export function useBotOpponent({ 
  isEnabled, 
  duelId,               // <--- Принимаем ID
  difficulty = 'medium', 
  maxQuestions, 
  initialScore = 0,
  initialProgress = 0,
  onProgressUpdate 
}: BotConfig) {
  
  // Инициализируем имя сразу на основе ID, чтобы не было "скачков"
  const [botName, setBotName] = useState(() => getDeterministicBotName(duelId));
  const [botScore, setBotScore] = useState(initialScore);
  const [botProgress, setBotProgress] = useState(initialProgress);
  
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  // 1. Синхронизация счета
  useEffect(() => {
    if (initialScore > 0 || initialProgress > 0) {
      setBotScore(initialScore);
      setBotProgress(initialProgress);
    }
  }, [initialScore, initialProgress]);

  // 2. Обновление имени, если duelId изменился (например, началась новая игра)
  useEffect(() => {
    setBotName(getDeterministicBotName(duelId));
  }, [duelId]);

  // 3. Логика решения задач
  useEffect(() => {
    if (!isEnabled || botProgress >= maxQuestions) return;

    let minTime = 4000;
    let maxTime = 9000;
    let accuracy = 0.8; 

    if (difficulty === 'hard') { minTime = 3000; maxTime = 6000; accuracy = 0.95; }
    if (difficulty === 'easy') { minTime = 7000; maxTime = 12000; accuracy = 0.6; }

    const nextThinkingTime = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime);

    const timer = setTimeout(() => {
      const isCorrect = Math.random() < accuracy;
      
      const newScore = isCorrect ? botScore + 1 : botScore;
      const newProgress = botProgress + 1;

      setBotScore(newScore);
      setBotProgress(newProgress);
      
      onProgressUpdate(newScore, newProgress);

    }, nextThinkingTime);

    timeouts.current.push(timer);

    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, [isEnabled, botProgress, difficulty, maxQuestions, botScore]);

  return { botName, botScore, botProgress };
}