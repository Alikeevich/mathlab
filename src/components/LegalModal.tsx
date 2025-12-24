import { X, Shield, FileText } from 'lucide-react';

type LegalType = 'privacy' | 'terms';

type Props = {
  type: LegalType;
  onClose: () => void;
};

export function LegalModal({ type, onClose }: Props) {
  const isPrivacy = type === 'privacy';

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl h-[90vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Шапка */}
        <div className="p-6 border-b border-slate-700 bg-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              {isPrivacy ? <Shield className="w-6 h-6 text-cyan-400" /> : <FileText className="w-6 h-6 text-amber-400" />}
            </div>
            <h2 className="text-2xl font-bold text-white">
              {isPrivacy ? 'Политика конфиденциальности' : 'Пользовательское соглашение'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Контент (Скролл) */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-300 space-y-6 custom-scrollbar leading-relaxed text-sm md:text-base">
          
          {isPrivacy ? (
            <>
              <p className="opacity-70 text-xs">Последнее обновление: {new Date().toLocaleDateString()}</p>
              
              <section>
                <h3 className="text-white font-bold text-lg mb-2">1. Введение</h3>
                <p>Мы уважаем вашу конфиденциальность. Настоящая Политика описывает, как проект <strong>MathLab PvP</strong> (далее "Сервис") собирает и использует ваши данные.</p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">2. Какие данные мы собираем</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Аккаунт:</strong> Email, имя пользователя (никнейм), зашифрованный пароль.</li>
                  <li><strong>Игровой прогресс:</strong> Статистика решений задач, рейтинг (MP), уровень, достижения.</li>
                  <li><strong>Технические данные:</strong> IP-адрес, тип устройства (для защиты от накрутки).</li>
                </ul>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">3. Как мы используем данные</h3>
                <p>Мы используем ваши данные исключительно для:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Обеспечения работы игры (PvP, турниры).</li>
                  <li>Формирования рейтинговых таблиц (Leaderboards).</li>
                  <li>Связи с вами в случае технических проблем.</li>
                </ul>
                <p className="mt-2 text-cyan-400">Мы НЕ передаем ваши данные третьим лицам и НЕ используем их для рекламы.</p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">4. Cookies и LocalStorage</h3>
                <p>Мы используем локальное хранилище браузера для сохранения вашей сессии входа. Это необходимо для работы сайта.</p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">5. Контакты</h3>
                <p>По вопросам данных пишите на: <a href="mailto:support@mathlabpvp.org" className="text-cyan-400 hover:underline">support@mathlabpvp.org</a></p>
              </section>
            </>
          ) : (
            <>
              <p className="opacity-70 text-xs">Последнее обновление: {new Date().toLocaleDateString()}</p>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">1. Общие положения</h3>
                <p>Используя сервис <strong>MathLab PvP</strong>, вы соглашаетесь с данными условиями. Сервис предоставляется "как есть" в образовательных и развлекательных целях.</p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">2. Правила поведения (Кодекс Чести)</h3>
                <p>Пользователям запрещено:</p>
                <ul className="list-disc pl-5 space-y-1 text-red-300">
                  <li>Использовать читы, скрипты или ботов для решения задач.</li>
                  <li>Оскорблять других участников в турнирах.</li>
                  <li>Регистрировать мульти-аккаунты для накрутки рейтинга.</li>
                </ul>
                <p className="mt-2">Администрация оставляет за собой право обнулить рейтинг или заблокировать аккаунт за нарушение правил.</p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">3. Интеллектуальная собственность</h3>
                <p>Все материалы (задачи, дизайн, персонаж-сурикат, код) являются собственностью MathLab PvP. Копирование без разрешения запрещено.</p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">4. Отказ от ответственности</h3>
                <p>Мы стремимся к точности материалов, но не гарантируем отсутствие ошибок в задачах. Сервис не является официальным государственным экзаменатором ЕНТ.</p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-2">5. Связь</h3>
                <p>Техническая поддержка: <a href="mailto:support@mathlabpvp.org" className="text-amber-400 hover:underline">support@mathlabpvp.org</a></p>
              </section>
            </>
          )}

        </div>

        {/* Футер модалки */}
        <div className="p-6 border-t border-slate-700 bg-slate-800/50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-bold"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}