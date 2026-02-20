import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, Loader, Mail, CheckSquare, Square } from 'lucide-react';

type Props = {
  onOpenLegal: (type: 'privacy' | 'terms' | 'refund') => void;
};

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!isLogin && !agreed) {
      setError(t('auth.error_agree'));
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!username.trim()) throw new Error(t('auth.error_name'));
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
            {!isLogin && (
              <div>
                <label className="block text-cyan-300 text-sm font-medium mb-2">{t('auth.username')}</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 transition-all"
                  placeholder="Username"
                  required={!isLogin}
                />
              </div>
            )}

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

            <div>
              <label className="block text-cyan-300 text-sm font-medium mb-2">{t('auth.password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-cyan-300/30 focus:outline-none focus:border-cyan-400 transition-all"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>

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
                  {t('auth.agree_text')} <button type="button" onClick={() => onOpenLegal('terms')} className="text-cyan-400 hover:underline">{t('auth.terms')}</button> {t('auth.and')} <button type="button" onClick={() => onOpenLegal('privacy')} className="text-cyan-400 hover:underline">{t('auth.privacy')}</button>.
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
              disabled={loading || (!isLogin && !agreed)}
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

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setAgreed(false);
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