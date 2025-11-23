/*
  # Math Lab Database Schema

  ## Overview
  Creates the complete database structure for the Math Lab application including:
  - User profiles with clearance levels
  - Sector and module organization
  - Progress tracking system
  - Achievement system
  - Problem-solving history

  ## New Tables

  1. **profiles**
     - `id` (uuid, primary key) - Links to auth.users
     - `username` (text) - Display name
     - `clearance_level` (integer) - Current access level (0-6)
     - `total_experiments` (integer) - Total problems solved
     - `success_rate` (numeric) - Overall success percentage
     - `created_at` (timestamptz) - Registration timestamp
     - `updated_at` (timestamptz) - Last activity

  2. **sectors**
     - `id` (integer, primary key) - Sector identifier (0-6)
     - `name` (text) - Sector name
     - `description` (text) - Sector description
     - `color` (text) - Theme color
     - `required_clearance` (integer) - Minimum level to access
     - `icon` (text) - Icon identifier

  3. **modules**
     - `id` (uuid, primary key)
     - `sector_id` (integer) - Parent sector
     - `name` (text) - Module name
     - `theory_content` (text) - Learning content
     - `order_index` (integer) - Display order
     - `required_modules` (uuid[]) - Prerequisites

  4. **user_progress**
     - `id` (uuid, primary key)
     - `user_id` (uuid) - References profiles
     - `module_id` (uuid) - References modules
     - `completion_percentage` (integer) - 0-100
     - `last_accessed` (timestamptz)
     - `experiments_completed` (integer) - Problems solved in this module

  5. **achievements**
     - `id` (uuid, primary key)
     - `name` (text) - Achievement name
     - `description` (text) - How to earn it
     - `icon` (text) - Icon identifier
     - `rarity` (text) - common, rare, legendary

  6. **user_achievements**
     - `id` (uuid, primary key)
     - `user_id` (uuid) - References profiles
     - `achievement_id` (uuid) - References achievements
     - `earned_at` (timestamptz)

  7. **experiments**
     - `id` (uuid, primary key)
     - `user_id` (uuid) - References profiles
     - `module_id` (uuid) - References modules
     - `problem_type` (text) - Category of problem
     - `correct` (boolean) - Success/failure
     - `time_spent` (integer) - Seconds to solve
     - `attempted_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Public read access to sectors, modules, and achievements
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  clearance_level integer DEFAULT 0 NOT NULL,
  total_experiments integer DEFAULT 0 NOT NULL,
  success_rate numeric(5,2) DEFAULT 0.00 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Sectors table
CREATE TABLE IF NOT EXISTS sectors (
  id integer PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  color text NOT NULL,
  required_clearance integer NOT NULL,
  icon text NOT NULL
);

ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view sectors"
  ON sectors FOR SELECT
  TO authenticated
  USING (true);

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sector_id integer NOT NULL REFERENCES sectors(id),
  name text NOT NULL,
  theory_content text NOT NULL,
  order_index integer NOT NULL,
  required_modules uuid[] DEFAULT '{}'
);

ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view modules"
  ON modules FOR SELECT
  TO authenticated
  USING (true);

-- User progress table
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  completion_percentage integer DEFAULT 0 NOT NULL CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  last_accessed timestamptz DEFAULT now() NOT NULL,
  experiments_completed integer DEFAULT 0 NOT NULL,
  UNIQUE(user_id, module_id)
);

ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON user_progress FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON user_progress FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON user_progress FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  rarity text NOT NULL CHECK (rarity IN ('common', 'rare', 'legendary'))
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements"
  ON user_achievements FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Experiments (problem solving history) table
CREATE TABLE IF NOT EXISTS experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  problem_type text NOT NULL,
  correct boolean NOT NULL,
  time_spent integer NOT NULL,
  attempted_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own experiments"
  ON experiments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own experiments"
  ON experiments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert initial sectors data
INSERT INTO sectors (id, name, description, color, required_clearance, icon) VALUES
  (0, 'Центр Логики', 'Математическая грамотность - база для всех', 'emerald', 0, 'brain'),
  (1, 'Алгебраические Структуры', 'Базовая алгебра и уравнения', 'blue', 1, 'git-branch'),
  (2, 'Лаборатория Функций', 'Анализ зависимостей и графиков', 'purple', 2, 'activity'),
  (3, 'Трансцендентный Анализ', 'Логарифмы и показательные функции', 'orange', 3, 'zap'),
  (4, 'Циклические Процессы', 'Тригонометрия и волновые процессы', 'red', 4, 'radio'),
  (5, 'Высшие Вычисления', 'Математический анализ', 'cyan', 5, 'cpu'),
  (6, 'Геометрическое Моделирование', 'Планиметрия и стереометрия', 'pink', 5, 'box')
ON CONFLICT (id) DO NOTHING;

-- Insert some initial modules for Sector 0
INSERT INTO modules (sector_id, name, theory_content, order_index) VALUES
  (0, 'Числовые закономерности', 'Арифметические действия, признаки делимости, НОД/НОК', 1),
  (0, 'Текстовые задачи', 'Задачи на движение, работу, смеси и сплавы', 2),
  (0, 'Теория вероятностей', 'Комбинаторика, медиана, размах ряда', 3)
ON CONFLICT DO NOTHING;

-- Insert some initial achievements
INSERT INTO achievements (name, description, icon, rarity) VALUES
  ('Первый шаг', 'Решите первую задачу', 'star', 'common'),
  ('Повелитель логарифмов', 'Решите 50 задач с логарифмами', 'crown', 'rare'),
  ('Укротитель функций', 'Пройдите все модули сектора функций', 'trophy', 'rare'),
  ('Безошибочный эксперимент', 'Решите 10 задач подряд без ошибок', 'target', 'legendary'),
  ('Стахановец', 'Решите 100 задач за день', 'flame', 'legendary')
ON CONFLICT DO NOTHING;