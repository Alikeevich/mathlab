import { useState, useEffect } from 'react';
import { supabase, Sector, Module } from '../lib/supabase';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
import { Save, RefreshCw, Eye, Database } from 'lucide-react';

export function AdminGenerator({ onClose }: { onClose: () => void }) {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string>('');
  
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [type, setType] = useState('input');
  
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Загрузка секторов при старте
  useEffect(() => {
    supabase.from('sectors').select('*').order('id').then(({ data }) => {
      if (data) setSectors(data);
    });
  }, []);

  // Загрузка модулей при выборе сектора
  useEffect(() => {
    if (selectedSectorId !== null) {
      supabase
        .from('modules')
        .select('*')
        .eq('sector_id', selectedSectorId)
        .order('order_index')
        .then(({ data }) => {
          if (data) setModules(data);
        });
    } else {
      setModules([]);
    }
  }, [selectedSectorId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedModuleId || !question || !answer) return;

    setStatus('saving');

    const { error } = await supabase.from('problems').insert({
      module_id: selectedModuleId,
      question,
      answer,
      hint: hint || null,
      type,
      difficulty: 1
    });

    if (error) {
      console.error(error);
      setStatus('error');
    } else {
      setStatus('success');
      // Очищаем поля, но оставляем модуль выбранным, чтобы вводить следующую задачу
      setQuestion('');
      setAnswer('');
      setHint('');
      setTimeout(() => setStatus('idle'), 2000);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 overflow-y-auto p-4 flex justify-center">
      <div className="w-full max-w-4xl bg-slate-800 border border-cyan-500/30 rounded-xl p-6 h-fit">
        <div className="flex justify-between items-center mb-6 border-b border-cyan-500/20 pb-4">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Терминал Архитектора</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            Закрыть [ESC]
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ЛЕВАЯ КОЛОНКА - ФОРМА */}
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-cyan-400 text-xs mb-1">Сектор</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                  onChange={(e) => setSelectedSectorId(Number(e.target.value))}
                >
                  <option value="">Выберите сектор...</option>
                  {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-cyan-400 text-xs mb-1">Модуль</label>
                <select 
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                  disabled={!modules.length}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  value={selectedModuleId}
                >
                  <option value="">Выберите модуль...</option>
                  {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-cyan-400 text-xs mb-1">Вопрос (LaTeX поддерживается)</label>
              <textarea
                value={question}
                onChange={e => setQuestion(e.target.value)}
                className="w-full h-32 bg-slate-900 border border-slate-600 rounded p-3 text-white font-mono text-sm"
                placeholder="Например: Решите уравнение: $\sqrt{x} = 4$"
                required
              />
              <p className="text-slate-500 text-xs mt-1">Используй $...$ для формул</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-cyan-400 text-xs mb-1">Правильный ответ</label>
                <input
                  type="text"
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white"
                  placeholder="Например: 16"
                  required
                />
              </div>
              <div>
                 <label className="block text-cyan-400 text-xs mb-1">Тип ответа</label>
                 <select 
                  className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white"
                  value={type}
                  onChange={e => setType(e.target.value)}
                 >
                   <option value="input">Ввод числа/текста</option>
                   <option value="choice">Выбор (пока не работает)</option>
                 </select>
              </div>
            </div>

            <div>
              <label className="block text-cyan-400 text-xs mb-1">Подсказка (необязательно)</label>
              <input
                type="text"
                value={hint}
                onChange={e => setHint(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white text-sm"
                placeholder="Например: Возведи обе части в квадрат"
              />
            </div>

            <button
              type="submit"
              disabled={status === 'saving' || !selectedModuleId}
              className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                status === 'success' 
                  ? 'bg-emerald-600 text-white' 
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white'
              }`}
            >
              {status === 'saving' && <RefreshCw className="w-5 h-5 animate-spin" />}
              {status === 'success' && <Save className="w-5 h-5" />}
              {status === 'idle' && 'Сохранить в базу'}
              {status === 'success' ? 'Сохранено! Пиши следующую' : status === 'saving' ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>

          {/* ПРАВАЯ КОЛОНКА - ПРЕДПРОСМОТР */}
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-2 text-slate-400 mb-4 uppercase tracking-wider text-xs font-bold">
              <Eye className="w-4 h-4" />
              Предпросмотр вопроса
            </div>
            
            <div className="bg-slate-800 p-6 rounded-lg min-h-[200px] flex items-center justify-center text-center border border-cyan-500/10">
              {question ? (
                <div className="text-xl text-white">
                  <Latex>{question}</Latex>
                </div>
              ) : (
                <span className="text-slate-600">Здесь появится формула...</span>
              )}
            </div>

            <div className="mt-6 space-y-2">
              <div className="text-xs text-slate-500">Техническая информация:</div>
              <div className="text-xs text-emerald-400 font-mono">
                Модуль ID: {selectedModuleId || 'Не выбран'}
              </div>
              <div className="text-xs text-blue-400 font-mono">
                Ответ: {answer}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}