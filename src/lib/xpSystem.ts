import { supabase } from './supabase';

/**
 * Начисляет опыт компаньону.
 * Учитывает Premium статус пользователя (x2 опыт).
 * 
 * @param userId - ID пользователя
 * @param isPremium - Если true, опыт удваивается
 * @param amount - Базовое количество опыта (по умолчанию 10)
 */
export async function grantXp(userId: string, isPremium: boolean, amount: number = 10) {
  // === ЛОГИКА PREMIUM: Удваиваем опыт ===
  const finalXp = isPremium ? amount * 2 : amount;
  
  // 1. Получаем текущие данные компаньона
  const { data: profile } = await supabase
    .from('profiles')
    .select('companion_xp, companion_level')
    .eq('id', userId)
    .single();

  if (!profile) return;

  let newXp = (profile.companion_xp || 0) + finalXp;
  let newLevel = profile.companion_level || 1;
  
  // Логика повышения уровня: порог = newLevel * 100
  // Например: 1 ур -> 100 xp, 2 ур -> 200 xp
  let xpNeeded = newLevel * 100;

  // Если накопили достаточно для левелапа
  let leveledUp = false;
  while (newXp >= xpNeeded) {
    newXp -= xpNeeded;
    newLevel++;
    xpNeeded = newLevel * 100;
    leveledUp = true;
  }

  // 2. Обновляем базу
  await supabase
    .from('profiles')
    .update({ 
      companion_xp: newXp, 
      companion_level: newLevel,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  return { gained: finalXp, levelUp: leveledUp };
}