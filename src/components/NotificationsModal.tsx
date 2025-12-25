import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { X, Bell, Check, Trash2, Mail, MailOpen } from 'lucide-react';

type Notification = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  is_read: boolean;
  created_at: string;
};

type Props = {
  onClose: () => void;
};

export function NotificationsModal({ onClose }: Props) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
    markAllAsRead(); // Открыл окно -> считаем, что увидел
  }, []);

  async function loadNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
      
    if (data) setNotifications(data);
    setLoading(false);
  }

  async function markAllAsRead() {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }

  async function deleteNotification(id: string) {
    setNotifications(prev => prev.filter(n => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  }

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'success': return 'border-emerald-500/50 bg-emerald-900/20 text-emerald-100';
      case 'warning': return 'border-amber-500/50 bg-amber-900/20 text-amber-100';
      default: return 'border-cyan-500/30 bg-slate-800/50 text-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl h-[80vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
        
        {/* Шапка */}
        <div className="p-6 border-b border-slate-700 bg-slate-800 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <Bell className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Входящие</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Список */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {loading ? (
             <div className="text-center text-slate-500 py-10">Загрузка писем...</div>
          ) : notifications.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
               <MailOpen className="w-16 h-16 mb-4" />
               <p>Нет новых сообщений</p>
             </div>
          ) : (
            notifications.map((n) => (
              <div 
                key={n.id} 
                className={`relative p-4 rounded-xl border ${getTypeStyles(n.type)} transition-all hover:bg-slate-800`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{n.title}</h3>
                  <button 
                    onClick={() => deleteNotification(n.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm opacity-90 leading-relaxed whitespace-pre-wrap">{n.message}</p>
                <div className="mt-3 text-[10px] opacity-50 font-mono text-right">
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}