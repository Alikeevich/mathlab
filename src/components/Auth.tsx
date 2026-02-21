import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { containsBadWord } from '../lib/profanityFilter';
import {
  LogIn, UserPlus, Loader, Mail, CheckSquare, Square, Eye, EyeOff, CheckCircle,
} from 'lucide-react';

type Props = {
  onOpenLegal: (type: 'privacy' | 'terms' | 'refund') => void;
};

// ─── Проверка силы пароля ────────────────────────────────────────────────────
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Слабый', color: 'bg-red-500' };
  if (score <= 3) return { score, label: 'Средний', color: 'bg-yellow-500' };
  return { score, label: 'Надёжный', color: 'bg-green-500' };
}

// ─── Валидация username ──────────────────────────────────────────────────────
function validateUsername(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length < 3) return 'Минимум 3 символа';
  if (trimmed.length > 20) return 'Максимум 20 символов';
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Только латиница, цифры и _';
  if (containsBadWord(trimmed)) return 'Недопустимое имя пользователя';
  return '';
}

export function Auth({ onOpenLegal }: Props) {
  const { t } = useTranslation();
  const { signIn, signUp } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [emailSent, setEmailSent] = useState(false); // экран "проверьте почту"

  const passwordStrength = getPasswordStrength(password);

  function handleUsernameChange(value: string) {
    // Запрещаем вводить больше 20 символов физически
    if (value.length > 20) return;
    setUsername(value);
    if (value.length > 0) {
      setUsernameError(validateUsername(value));
    } else {
      setUsernameError('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isLogin && !agreed) {
      setError(t('auth.error_agree'));
      return;
    }

    if (!isLogin) {
      const err = validateUsername(username);
      if (err) {
        setUsernameError(err);
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password, username);
        setEmailSent(true); // ← показываем экран подтверждения
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }

  // ─── Экран "Проверьте почту" ─────────────────────────────────────────────
  if (emailSent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-4 rounded-full shadow-lg shadow-cyan-500/30">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Проверьте почту</h2>
          <p className="text-cyan-300/70 text-sm leading-relaxed mb-2">
            Мы отправили письмо на
          </p>
          <p className="text-cyan-400 font-semibold mb-6 break-all">{email}</p>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Перейдите по ссылке в письме, чтобы активировать аккаунт. Если письмо не пришло — проверьте папку «Спам».
          </p>
          <button
            onClick={() => {
              setEmailSent(false);
              setIsLogin(true);
              setEmail('');
              setPassword('');
              setUsername('');
              setAgreed(false);
            }}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all"
          >
            Вернуться ко входу
          </button>
          <div className="mt-6">
            <a href="mailto:support@mathlabpvp.org" className="flex items-center justify-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors text-xs">
              <Mail className="w-3 h-3" />
              <span>support@mathlabpvp.org</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ─── Основная форма ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-8 shadow-2xl relative overflow-hidden">

          <div className="flex items-center justify-center mb-8">
            <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-3 rounded-xl shadow-lg shadow-cyan-500/20">
              {isLogin ? <LogIn className="w-8 h-8 text-white" /> : <UserPlus className="w-8 h-8 text-white" />}
            </div>
          </div>

          <h1 className="text-3xl font-bold text-center mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            MathLab PvP
          </h1>
          <p className="text-cyan-300/60 text-center mb-8 text-sm">
            {isLogin ? t('auth.login_title') : t('auth.register_title')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ─── Username ─────────────────────────────────────────────── */}
            {!isLogin && (
              <div>
                <label className="block text-cyan-300 text-sm font-medium mb-2">
                  {t('auth.username')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    className={`w-full px-4 py-3 bg-slate-900/50 border rounded-lg text-white placeholder-cyan-300/30 focus:outline-none transition-all pr-16
                      ${usernameError ? 'border-red-500/60 focus:border-red-400' : 'border-cyan-500/30 focus:border-cyan-400'}`}
                    placeholder="Username"
                    required={!isLogin}
                  />
                  {/* Счётчик символов */}
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums
                    ${username.length >= 20 ? 'text-red-400' : username.length >= 15 ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {username.length}/20
                  </span>
                </div>
                {usernameError && (
                  <p className="text-red-400 text-xs mt-1 pl-1">{usernameError}</p>
                )}
                {!usernameError && username.length > 0 && (
                  <p className="text-cyan-300/40 text-xs mt-1 pl-1">Латиница, цифры и _ · 3–20 символов</p>
                )}
              </div>
            )}

            {/* ─── Email ──────────────────────────────────────────────────── */}
            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2">{t('auth.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 transition-all"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* ─── Password ───────────────────────────────────────────────── */}
            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2">{t('auth.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 transition-all pr-12"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Индикатор силы пароля — только при регистрации */}
              {!isLogin && password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300
                          ${i <= passwordStrength.score ? passwordStrength.color : 'bg-slate-700'}`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs pl-1
                    ${passwordStrength.score <= 1 ? 'text-red-400' : passwordStrength.score <= 3 ? 'text-yellow-400' : 'text-green-400'}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* ─── Чекбокс соглашения ─────────────────────────────────────── */}
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
                  {t('auth.agree_text')}{' '}
                  <button type="button" onClick={() => onOpenLegal('terms')} className="text-cyan-400 hover:underline">{t('auth.terms')}</button>{' '}
                  {t('auth.and')}{' '}
                  <button type="button" onClick={() => onOpenLegal('privacy')} className="text-cyan-400 hover:underline">{t('auth.privacy')}</button>.
                </div>
              </div>
            )}

            {/* ─── Ошибка ────────────────────────────────────────────────── */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* ─── Кнопка отправки ─────────────────────────────────────── */}
            <button
              type="submit"
              disabled={loading || (!isLogin && !agreed) || (!isLogin && !!usernameError)}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {t('auth.btn_loading')}
                </>
              ) : (
                <>{isLogin ? t('auth.btn_login') : t('auth.btn_register')}</>
              )}
            </button>
          </form>

          {/* ─── Переключатель ────────────────────────────────────────────── */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setAgreed(false);
                setUsername('');
                setUsernameError('');
                setShowPassword(false);
              }}
              className="text-cyan-400 hover:text-cyan-300 text-sm transition-colors"
            >
              {isLogin ? t('auth.switch_to_reg') : t('auth.switch_to_login')}
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700/50 flex justify-center">
            <a href="mailto:support@mathlabpvp.org" className="flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors text-xs">
              <Mail className="w-3 h-3" />
              <span>support@mathlabpvp.org</span>
            </a>
          </div>
        </div>

        <div className="mt-6 text-center text-cyan-300/40 text-sm">
          <p>{t('auth.footer')}</p>
        </div>
      </div>
    </div>
  );
}