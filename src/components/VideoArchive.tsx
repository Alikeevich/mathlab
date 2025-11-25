import { useState } from 'react';
import { X, Play, BookOpen, MonitorPlay, Search } from 'lucide-react';

// Структура видео
type Video = {
  id: string; // YouTube ID (то, что после v=)
  title: string;
  sector: number; // К какому сектору относится
  duration: string;
};

// === БАЗА ДАННЫХ ВИДЕО (МОЖНО РАСШИРЯТЬ) ===
const VIDEO_LIBRARY: Video[] = [
  // СЕКТОР 0: ЛОГИКА
  { id: 'aRVgz_EfWjI', title: 'Задачи на сплавы и смеси (Метод стаканов)', sector: 0, duration: '12:30' },
  { id: 'MzGbb7Xp9AQ', title: 'Задачи на движение: По реке и против', sector: 0, duration: '15:45' },
  
  // СЕКТОР 1: АЛГЕБРА
  { id: 'G1KGP3TyPhw', title: 'Метод интервалов для неравенств', sector: 1, duration: '10:15' },
  { id: 'y8zkDxXR0-E', title: 'Теорема Виета: Как решать устно', sector: 1, duration: '08:20' },

  // СЕКТОР 2: ФУНКЦИИ
  { id: '5ByEHUIz0rA', title: 'Чтение графиков функций', sector: 2, duration: '14:00' },
  
  // СЕКТОР 3: ЛОГАРИФМЫ
  { id: 'S1G7w2g1vT4', title: 'Все свойства логарифмов с примерами', sector: 3, duration: '18:10' },
  { id: 'n6mhxgkq2EY', title: 'Логарифмические уравнения', sector: 3, duration: '11:30' },

  // СЕКТОР 4: ТРИГОНОМЕТРИЯ
  { id: 'ZGSxIAZAS4s', title: 'Тригонометрический круг для чайников', sector: 4, duration: '20:00' },
  { id: 'csnBzAgZ9Qc', title: 'Формулы приведения: Запоминаем без зубрежки', sector: 4, duration: '09:45' },

  // СЕКТОР 5: ПРОИЗВОДНАЯ
  { id: 'gcxCgGjku38', title: 'Физический и геометрический смысл производной', sector: 5, duration: '13:20' },
  { id: 'iE-B0LIFm9I', title: 'Таблица интегралов', sector: 5, duration: '16:00' },

  // СЕКТОР 6: ГЕОМЕТРИЯ
  { id: 'EBr2XaAn_Fw', title: 'Вся Планиметрия: Формулы площадей', sector: 6, duration: '25:00' },
  { id: 'jsRiZy-feaE', title: 'Стереометрия: Сечения многогранников', sector: 6, duration: '19:15' },
];

// Названия вкладок
const SECTORS = [
  { id: 0, name: 'Логика' },
  { id: 1, name: 'Алгебра' },
  { id: 2, name: 'Функции' },
  { id: 3, name: 'Логарифмы' },
  { id: 4, name: 'Тригонометрия' },
  { id: 5, name: 'Мат.Анализ' },
  { id: 6, name: 'Геометрия' },
];

export function VideoArchive({ onClose }: { onClose: () => void }) {
  const [activeSector, setActiveSector] = useState(0);
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);

  // Фильтруем видео по выбранному сектору
  const filteredVideos = VIDEO_LIBRARY.filter(v => v.sector === activeSector);

  return (
    <div className="fixed inset-0 bg-slate-900/95 z-50 overflow-hidden flex flex-col">
      
      {/* ШАПКА */}
      <div className="p-6 border-b border-cyan-500/20 bg-slate-900 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg">
            <MonitorPlay className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white tracking-wider">АРХИВ ЗНАНИЙ</h2>
            <p className="text-cyan-400/60 text-xs uppercase">База данных видеоматериалов</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400 hover:text-white" />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* БОКОВОЕ МЕНЮ (Категории) */}
        <div className="w-64 bg-slate-800/50 border-r border-cyan-500/20 overflow-y-auto hidden md:block">
          <div className="p-4 space-y-2">
            {SECTORS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSector(sec.id)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                  activeSector === sec.id 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="font-mono text-xs opacity-50">SEC-{sec.id}</span>
                <span className="font-medium">{sec.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ОСНОВНАЯ ОБЛАСТЬ (Сетка видео) */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          
          {/* Мобильное меню (Табы сверху) */}
          <div className="md:hidden flex overflow-x-auto gap-2 mb-6 pb-2 scrollbar-hide">
            {SECTORS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSector(sec.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm ${
                  activeSector === sec.id 
                    ? 'bg-cyan-500 text-black font-bold' 
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-cyan-400" />
              Доступные материалы: {SECTORS[activeSector].name}
            </h3>
          </div>

          {filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <div 
                  key={video.id}
                  onClick={() => setPlayingVideo(video.id)}
                  className="group relative bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden cursor-pointer hover:border-cyan-500/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Превью (Thumbnail с YouTube) */}
                  <div className="aspect-video relative overflow-hidden">
                    <img 
                      src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`} 
                      alt={video.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/10 transition-colors">
                      <div className="w-12 h-12 bg-cyan-500/90 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 text-black fill-current ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs font-mono text-white">
                      {video.duration}
                    </div>
                  </div>

                  <div className="p-4">
                    <h4 className="text-white font-medium leading-snug group-hover:text-cyan-300 transition-colors">
                      {video.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <p>В этом секторе видео пока не загружены.</p>
            </div>
          )}
        </div>
      </div>

      {/* МОДАЛКА ПЛЕЕРА */}
      {playingVideo && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-5xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative border border-slate-700">
            <button 
              onClick={() => setPlayingVideo(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-red-600/80 rounded-full text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${playingVideo}?autoplay=1`} 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}