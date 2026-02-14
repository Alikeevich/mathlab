import { supabase } from './supabase';

export interface CalibrationState {
  isCalibrating: boolean;
  matchesPlayed: number;
  totalMatches: number;
  provisionalMMR: number;
  results: boolean[]; // true = win, false = loss
}

const CALIBRATION_MATCHES = 5;
const BASE_MMR = 700;

// === НАЧАТЬ КАЛИБРОВКУ ===
export async function startCalibration(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({
    is_calibrating: true,
    calibration_matches_played: 0,
    calibration_results: [],
    mmr: BASE_MMR,
    has_calibrated: false
  }).eq('id', userId);

  if (error) {
    console.error('startCalibration failed', error);
    throw error;
  }
}

// === ЗАПИСАТЬ РЕЗУЛЬТАТ КАЛИБРОВОЧНОГО МАТЧА ===
export async function recordCalibrationMatch(
  userId: string,
  won: boolean,
  opponentMMR: number
): Promise<CalibrationState | null> {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('calibration_matches_played, calibration_results, mmr, has_calibrated')
    .eq('id', userId)
    .single();

  if (fetchError) {
    console.error('Failed to fetch profile', fetchError);
    throw fetchError;
  }
  if (!profile) return null;

  const matchesPlayed = (profile.calibration_matches_played || 0) + 1;
  const results = [...(profile.calibration_results || []), won];

  const provisionalMMR = calculateProvisionalMMR(results, opponentMMR);

  if (matchesPlayed >= CALIBRATION_MATCHES) {
    const finalMMR = calculateFinalMMR(results, provisionalMMR);

    const { error: updateError } = await supabase.from('profiles').update({
      is_calibrating: false,
      calibration_matches_played: matchesPlayed,
      calibration_results: results,
      mmr: finalMMR,
      has_calibrated: true
    }).eq('id', userId);

    if (updateError) {
      console.error('Failed to finalize calibration', updateError);
      throw updateError;
    }

    return {
      isCalibrating: false,
      matchesPlayed,
      totalMatches: CALIBRATION_MATCHES,
      provisionalMMR: finalMMR,
      results
    };
  } else {
    const { error: updateError } = await supabase.from('profiles').update({
      calibration_matches_played: matchesPlayed,
      calibration_results: results,
      mmr: provisionalMMR
    }).eq('id', userId);

    if (updateError) {
      console.error('Failed to update calibration progress', updateError);
      throw updateError;
    }

    return {
      isCalibrating: true,
      matchesPlayed,
      totalMatches: CALIBRATION_MATCHES,
      provisionalMMR,
      results
    };
  }
}

// === РАСЧЕТ ПРОВИЗОРНОГО MMR (ВО ВРЕМЯ КАЛИБРОВКИ) ===
function calculateProvisionalMMR(results: boolean[], lastOpponentMMR: number): number {
  const wins = results.filter(r => r).length;
  const matches = results.length;
  const winRate = matches > 0 ? wins / matches : 0;

  let mmr = BASE_MMR;
  mmr += Math.floor(winRate * 300);

  const oppDiff = lastOpponentMMR - BASE_MMR;
  mmr += Math.floor(oppDiff * 0.3);

  return Math.max(600, Math.min(1400, mmr));
}

// === ФИНАЛЬНЫЙ MMR ПОСЛЕ КАЛИБРОВКИ ===
function calculateFinalMMR(results: boolean[], provisionalMMR: number): number {
  const wins = results.filter(r => r).length;
  let bonus = 0;
  if (wins === 5) bonus = 100;
  else if (wins === 4) bonus = 50;
  else if (wins === 0) bonus = -100;

  const finalMMR = provisionalMMR + bonus;
  return Math.max(500, Math.min(2800, finalMMR));
}

// === ПОЛУЧИТЬ СТАТУС КАЛИБРОВКИ ===
export async function getCalibrationStatus(userId: string): Promise<CalibrationState | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_calibrating, calibration_matches_played, calibration_results, mmr, has_calibrated')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('getCalibrationStatus error', error);
    throw error;
  }
  if (!profile) return null;

  if (!profile.has_calibrated && !profile.is_calibrating) {
    return {
      isCalibrating: false,
      matchesPlayed: 0,
      totalMatches: CALIBRATION_MATCHES,
      provisionalMMR: BASE_MMR,
      results: []
    };
  }

  return {
    isCalibrating: profile.is_calibrating || false,
    matchesPlayed: profile.calibration_matches_played || 0,
    totalMatches: CALIBRATION_MATCHES,
    provisionalMMR: profile.mmr || BASE_MMR,
    results: profile.calibration_results || []
  };
}

// === НУЖНА ЛИ КАЛИБРОВКА? ===
export async function needsCalibration(userId: string): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('has_calibrated')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('needsCalibration error', error);
    throw error;
  }

  return !profile?.has_calibrated;
}

// === СБРОС КАЛИБРОВКИ ===
export async function resetCalibration(userId: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({
    is_calibrating: false,
    calibration_matches_played: 0,
    calibration_results: [],
    has_calibrated: false,
    mmr: BASE_MMR
  }).eq('id', userId);

  if (error) {
    console.error('resetCalibration failed', error);
    throw error;
  }
}