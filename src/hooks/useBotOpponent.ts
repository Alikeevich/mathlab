import { useState, useEffect, useRef } from 'react';

const BOT_NAMES = [
  'Aizere_2008', 'Санжик', 'КиборгУбийца', 'Alikhan07', 
  'Шапи', 'Ералы', 'Aleke', 'Райан-Гослинг', 'Мерей'
];

type BotConfig = {
  isEnabled: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  maxQuestions: number;
  onProgressUpdate: (score: number, progress: number) => void;
};

export function useBotOpponent({ isEnabled, difficulty = 'medium', maxQuestions, onProgressUpdate }: BotConfig) {
  const [botName, setBotName] = useState('???');
  const [botScore, setBotScore] = useState(0);
  const [botProgress, setBotProgress] = useState(0);
  
  // Храним таймеры
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  // 1. При старте выбираем случайное имя
  useEffect(() => {
    if (isEnabled && botName === '???') {
      setBotName(BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]);
    }
  }, [isEnabled]);

  // 2. Логика решения задач
  useEffect(() => {
    if (!isEnabled || botProgress >= maxQuestions) return;

    // Настройки скорости (в миллисекундах)
    // medium: от 4 до 9 секунд на задачу
    let minTime = 4000;
    let maxTime = 9000;
    let accuracy = 0.8; // 80% правильных ответов

    if (difficulty === 'hard') { minTime = 3000; maxTime = 6000; accuracy = 0.95; }
    if (difficulty === 'easy') { minTime = 7000; maxTime = 12000; accuracy = 0.6; }

    const nextThinkingTime = Math.floor(Math.random() * (maxTime - minTime + 1) + minTime);

    const timer = setTimeout(() => {
      // Бот "решил" задачу
      const isCorrect = Math.random() < accuracy;
      
      const newScore = isCorrect ? botScore + 1 : botScore;
      const newProgress = botProgress + 1;

      setBotScore(newScore);
      setBotProgress(newProgress);
      
      // Сообщаем родителю
      onProgressUpdate(newScore, newProgress);

    }, nextThinkingTime);

    timeouts.current.push(timer);

    return () => {
      timeouts.current.forEach(clearTimeout);
      timeouts.current = [];
    };
  }, [isEnabled, botProgress, difficulty, maxQuestions]);

  return { botName, botScore, botProgress };
}
