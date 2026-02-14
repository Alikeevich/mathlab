import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  X, Users, Megaphone, Search, Shield, GraduationCap, 
  User as UserIcon, Send, CheckCircle, ChevronDown, 
  FileText, Check, XCircle, Download, Loader, Mail // <--- ДОБАВИЛ MAIL СЮДА
} from 'lucide-react';

type Props = {
  onClose: () => void;
};

// Тип для заявки
type TeacherRequest = {
  id: string;
  user_id: string;
  document_url: string;
  contact_email: string;
  status: string;
  created_at: string;
  user?: {
    username: string;
    email?: string;
  };
};

export function AdminDashboard({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'requests' | 'broadcast'>('users');
  
  // Состояния для пользователей
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  
  // Состояния для заявок
  const [requests, setRequests] = useState<TeacherRequest[]>([]);

  // Общие состояния
  const [loading, setLoading] = useState(false);

  // Состояния для рассылки
  const [msgTitle, setMsgTitle] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'requests') fetchRequests();
  }, [activeTab]);

  async function fetchUsers() {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100); 
    if (data) setAllUsers(data);
    setLoading(false);
  }

  async function fetchRequests() {
    setLoading(true);
    // Загружаем заявки и джойним данные пользователя
    const { data, error } = await supabase
      .from('teacher_requests')
      .select(`
        *,
        user:profiles(username)
      `)
      .eq('status', 'pending') // Только новые
      .order('created_at', { ascending: false });

    if (data) {
      // @ts-ignore
      setRequests(data);
    }
    setLoading(false);
  }

  async function updateUserRole(userId: string, newRole: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId);
    
    if (!error) {
      setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } else {
      alert('Ошибка обновления роли');
    }
  }

  // Обработка заявки (Принять/Отклонить)
