import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next'; // Перевод
import { ArrowLeft, Check, Zap, GraduationCap, X, Lock, Loader, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BecomeTeacherModal } from './BecomeTeacherModal';
import { getPaddleInstance } from '../lib/paddle';

const PADDLE_PRICE_IDS = {
  PREMIUM: 'pro_01khs2jy2vbmjj09q91p38nkbf', 
  TEACHER: 'pro_01khs2jq904f4sxeggrd55ynr3' 
};

export function PricingPage() {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  useEffect(() => {
    async function checkStatus() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      const { data } = await supabase
        .from('teacher_requests')
        .select('status')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
        
      if (data) setRequestStatus(data.status as any);
      setLoading(false);
    }
    checkStatus();
  }, [user]);

  const openCheckout = async (priceId: string) => {
    if (!user) return alert("Пожалуйста, войдите в аккаунт.");
    
    setProcessingPayment(true);
    
    try {
      const paddle = await getPaddleInstance();
      if (!paddle) {
        alert("Ошибка инициализации платежной системы");
        return;
      }

      paddle.Checkout.open({
        items: [{ priceId: priceId, quantity: 1 }],
        customData: {
          userId: user.id,
          tier: priceId === PADDLE_PRICE_IDS.TEACHER ? 'teacher' : 'premium'
        },
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'ru'
        }
      });
    } catch (error) {
      console.error("Paddle Error:", error);
      alert("Не удалось открыть окно оплаты.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const plans = [
    {
      name: 'Cadet',
      price: '$0',
      period: t('pricing.per_forever'), // / навсегда
      description: t('pricing.plan_cadet_desc'),
      features: [
        t('pricing.feat_pvp'),
        t('pricing.feat_suricat'),
        t('pricing.feat_modules')
      ],
      notIncluded: [
        t('pricing.feat_errors'),
        t('pricing.feat_xp'),
        t('pricing.feat_tournaments')
      ],
      color: 'slate',
      icon: <Zap className="w-4 h-4" />,
      action: <button className="w-full py-4 rounded-xl font-bold bg-slate-700 text-slate-400 cursor-default">{t('pricing.current_plan')}</button>,
      highlight: false
    },
    {
      name: 'Premium',
      price: '$7',
      period: t('pricing.per_month'), // / месяц
      description: t('pricing.plan_premium_desc'),
      features: [
        t('pricing.feat_all_free'),
        t('pricing.feat_errors'),
        t('pricing.feat_x2_xp'),
        t('pricing.feat_badge'),
        t('pricing.feat_priority')
      ],
      notIncluded: [
        t('pricing.feat_tournaments'),
        t('pricing.feat_custom_tasks')
      ],
      color: 'amber',
      icon: <Zap className="w-4 h-4" />,
      action: (
        profile?.is_premium ? (
          <button className="w-full py-4 rounded-xl font-bold bg-amber-900/20 text-amber-400 border border-amber-500/30 cursor-default flex items-center justify-center gap-2">
            <Check className="w-4 h-4"/> {t('pricing.already_bought')}
          </button>
        ) : (
          <button 
            onClick={() => openCheckout(PADDLE_PRICE_IDS.PREMIUM)}
            disabled={processingPayment}
            className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 shadow-lg shadow-orange-900/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-wait"
          >
            {processingPayment ? t('pricing.loading') : t('pricing.buy_premium')}
          </button>
        )
      ),
      highlight: true
    },
    {
      name: 'Teacher',
      price: '$9',
      period: t('pricing.per_month'), // / месяц
      description: t('pricing.plan_teacher_desc'),
      features: [
        t('pricing.feat_all_premium'),
        t('pricing.feat_closed_tour'),
        t('pricing.feat_site_tasks'),
        t('pricing.feat_analytics'),
        t('pricing.feat_teacher_status')
      ],
      notIncluded: [],
      color: 'cyan',
      icon: <GraduationCap className="w-4 h-4" />,
      highlight: false,
      action: (() => {
        if (profile?.role === 'teacher' || profile?.role === 'admin') {
          return <button className="w-full py-4 rounded-xl font-bold bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 cursor-default flex items-center justify-center gap-2"><Check className="w-4 h-4"/> {t('pricing.active')}</button>;
        }
        
        if (loading) return <div className="py-4 text-center"><Loader className="w-5 h-5 animate-spin mx-auto text-slate-500"/></div>;

        if (requestStatus === 'approved') {
          return (
            <button 
              onClick={() => openCheckout(PADDLE_PRICE_IDS.TEACHER)}
              disabled={processingPayment}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
            >
              {processingPayment ? <Loader className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4"/>}
              {processingPayment ? t('pricing.opening') : t('pricing.pay_access')}
            </button>
          );
        }

        return (
          <button 
            onClick={() => setShowVerificationModal(true)}
            className="w-full py-4 rounded-xl font-bold text-slate-300 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 group"
          >
            <Lock className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            {requestStatus === 'pending' ? t('pricing.verify_pending') : t('pricing.verify')}
          </button>
        );
      })()
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans selection:bg-cyan-500/30 overflow-y-auto">
      
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">{t('pricing.title')}</h1>
              <p className="text-slate-400 text-sm">{t('pricing.subtitle')}</p>
            </div>
          </div>
          
          <a href="/" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700">
            <ArrowLeft className="w-4 h-4" />
            {t('pricing.back')}
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan) => (
            <div 
              key={plan.name}
              className={`relative flex flex-col p-8 rounded-3xl border transition-all duration-300 ${
                plan.highlight 
                  ? `bg-slate-800/80 border-${plan.color}-500 shadow-2xl shadow-${plan.color}-900/20 scale-100 md:scale-105 z-10` 
                  : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
              }`}
            >
              {plan.highlight && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-${plan.color}-500 text-black font-bold text-xs uppercase tracking-widest rounded-full shadow-lg`}>
                  {t('pricing.hit')}
                </div>
              )}

              <div className="mb-6">
                <div className={`flex items-center gap-2 text-${plan.color}-400 font-bold mb-2 uppercase tracking-wider text-sm`}>
                  {plan.icon} {plan.name}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-black text-white">{plan.price}</span>
                  <span className="text-slate-500 font-medium">{plan.period}</span>
                </div>
                <p className="text-slate-400 text-sm mt-3 leading-relaxed">
                  {plan.description}
                </p>
              </div>

              <div className="flex-1 space-y-4 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`p-1 rounded-full bg-${plan.color}-500/10 shrink-0 mt-0.5`}>
                      <Check className={`w-3 h-3 text-${plan.color}-400`} />
                    </div>
                    <span className="text-slate-200 text-sm">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3 opacity-50">
                    <div className="p-1 rounded-full bg-slate-700 shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-slate-500 text-sm line-through">{feature}</span>
                  </div>
                ))}
              </div>

              {plan.action}
              
              {plan.name === 'Teacher' && requestStatus === 'none' && (
                <p className="text-[10px] text-center mt-3 text-slate-500">Требуется подтверждение документов</p>
              )}
              {plan.name === 'Teacher' && requestStatus === 'approved' && profile?.role !== 'teacher' && (
                <p className="text-[10px] text-center mt-3 text-emerald-400 font-bold">Верификация пройдена! Оплатите для доступа.</p>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-slate-800 pt-8 text-center text-xs text-slate-600">
          <div className="flex flex-wrap justify-center gap-6 mb-4 font-medium text-slate-500">
            <a href="/terms-and-conditions" className="hover:text-cyan-400 transition-colors">{t('auth.terms')}</a>
            <a href="/terms-and-conditions" className="hover:text-cyan-400 transition-colors">{t('auth.privacy')}</a>
            <a href="/terms-and-conditions" className="hover:text-cyan-400 transition-colors">{t('auth.refund')}</a>
          </div>
          <p className="mb-2">MathLab PvP © {new Date().getFullYear()}. {t('pricing.footer_rights')}</p>
          <p>Secure payments powered by <strong>Paddle</strong>.</p>
        </div>

      </div>

      {showVerificationModal && (
        <BecomeTeacherModal onClose={() => {
          setShowVerificationModal(false);
          if (user) {
            supabase.from('teacher_requests').select('status').eq('user_id', user.id).maybeSingle().then(({data}) => {
               if(data) setRequestStatus(data.status as any);
               else setRequestStatus('pending'); 
            });
          }
        }} />
      )}
    </div>
  );
}