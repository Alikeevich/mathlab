import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Check, ShoppingBag, Coins, Crown } from 'lucide-react';

type Cosmetic = {
  id: string;
  name: string;
  type: 'hat' | 'body';
  image_url: string;
  price: number;
  is_premium: boolean;
};

export function CosmeticShop() {
  const { user, profile, refreshProfile } = useAuth();
  const [items, setItems] = useState<Cosmetic[]>([]);
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'hat' | 'body'>('hat');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!user) return;
    // 1. Загружаем все вещи
    const { data: allItems } = await supabase.from('cosmetics').select('*');
    if (allItems) setItems(allItems);

    // 2. Загружаем инвентарь юзера
    const { data: inventory } = await supabase.from('user_inventory').select('cosmetic_id').eq('user_id', user.id);
    if (inventory) {
      setOwnedIds(new Set(inventory.map(i => i.cosmetic_id)));
    }
  }

  const buyItem = async (item: Cosmetic) => {
    if (!profile || profile.coins < item.price) {
      alert("Недостаточно монет! Решай задачи, чтобы заработать.");
      return;
    }
    if (item.is_premium && !profile.is_premium) {
      alert("Этот предмет только для Premium пользователей (Battle Pass).");
      return;
    }

    setLoading(true);
    
    // Транзакция покупки
    const { error } = await supabase.rpc('buy_cosmetic', { 
      item_id: item.id, 
      user_id: user?.id, 
      cost: item.price 
    });

    if (!error) {
      // Обновляем локально
      setOwnedIds(prev => new Set(prev).add(item.id));
      refreshProfile(); // Обновит монеты в шапке
    } else {
      alert("Ошибка покупки");
    }
    setLoading(false);
  };

  const equipItem = async (item: Cosmetic) => {
    if (!user) return;
    const field = item.type === 'hat' ? 'equipped_hat' : 'equipped_body';
    
    // Если уже надето - снимаем, иначе надеваем
    const newValue = (profile as any)[field] === item.image_url ? null : item.image_url;

    await supabase.from('profiles').update({ [field]: newValue }).eq('id', user.id);
    refreshProfile();
  };

  const filteredItems = items.filter(i => i.type === activeTab);

  return (
    <div className="bg-slate-900/50 rounded-2xl border border-slate-700 p-4 mt-4 h-64 flex flex-col">
      {/* Табы */}
      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => setActiveTab('hat')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'hat' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Головные уборы
        </button>
        <button 
          onClick={() => setActiveTab('body')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'body' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
        >
          Одежда
        </button>
      </div>

      {/* Сетка товаров */}
      <div className="grid grid-cols-3 gap-3 overflow-y-auto pr-2 custom-scrollbar">
        {filteredItems.map(item => {
          const isOwned = ownedIds.has(item.id);
          const isEquipped = (profile as any)[item.type === 'hat' ? 'equipped_hat' : 'equipped_body'] === item.image_url;

          return (
            <div key={item.id} className={`relative bg-slate-800 rounded-xl p-2 border ${isEquipped ? 'border-emerald-500' : 'border-slate-700'} group`}>
              {/* Картинка */}
              <div className="h-16 flex items-center justify-center mb-2 bg-slate-900/50 rounded-lg">
                <img src={item.image_url} alt={item.name} className="h-12 w-12 object-contain" />
              </div>
              
              {/* Иконка Премиум */}
              {item.is_premium && <div className="absolute top-1 right-1"><Crown className="w-3 h-3 text-amber-400" /></div>}

              {/* Кнопка Действия */}
              {isOwned ? (
                <button 
                  onClick={() => equipItem(item)}
                  className={`w-full py-1 rounded text-xs font-bold ${isEquipped ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                >
                  {isEquipped ? 'Надето' : 'Надеть'}
                </button>
              ) : (
                <button 
                  onClick={() => buyItem(item)}
                  disabled={loading}
                  className="w-full py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-bold flex items-center justify-center gap-1"
                >
                  <Coins className="w-3 h-3" /> {item.price}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}