import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LevelUpModal } from './LevelUpModal';
import { getRank, getPvPRank } from '../lib/gameLogic';

export function LevelUpManager() {
  const { profile } = useAuth();
  
  // Состояния для модалки
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{ type: 'level' | 'pvp', title: string, icon: any } | null>(null);

  // Храним предыдущие значения, чтобы сравнивать
  // Используем useRef, чтобы не вызывать ререндер при обновлении цифр
  const prevLevelRef = useRef<number | null>(null);
  const prevMMRRef = useRef<number | null>(null);

  useEffect(() => {
    if (!profile) return;

    const currentLevel = profile.clearance_level;
    const currentMMR = profile.mmr || 1000;

    // === 1. ПРОВЕРКА УРОВНЯ (РАБОТА) ===
    if (prevLevelRef.current !== null) {
      // Если уровень вырос
      if (currentLevel > prevLevelRef.current) {
        const oldRank = getRank(prevLevelRef.current, profile.is_admin);
        const newRank = getRank(currentLevel, profile.is_admin);

        // Если сменилось ЗВАНИЕ (например, Лаборант -> Инженер)
        if (oldRank.title !== newRank.title) {
          setModalData({
            type: 'level',
            title: newRank.title,
            icon: newRank.icon // Иконка из gameLogic
          });
          setShowModal(true);
        }
      }
    }

    // === 2. ПРОВЕРКА РЕЙТИНГА (PVP) ===
    if (prevMMRRef.current !== null) {
      // Если рейтинг вырос
      if (currentMMR > prevMMRRef.current) {
        const oldPvPRank = getPvPRank(prevMMRRef.current);
        const newPvPRank = getPvPRank(currentMMR);

        // Если сменилась ЛИГА (например, Новичок -> Боец)
        if (oldPvPRank !== newPvPRank) {
           // Тут иконку можно подобрать или использовать кубок
           setModalData({
             type: 'pvp',
             title: newPvPRank,
             icon: null // В модалке будет дефолтная корона
           });
           setShowModal(true);
        }
      }
    }

    // Обновляем рефы
    prevLevelRef.current = currentLevel;
    prevMMRRef.current = currentMMR;

  }, [profile]); // Следим за изменением профиля (которое прилетает по Realtime или refreshProfile)

  if (!showModal || !modalData) return null;

  return (
    <LevelUpModal 
      type={modalData.type} 
      newTitle={modalData.title} 
      icon={modalData.icon}
      onClose={() => setShowModal(false)} 
    />
  );
}