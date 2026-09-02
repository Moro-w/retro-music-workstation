import { useEffect, useState } from 'react';
import { api, type Job } from '../api';

interface Props {
  apps: { id: string; title: string; icon: string }[];
  openIds: string[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onFocus: (id: string) => void;
  currentTrack: Job | null;
  isPlaying: boolean;
  time: { current: number; duration: number };
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
}

function fmt(s: number) {
  if (!isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function Taskbar({
  apps, openIds, activeId, onOpen, onFocus, currentTrack, isPlaying, time, onTogglePlay, onSeek,
}: Props) {
  const [startOpen, setStartOpen] = useState(false);
  const [clock, setClock] = useState('');

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    tick();
    const t = setInterval(tick, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="taskbar relative z-[9990]">
      <button
        className="start-btn"
        onClick={() => setStartOpen((v) => !v)}
      >
        🎵 开始
      </button>

      {startOpen && (
        <div className="absolute bottom-12 left-0 w-56 bg-[#c0c0c0] border-2 border-l-white border-t-white border-r-[#404040] border-b-[#404040] shadow-md p-1">
          <div className="text-xs font-bold px-2 py-1 text-[#000080] border-b border-[#808080] mb-1">复古音乐工作站</div>
          {apps.map((a) => (
            <button
              key={a.id}
              className="w-full text-left px-2 py-1.5 hover:bg-[#000080] hover:text-white flex items-center gap-2"
              onClick={() => {
                onOpen(a.id);
                setStartOpen(false);
              }}
            >
              <span>{a.icon}</span>
              <span>{a.title}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex gap-1 overflow-hidden">
        {apps.filter((a) => openIds.includes(a.id)).map((a) => (
          <button
            key={a.id}
            className={`tb-task ${activeId === a.id ? 'font-bold' : ''}`}
            onClick={() => onFocus(a.id)}
            title={a.title}
          >
            {a.icon} {a.title}
          </button>
        ))}
      </div>

      {/* 播放器 */}
      <div className="flex items-center gap-2 border-2 border-l-[#808080] border-t-[#808080] border-r-white border-b-white px-2 py-1 min-w-0">
        <span className="text-lg">🎧</span>
        <div className="min-w-0">
          <div className="text-sm truncate max-w-[180px] leading-tight">
            {currentTrack ? (currentTrack.title || '未命名') : '未播放'}
          </div>
          <div className="text-xs text-[#404040]">{fmt(time.current)} / {fmt(time.duration)}</div>
        </div>
        <button type="button" className="btn95 !px-2 !py-0.5" onClick={onTogglePlay} disabled={!currentTrack}>
          {isPlaying ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          className="w-20"
          min={0}
          max={time.duration || 0}
          step={0.1}
          value={time.current}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <a
          className="btn95 !px-2 !py-0.5 !no-underline"
          href={currentTrack ? api.downloadUrl(currentTrack.id) : undefined}
          title="下载到本地"
          aria-label="下载到本地"
          onClick={(e) => { if (!currentTrack) e.preventDefault(); }}
        >
          ⬇
        </a>
      </div>

      <div className="border-2 border-l-[#808080] border-t-[#808080] border-r-white border-b-white px-2 py-0.5 text-sm whitespace-nowrap">
        {clock}
      </div>
    </div>
  );
}
