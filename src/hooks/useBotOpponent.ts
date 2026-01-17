import { useState, useEffect, useRef } from 'react';

// Имена ботов (чтобы казалось, что это люди)
const BOT_NAMES = [
  'Aizere_2008', 'Naruto_ENT', 'MathKiller', 'Alikhan_07', 
  'SuperBrain', 'Nurik_99', 'Zhanelya_X', 'IronLogic'
];

type BotConfig = {
  isEnabled: boolean;
  difficulty: 'easy' | 'medium' | 'hard'; // Можно привязать к рейтингу игрока
  onProgressUpdate: (score: number, progress: number) => void;
  maxQuestions: number;
};

export function useBotOpponent({ isEnabled, difficulty, onProgressUpdate, maxQuestions }: BotConfig) {
  const [botName, setBotName] = useState('???');
  const [botScore, setBotScore] = useState(0);
  const [botProgress, setBotProgress] = useState(0);
  
  // Храним таймеры чтобы чистить их при выходе
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  // 1. При старте выбираем имя бота
  useEffect(() => {
    if (isEnabled) {
      setBotName(BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]);
    }
  }, [isEnabled]);

  // 2. Логика решения задач ботом
  useEffect(() => {
    if (!isEnabled || botProgress >= maxQuestions) return;

    // Рассчитываем скорость бота
    // easy: 8-15 сек на задачу, 70% шанс успеха
    // medium: 5-10 сек на задачу, 85% шанс успеха
    // hard: 3-6 сек на задачу, 95% шанс успеха
    
    let minTime = 8000;
    let maxTime = 15000;
    let accuracy = 0.7;

    if (difficulty === 'medium') { minTime = 5000; maxTime = 10000; accuracy = 0.85; }
    if (difficulty === 'hard') { minTime = 3000; maxTime = 6000; accuracy = 0.95; }

    const nextThinkingTime = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime);

    const timer = setTimeout(() => {
      // Бот "решил" задачу
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
  }, [isEnabled, botProgress, difficulty, maxQuestions]); // Зависимость от botProgress запускает цикл

  return { botName, botScore, botProgress };
}