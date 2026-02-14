import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, Zap, GraduationCap, X, Lock, Loader, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { BecomeTeacherModal } from './BecomeTeacherModal';

export function PricingPage() {
  const { user, profile, refreshProfile } = useAuth();
  
  // Состояния для тарифа Teacher
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

  // Симуляция оплаты и выдача роли
  const handleTeacherPurchase = async () => {
    if (!user) return;
    setProcessingPayment(true);

    try {
      // Здесь была бы интеграция с Paddle/Stripe
      await new Promise(r => setTimeout(r, 1500)); // Имитация задержки

      // Обновляем роль
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'teacher' })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      alert("Оплата прошла успешно! Вам присвоен статус Учителя.");
      window.location.href = "/"; // Редирект в дэшборд

    } catch (e) {
      console.error(e);
      alert("Ошибка при обработке платежа.");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePremiumPurchase = async () => {
    alert("Скоро подключим платежку для Premium!");
  };

  const plans = [
    {
      name: 'Cadet',
      price: '$0',
      period: '/ навсегда',
      description: 'Идеально для старта и знакомства с платформой.',
      features: [
        'Доступ к PvP арене',
        'Базовые модули Реактора',
        'Персональный Сурикат',
        'Участие в открытых турнирах'
      ],
      notIncluded: [
        'Журнал ошибок',
        'Ускоренная прокачка (XP)',
        'Создание турниров'
      ],
      color: 'slate',
      icon: <Zap className="w-4 h-4" />,
      action: <button className="w-full py-4 rounded-xl font-bold bg-slate-700 text-slate-400 cursor-default">Текущий план</button>,
      highlight: false
    },
    {
      name: 'Premium',
      price: '$7',
      period: '/ месяц',
      description: 'Для тех, кто хочет учиться эффективно и быстро.',
      features: [
        'Всё, что в Free',
        'Доступ к Журналу Ошибок (48ч история)',
        'x2 опыт (XP) для Суриката',
        'Уникальный значок профиля',
        'Приоритет в поиске соперников'
      ],
      notIncluded: [
        'Создание турниров',
        'Добавление своих задач'
      ],
      color: 'amber',
      icon: <Zap className="w-4 h-4" />,
      action: (
        <button 
          onClick={handlePremiumPurchase}
          className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:brightness-110 shadow-lg shadow-orange-900/30 transition-all active:scale-95"
        >
          Купить Premium
        </button>
      ),
      highlight: true
    },
    {
      name: 'Teacher',
      price: '$9',
      period: '/ месяц',
      description: 'Инструменты для учителей и организаторов.',
      features: [
        'Всё, что в Premium',
        'Создание закрытых турниров',
        'Добавление своих задач на сайт',
        'Панель аналитики учеников',
        'Специальный статус "Teacher"'
      ],
      notIncluded: [],
      color: 'cyan',
      icon: <GraduationCap className="w-4 h-4" />,
      highlight: false,
      // Особая логика кнопки для учителя
      action: (() => {
        if (profile?.role === 'teacher' || profile?.role === 'admin') {
          return <button className="w-full py-4 rounded-xl font-bold bg-cyan-900/20 text-cyan-400 border border-cyan-500/30 cursor-default flex items-center justify-center gap-2"><Check className="w-4 h-4"/> Активен</button>;
        }
        
        if (loading) return <div className="py-4 text-center"><Loader className="w-5 h-5 animate-spin mx-auto text-slate-500"/></div>;

        if (requestStatus === 'approved') {
          return (
            <button 
              onClick={handleTeacherPurchase}
              disabled={processingPayment}
              className="w-full py-4 rounded-xl font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              {processingPayment ? <Loader className="w-4 h-4 animate-spin"/> : <ShieldCheck className="w-4 h-4"/>}
              {processingPayment ? 'Обработка...' : 'Купить доступ'}
            </button>
          );
        }

        return (
          <button 
            onClick={() => setShowVerificationModal(true)}
            className="w-full py-4 rounded-xl font-bold text-slate-300 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-all flex items-center justify-center gap-2 group"
          >
            <Lock className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
            {requestStatus === 'pending' ? 'Заявка на проверке' : 'Пройти верификацию'}
          </button>
        );
      })()
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300 font-sans selection:bg-cyan-500/30 overflow-y-auto">
      
      {/* Background FX */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 md:py-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-12 gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">Тарифы</h1>
              <p className="text-slate-400 text-sm">Инвестируй в свои знания</p>
            </div>
          </div>
          
          <a href="/" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 border border-slate-700">
            <ArrowLeft className="w-4 h-4" />
            Вернуться в игру
          </a>
        </div>

        {/* Grid */}
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
                  Хит продаж
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
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className={`p-1 rounded-full bg-${plan.color}-500/10 shrink-0 mt-0.5`}>
                      <Check className={`w-3 h-3 text-${plan.color}-400`} />
                    </div>
                    <span className="text-slate-200 text-sm">{feature}</span>
                  </div>
                ))}
                {plan.notIncluded.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-50">
                    <div className="p-1 rounded-full bg-slate-700 shrink-0 mt-0.5">
                      <X className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-slate-500 text-sm line-through">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Кнопка действия */}
              {plan.action}
              
              {/* Подсказка для учителя */}
              {plan.name === 'Teacher' && requestStatus === 'none' && (
                <p className="text-[10px] text-center mt-3 text-slate-500">Требуется подтверждение документов</p>
              )}
              {plan.name === 'Teacher' && requestStatus === 'approved' && profile?.role !== 'teacher' && (
                <p className="text-[10px] text-center mt-3 text-emerald-400 font-bold">Верификация пройдена! Оплатите для доступа.</p>
              )}
            </div>
          ))}
        </div>

        {/* Footer for Compliance */}
        <div className="border-t border-slate-800 pt-8 text-center text-xs text-slate-600">
          <div className="flex flex-wrap justify-center gap-6 mb-4 font-medium text-slate-500">
            <a href="/terms-and-conditions" className="hover:text-cyan-400 transition-colors">Условия использования</a>
            <a href="/terms-and-conditions" className="hover:text-cyan-400 transition-colors">Политика конфиденциальности</a>
            <a href="/terms-and-conditions" className="hover:text-cyan-400 transition-colors">Возврат средств</a>
          </div>
          <p className="mb-2">MathLab PvP © {new Date().getFullYear()}. Все права защищены.</p>
          <p>Secure payments powered by <strong>Paddle</strong>.</p>
        </div>

      </div>

      {showVerificationModal && (
        <BecomeTeacherModal onClose={() => {
          setShowVerificationModal(false);
          // Перезагрузим статус
          supabase.from('teacher_requests').select('status').eq('user_id', user!.id).maybeSingle().then(({data}) => {
             if(data) setRequestStatus(data.status as any);
             else setRequestStatus('pending'); // Оптимистично
          });
        }} />
      )}
    </div>
  );
}