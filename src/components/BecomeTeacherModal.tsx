import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, UploadCloud, FileText, CheckCircle, ShieldCheck, Loader } from 'lucide-react';

type Props = {
  onClose: () => void;
};

export function BecomeTeacherModal({ onClose }: Props) {
  const { user, refreshProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user || !agreed) return;

    setLoading(true);
    try {
      // 1. Загружаем файл в Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`; // Папка user_id
      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // 2. Создаем заявку в базе
      // Формируем путь (т.к. бакет приватный, url не публичный, храним путь)
      const { error: dbError } = await supabase.from('teacher_requests').insert({
        user_id: user.id,
        document_url: data.path
      });

      if (dbError) throw dbError;

      setStatus('success');
      
      // Обновляем профиль (опционально, если статус меняется мгновенно, но тут ручная проверка)
      refreshProfile();

    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in">
        <div className="bg-slate-800 border border-emerald-500/50 rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Заявка отправлена!</h2>
          <p className="text-slate-400 mb-6">
            Мы проверим ваши документы в течение 24 часов. <br/>
            Если всё в порядке, у вас появится доступ к Панели Учителя.
          </p>
          <button onClick={onClose} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all">
            Отлично
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-cyan-500/30 w-full max-w-lg rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Аккаунт Учителя</h2>
          </div>
          <button onClick={onClose}><X className="text-slate-400 hover:text-white" /></button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6 p-4 bg-cyan-900/10 border border-cyan-500/20 rounded-xl text-sm text-cyan-200">
            <h4 className="font-bold mb-2 flex items-center gap-2"><FileText className="w-4 h-4"/> Возможности учителя:</h4>
            <ul className="list-disc pl-5 space-y-1 opacity-80">
              <li>Создание и проведение турниров по QR-коду</li>
              <li>Доступ к Генератору задач (Терминал Архитектора)</li>
              <li>Просмотр статистики учеников (скоро)</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Загрузка файла */}
            <div>
              <label className="block text-slate-400 text-sm font-bold mb-2">
                Загрузите фото диплома или сертификата
              </label>
              <div className="relative group">
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 group-hover:border-cyan-400 group-hover:bg-slate-800'}`}>
                  {file ? (
                    <div className="text-emerald-400 font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" /> {file.name}
                    </div>
                  ) : (
                    <div className="text-slate-500 group-hover:text-cyan-400">
                      <UploadCloud className="w-8 h-8 mx-auto mb-2" />
                      <span className="text-sm">Нажмите для загрузки файла</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Чекбокс */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={agreed} 
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
              />
              <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                Я подтверждаю, что являюсь преподавателем, и даю согласие на обработку моих профессиональных данных согласно <span className="text-cyan-400 underline">Политике конфиденциальности</span>.
              </span>
            </label>

            {status === 'error' && (
              <div className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">
                Ошибка при отправке. Попробуйте файл меньшего размера.
              </div>
            )}

            <button 
              type="submit" 
              disabled={!file || !agreed || loading}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="animate-spin w-5 h-5" /> : 'ОТПРАВИТЬ ЗАЯВКУ'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}