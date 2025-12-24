import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Loader, Mail, CheckSquare, Square } from 'lucide-react';

type Props = {
  onOpenLegal: (type: 'privacy' | 'terms') => void;
};

export function Auth({ onOpenLegal }: Props) {
  const { signIn, signUp } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  
  // Состояние галочки
  const [agreed, setAgreed] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isLogin && !agreed) {
      setError('Необходимо принять условия соглашения');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!username.trim()) throw new Error('Имя пользователя обязательно');
        await signUp(email, password, username);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        
        {/* Карточка входа */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center justify-center mb-8">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-3 rounded-xl shadow-lg shadow-cyan-500/20">
              {isLogin ? <LogIn className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Алгебраическая Лаборатория
          </h1>
          <p className="text-cyan-300/60 text-center mb-8 text-sm">
            {isLogin ? 'Вход в систему' : 'Регистрация нового сотрудника'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-cyan-300 text-sm font-medium mb-2">Имя пользователя</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                  placeholder="Введите имя"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

            {/* ГАЛОЧКА СОГЛАСИЯ (ТОЛЬКО ПРИ РЕГИСТРАЦИИ) */}
            {!isLogin && (
              <div className="flex items-start gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setAgreed(!agreed)}
                  className={`mt-0.5 shrink-0 transition-colors ${agreed ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-400'}`}
                >
                  {agreed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Я соглашаюсь с <button type="button" onClick={() => onOpenLegal('terms')} className="text-cyan-400 hover:underline">Правилами использования</button> и <button type="button" onClick={() => onOpenLegal('privacy')} className="text-cyan-400 hover:underline">Политикой конфиденциальности</button>.
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && !agreed)} // Блокируем кнопку
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Обработка...
                </>
              ) : (
                <>{isLogin ? 'Войти в систему' : 'Зарегистрироваться'}</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setAgreed(false); // Сбрасываем галочку при переключении
              }}
              className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center">
            <a 
              href="mailto:support@mathlabpvp.org" 
              className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors text-xs"
            >
              <Mail className="w-3 h-3" />
              <span>support@mathlabpvp.org</span>
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-cyan-300/40 text-sm">
          <p>Научный центр математических исследований</p>
        </div>
      </div>
    </div>
  );
}