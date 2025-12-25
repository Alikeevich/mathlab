import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  username: string;
  role: 'student' | 'teacher' | 'admin'; // Главное поле теперь это
  
  // Игровые данные
  clearance_level: number;
  total_experiments: number;
  success_rate: number;
  mmr: number;
  
  // Экономика
  coins: number;
  is_premium: boolean;
  
  // Компаньон (Сурикат)
  companion_name: string | null;
  companion_mood: number;
  companion_level: number;
  companion_xp: number;
  companion_hunger: number;
  last_fed_at: string | null;
  
  // Гардероб
  equipped_hat: string | null;
  equipped_body: string | null;
  
  created_at: string;
  updated_at: string;
};

export type Sector = {
  id: number;
  name: string;
  description: string;
  color: string;
  required_clearance: number;
  icon: string;
};

export type Module = {
  id: string;
  sector_id: number;
  name: string;
  theory_content: string;
  order_index: number;
  required_modules: string[];
};

export type UserProgress = {
  id: string;
  user_id: string;
  module_id: string;
  completion_percentage: number;
  last_accessed: string;
  experiments_completed: number;
};

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'legendary';
};

export type Experiment = {
  id: string;
  user_id: string;
  module_id: string;
  problem_id: string; // Добавили связь с задачей
  problem_type: string;
  correct: boolean;
  time_spent: number;
  attempted_at: string;
};