// Обработка заявки (Принять/Отклонить)
  async function handleRequestAction(req: TeacherRequest, action: 'approve' | 'reject') {
    if (!confirm(action === 'approve' ? 'Одобрить заявку и выдать права учителя?' : 'Отклонить заявку?')) return;

    try {
      setLoading(true); // Включаем лоадер, чтобы не нажали дважды

      // 1. Обновляем статус заявки в teacher_requests
      const { error: reqError } = await supabase
        .from('teacher_requests')
        .update({ status: action === 'approve' ? 'approved' : 'rejected' })
        .eq('id', req.id);

      if (reqError) throw new Error(`Ошибка обновления заявки: ${reqError.message}`);

      // 2. ЕСЛИ ОДОБРЕНО: Обновляем роль пользователя в profiles
      if (action === 'approve') {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: 'teacher' })
          .eq('id', req.user_id);

        if (profileError) throw new Error(`Ошибка выдачи роли: ${profileError.message}`);
      }

      // 3. Отправляем уведомление пользователю
      await supabase.from('notifications').insert({
        user_id: req.user_id,
        title: action === 'approve' ? 'Заявка одобрена!' : 'Заявка отклонена',
        message: action === 'approve' 
          ? 'Поздравляем! Вам присвоен статус Учителя. Вам доступны создание турниров и панель управления.' 
          : 'К сожалению, мы не смогли подтвердить ваш статус учителя по предоставленным документам.',
        type: action === 'approve' ? 'success' : 'error'
      });

      // 4. Обновляем UI локально (убираем из списка)
      setRequests(prev => prev.filter(r => r.id !== req.id));
      
      // Если мы находимся во вкладке пользователей, обновим и её, чтобы увидеть новую роль
      if (activeTab === 'users') {
         fetchUsers();
      }

      alert(action === 'approve' ? 'Учитель успешно утвержден!' : 'Заявка отклонена.');

    } catch (e: any) {
      console.error('CRITICAL ERROR:', e);
      alert(e.message || 'Произошла ошибка при обработке.');
    } finally {
      setLoading(false);
    }
  }

  // Скачивание документа (получение Signed URL)
  async function downloadDocument(path: string) {
    const { data } = await supabase.storage
      .from('documents')
      .createSignedUrl(path, 60); // Ссылка живет 60 секунд
    
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    } else {
      alert('Не удалось получить файл');
    }
  }

  async function sendBroadcast() {
    if (!msgTitle || !msgBody) return;
    if (targetType === 'specific' && !targetUserId) return;

    setSending(true);
    try {
      const { error } = await supabase.rpc('admin_send_broadcast', {
        target_type: targetType,
        target_id: targetType === 'specific' ? targetUserId : null,
        msg_title: msgTitle,
        msg_body: msgBody,
        msg_type: 'info'
      });

      if (error) throw error;
      
      alert('Рассылка успешно отправлена!');
      setMsgTitle('');
      setMsgBody('');
    } catch (e) {
      console.error(e);
      alert('Ошибка отправки');
    } finally {
      setSending(false);
    }
  }

  const filteredUsers = allUsers.filter(u => 
    u.username?.toLowerCase().includes(search.toLowerCase()) || 
    u.id?.includes(search)
  );

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900 z-[100] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
      
      {/* ШАПКА */}
      <div className="p-4 md:p-6 border-b border-cyan-500/20 flex justify-between items-center bg-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/30">
            <Shield className="w-5 h-5 md:w-6 md:h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-white">Админ-центр</h2>
            <p className="text-slate-400 text-[10px] md:text-xs uppercase tracking-widest hidden sm:block">Управление платформой</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        
        {/* НАВИГАЦИЯ */}
        <div className="w-full md:w-64 bg-slate-800/50 border-b md:border-b-0 md:border-r border-slate-700 p-2 md:p-4 flex flex-row md:flex-col gap-2 shrink-0 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-4 py-2 md:py-3 rounded-xl transition-all font-bold text-sm md:text-base whitespace-nowrap ${activeTab === 'users' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
          >
            <Users className="w-4 h-4 md:w-5 md:h-5" /> Пользователи
          </button>
          
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-4 py-2 md:py-3 rounded-xl transition-all font-bold text-sm md:text-base whitespace-nowrap ${activeTab === 'requests' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
          >
            <GraduationCap className="w-4 h-4 md:w-5 md:h-5" /> Заявки
          </button>

          <button 
            onClick={() => setActiveTab('broadcast')}
            className={`flex-1 md:flex-none flex items-center justify-center md:justify-start gap-2 md:gap-3 px-4 py-2 md:py-3 rounded-xl transition-all font-bold text-sm md:text-base whitespace-nowrap ${activeTab === 'broadcast' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
          >
            <Megaphone className="w-4 h-4 md:w-5 md:h-5" /> Рассылка
          </button>
        </div>

        {/* КОНТЕНТ */}
        <div className="flex-1 bg-slate-900 p-4 md:p-8 overflow-y-auto">
          
          {/* === Вкладка ПОЛЬЗОВАТЕЛИ === */}
          {activeTab === 'users' && (
            <div className="max-w-5xl mx-auto">
              <div className="flex gap-4 mb-4 md:mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Поиск..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-cyan-500 outline-none"
                  />
                </div>
              </div>

              {/* ТАБЛИЦА ПОЛЬЗОВАТЕЛЕЙ (ПК) */}
              <div className="hidden md:block bg-slate-800/50 border border-slate-700 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-800 text-slate-400 uppercase text-xs">
                    <tr>
                      <th className="p-4">Пользователь</th>
                      <th className="p-4">Роль</th>
                      <th className="p-4 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4">
                          <div className="font-bold text-white">{u.username}</div>
                          <div className="text-xs text-slate-500 font-mono">{u.id}</div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                            u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                            u.role === 'teacher' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-slate-700 text-slate-400'
                          }`}>
                            {u.role || 'student'}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <select 
                            className="bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white outline-none focus:border-cyan-500 cursor-pointer"
                            value={u.role || 'student'}
                            onChange={(e) => updateUserRole(u.id, e.target.value)}
                          >
                            <option value="student">Ученик</option>
                            <option value="teacher">Учитель</option>
                            <option value="admin">Админ</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* МОБИЛЬНЫЕ КАРТОЧКИ ПОЛЬЗОВАТЕЛЕЙ */}
              <div className="md:hidden space-y-4">
                {filteredUsers.map(u => (
                  <div key={u.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-white text-lg">{u.username}</div>
                        <div className="text-[10px] text-slate-500 font-mono break-all">{u.id}</div>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          u.role === 'admin' ? 'bg-red-500/20 text-red-400' :
                          u.role === 'teacher' ? 'bg-amber-500/20 text-amber-400' :
                          'bg-slate-700 text-slate-400'
                        }`}>
                          {u.role || 'student'}
                      </span>
                    </div>
                    <div className="pt-3 border-t border-slate-700">
                      <label className="text-xs text-slate-400 mb-1 block">Изменить роль:</label>
                      <select 
                          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                          value={u.role || 'student'}
                          onChange={(e) => updateUserRole(u.id, e.target.value)}
                        >
                          <option value="student">Ученик</option>
                          <option value="teacher">Учитель</option>
                          <option value="admin">Админ</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === Вкладка ЗАЯВКИ === */}
          {activeTab === 'requests' && (
            <div className="max-w-4xl mx-auto">
              {loading ? (
                <div className="text-center py-10 text-slate-500"><Loader className="w-8 h-8 animate-spin mx-auto"/></div>
              ) : requests.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-700 rounded-3xl text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  Новых заявок нет
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requests.map(req => (
                    <div key={req.id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4 shadow-lg hover:border-slate-600 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400">
                            <GraduationCap className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-white text-lg">{req.user?.username || 'Unknown'}</div>
                            <div className="text-xs text-slate-400 font-mono">{new Date(req.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Mail className="w-3 h-3 text-slate-500" />
                          <span className="text-slate-300">{req.contact_email}</span>
                        </div>
                        <button 
                          onClick={() => downloadDocument(req.document_url)}
                          className="mt-2 w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-cyan-400 flex items-center justify-center gap-2 transition-colors font-medium"
                        >
                          <Download className="w-4 h-4" /> Скачать документ
                        </button>
                      </div>

                      <div className="flex gap-2 mt-auto">
                         <button 
                           onClick={() => handleRequestAction(req, 'approve')}
                           className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                         >
                           <Check className="w-4 h-4" /> Одобрить
                         </button>
                         <button 
                           onClick={() => handleRequestAction(req, 'reject')}
                           className="flex-1 py-2 bg-slate-700 hover:bg-red-600/20 hover:text-red-400 hover:border-red-500/50 text-slate-300 border border-transparent rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                         >
                           <XCircle className="w-4 h-4" /> Отклонить
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* === Вкладка РАССЫЛКА === */}
          {activeTab === 'broadcast' && (
            <div className="max-w-2xl mx-auto">
              <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 md:p-8">
                <h3 className="text-lg md:text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Megaphone className="w-6 h-6 text-cyan-400" /> Отправить уведомление
                </h3>

                <div className="space-y-4 md:space-y-6">
                  
                  {/* Выбор получателя */}
                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">Получатели</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['all', 'teachers', 'students', 'specific'].map(type => (
                        <button
                          key={type}
                          onClick={() => setTargetType(type)}
                          className={`py-2 px-3 rounded-lg text-xs md:text-sm font-bold border transition-all ${
                            targetType === type 
                              ? 'bg-cyan-600 border-cyan-500 text-white' 
                              : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {type === 'all' ? 'Все' : type === 'teachers' ? 'Учителя' : type === 'students' ? 'Ученики' : 'По ID'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {targetType === 'specific' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                      <label className="block text-slate-400 text-sm font-bold mb-2">ID Пользователя</label>
                      <input 
                        type="text" 
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        placeholder="Вставьте UUID..."
                        className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white font-mono text-sm"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">Заголовок</label>
                    <input 
                      type="text" 
                      value={msgTitle}
                      onChange={(e) => setMsgTitle(e.target.value)}
                      placeholder="Важные новости..."
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-sm font-bold mb-2">Сообщение</label>
                    <textarea 
                      value={msgBody}
                      onChange={(e) => setMsgBody(e.target.value)}
                      placeholder="Текст сообщения..."
                      className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-white h-32 resize-none"
                    />
                  </div>

                  <button 
                    onClick={sendBroadcast}
                    disabled={sending || !msgTitle || !msgBody}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg"
                  >
                    {sending ? 'Отправка...' : <><Send className="w-5 h-5" /> ОТПРАВИТЬ</>}
                  </button>

                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}