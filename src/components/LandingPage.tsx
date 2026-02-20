import { useState } from 'react';
import { useTranslation } from 'react-i18next'; // Добавлен перевод
import { ArrowRight, Zap, Shield, Trophy, Mail, Check, CreditCard } from 'lucide-react';
import Squares from './Squares';

type Props = {
  onStartDemo: () => void;
  onLogin: () => void;
  onOpenLegal: (type: 'privacy' | 'terms' | 'refund') => void;
};

export function LandingPage({ onStartDemo, onLogin, onOpenLegal }: Props) {
  const { t } = useTranslation();
  const = useState(false);

  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText('support@mathlabpvp.org');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.location.href = 'mailto:support@mathlabpvp.org';
  };

  return (
    <div className="min-h-screen bg- relative overflow-hidden flex flex-col items-center justify-center text-white font-sans selection:bg-cyan-500/30">
      <div className="absolute inset-0 z-0 opacity-40">
        <Squares speed={0.3} squareSize={50} direction='diagonal' borderColor='#334155' hoverFillColor='#22d3ee' />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-900 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center w-full flex flex-col min-h-screen justify-center">
        <div className="flex-1 flex flex-col justify-center pt-20">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-900/30 border border-cyan-500/30 mb-8 animate-in fade-in slide-in-from-top-4 duration-700 backdrop-blur-md mx-auto">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-cyan-300 text-sm font-bold tracking-widest uppercase">{t('landing.badge')}</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-4 duration-1000 drop-shadow-2xl">
            {t('landing.title_1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">{t('landing.title_2')}</span>
          </h1>

          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000 delay-200">
            {t('landing.desc')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <button onClick={onStartDemo} className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 hover:bg-cyan-50 font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow- hover:scale-105">
              {t('landing.btn_demo')} <ArrowRight className="w-5 h-5" />
            </button>
            <button onClick={onLogin} className="w-full sm:w-auto px-8 py-4 bg-slate-800/80 backdrop-blur-md border border-slate-600 hover:border-cyan-500/50 text-white font-bold rounded-xl text-lg transition-all hover:bg-slate-700">
              {t('landing.btn_login')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left animate-in fade-in duration-1000 delay-500">
            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md hover:bg-slate-800/60 transition-colors">
              <Trophy className="w-8 h-8 text-amber-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">{t('landing.feat1_title')}</h3>
              <p className="text-slate-400 text-sm">{t('landing.feat1_desc')}</p>
            </div>
            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md hover:bg-slate-800/60 transition-colors">
              <Zap className="w-8 h-8 text-cyan-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">{t('landing.feat2_title')}</h3>
              <p className="text-slate-400 text-sm">{t('landing.feat2_desc')}</p>
            </div>
            <div className="p-6 bg-slate-800/40 border border-slate-700/50 rounded-2xl backdrop-blur-md hover:bg-slate-800/60 transition-colors">
              <Shield className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="font-bold text-lg mb-2">{t('landing.feat3_title')}</h3>
              <p className="text-slate-400 text-sm">{t('landing.feat3_desc')}</p>
            </div>
          </div>
        </div>

        {/* ФУТЕР */}
        <div className="mt-12 mb-6 pt-6 border-t border-slate-800/60 w-full animate-in fade-in delay-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 text-slate-500 text-sm">
              <p>© {new Date().getFullYear()} MathLab PvP.</p>
              <div className="flex flex-wrap gap-4 text-xs font-medium justify-center">
                <button onClick={() => onOpenLegal('privacy')} className="hover:text-cyan-400 transition-colors underline decoration-slate-700 underline-offset-4">Privacy Policy</button>
                <button onClick={() => onOpenLegal('refund')} className="hover:text-emerald-400 transition-colors underline decoration-slate-700 underline-offset-4">Refund Policy</button>
                <button onClick={() => onOpenLegal('terms')} className="hover:text-amber-400 transition-colors underline decoration-slate-700 underline-offset-4">Terms & Conditions</button>
                <a href="/pricing" className="hover:text-purple-400 transition-colors flex items-center gap-1 underline decoration-slate-700 underline-offset-4"><CreditCard className="w-3 h-3" /> Pricing</a>
              </div>
            </div>
            
            <button onClick={handleEmailClick} className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-slate-800 hover:text-cyan-400 transition-all text-sm text-slate-400 group">
              {copied ? (
                <><Check className="w-4 h-4 text-emerald-400" /><span className="font-mono text-emerald-400">{t('landing.copied')}</span></>
              ) : (
                <><Mail className="w-4 h-4 group-hover:scale-110 transition-transform" /><span className="font-mono">support@mathlabpvp.org</span></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}