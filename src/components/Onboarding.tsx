import { useState } from 'react';
import { ShieldAlert, ChevronRight, Fingerprint } from 'lucide-react';

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: ShieldAlert,
      title: "ПРОТОКОЛ БЕЗОПАСНОСТИ",
      text: "Внимание. Вы находитесь в закрытой зоне 'MathLab KZ'. Ваша личность не подтверждена.",
      action: "Идентифицировать"
    },
    {
      icon: Fingerprint,
      title: "СТАТУС: ПОДОПЫТНЫЙ",
      text: "Система присвоила вам начальный уровень допуска. Чтобы получить доступ к продвинутым секторам, вы должны доказать свою компетентность.",
      action: "Принять условия"
    },
    {
      icon: ChevronRight,
      title: "ЗАДАЧА",
      text: "Решайте задачи, повышайте уровень (Clearance Level) и соревнуйтесь с другими агентами в общем рейтинге. ЕНТ — это лишь финальный босс.",
      action: "Начать работу"
    }
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  return (
    <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-cyan-500 rounded-2xl p-8 relative overflow-hidden">
        {/* Scan line effect */}
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(6,182,212,0.1)_50%)] bg-[length:100%_4px] pointer-events-none" />
        
        <div className="flex flex-col items-center text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Icon className="w-10 h-10 text-cyan-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-4 tracking-widest font-mono">
            {currentStep.title}
          </h2>
          
          <p className="text-cyan-300/80 mb-8 leading-relaxed">
            {currentStep.text}
          </p>

          <button
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else onComplete();
            }}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold py-4 rounded-lg transition-all uppercase tracking-wider"
          >
            {currentStep.action}
          </button>
        </div>
      </div>
    </div>
  );
}