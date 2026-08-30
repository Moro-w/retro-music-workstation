import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getToken, type GeneratePayload, type Job } from './api';
import BootScreen from './components/BootScreen';
import Landing from './components/Landing';
import LoginScreen from './components/LoginScreen';
import Window from './components/Window';
import Taskbar from './components/Taskbar';
import ComposerWindow from './components/ComposerWindow';
import HistoryWindow from './components/HistoryWindow';
import TrashWindow from './components/TrashWindow';
import ComingSoonWindow from './components/ComingSoonWindow';

interface AppDef {
  id: string;
  title: string;
  icon: string;
  kind: string;
  w: number;
  h: number | 'auto';
}

interface WinState {
  id: string;
  x: number;
  y: number;
  z: number;
}

const APPS: AppDef[] = [
  { id: 'composer', title: '创作台', icon: '🎵', kind: 'composer', w: 580, h: 'auto' },
  { id: 'history', title: '历史', icon: '📼', kind: 'history', w: 620, h: 480 },
  { id: 'trash', title: '回收站', icon: '🗑️', kind: 'trash', w: 520, h: 360 },
  { id: 'idea', title: '灵感', icon: '💡', kind: 'soon', w: 380, h: 240 },
  { id: 'fav', title: '收藏', icon: '❤️', kind: 'soon', w: 380, h: 240 },
  { id: 'playlists', title: '歌单', icon: '📂', kind: 'soon', w: 380, h: 240 },
  { id: 'refaudio', title: '参考音频', icon: '🎚️', kind: 'soon', w: 380, h: 240 },
  { id: 'settings', title: '设置', icon: '⚙️', kind: 'soon', w: 380, h: 240 },
];

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [stage, setStage] = useState<'landing' | 'boot' | 'desktop'>('landing');
  const booted = stage === 'desktop';
  const [wins, setWins] = useState<WinState[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const zRef = useRef(10);

  const [history, setHistory] = useState<Job[]>([]);
  const [trash, setTrash] = useState<Job[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [progressMap, setProgressMap] = useState<Record<string, { progress: number; msg: string }>>({});

  const [currentTrack, setCurrentTrack] = useState<Job | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const loadedIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try { setHistory(await api.listJobs()); } catch { /* ignore */ }
    try { setTrash(await api.listTrash()); } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (authed) refresh(); }, [authed, refresh]);

  // 鉴权检查：线上要求邀请码登录；本地开发（未开邀请码）直接放行
  useEffect(() => {
    let cancel = false;
    api.authStatus()
      .then((s) => {
        if (cancel) return;
        setAuthed(!s.auth_required || !!getToken());
      })
      .catch(() => { if (!cancel) setAuthed(false); })
      .finally(() => { if (!cancel) setAuthChecking(false); });
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!authed) return;
    const es = api.events();
    const handler = (e: MessageEvent) => {
      let data: any;
      try { data = JSON.parse(e.data); } catch { return; }
      if (e.type === 'job_update') {
        if (data.status === 'completed' || data.status === 'failed') {
          setGenerating(false);
          setCurrentJobId(null);
          setProgressMap((p) => {
            const n = { ...p };
            delete n[data.job_id];
            return n;
          });
          refresh();
          // 生成完成后自动加载到任务栏播放器并尝试自动播放
          if (data.status === 'completed' && data.audio_url) {
            api.getJob(data.job_id).then((job) => loadAndPlay(job)).catch(() => {});
          }
        }
      } else if (e.type === 'job_progress') {
        setProgressMap((p) => ({ ...p, [data.job_id]: { progress: data.progress, msg: data.msg } }));
      }
    };
    ['job_update', 'job_progress', 'job_queued'].forEach((t) => es.addEventListener(t, handler));
    return () => es.close();
  }, [authed, refresh]);

  const openApp = useCallback((id: string) => {
    const z = ++zRef.current;
    setActiveId(id);
    setWins((ws) => {
      if (ws.some((w) => w.id === id)) {
        return ws.map((w) => (w.id === id ? { ...w, z } : w));
      }
      const idx = ws.length;
      return [...ws, { id, x: 90 + (idx % 5) * 36, y: 64 + (idx % 5) * 32, z }];
    });
  }, []);

  const focusApp = useCallback((id: string) => {
    const z = ++zRef.current;
    setActiveId(id);
    setWins((ws) => ws.map((w) => (w.id === id ? { ...w, z } : w)));
  }, []);

  const closeApp = useCallback((id: string) => {
    setWins((ws) => ws.filter((w) => w.id !== id));
  }, []);

  // 加载并播放指定作品；同一首歌不重复设 src，避免打断播放/导致暂停失灵
  const loadAndPlay = useCallback((job: Job) => {
    setCurrentTrack(job);
    const a = audioRef.current;
    if (!a) return;
    if (loadedIdRef.current !== job.id) {
      a.src = api.audioUrl(job.audio_url || '');
      loadedIdRef.current = job.id;
      a.currentTime = 0;
    }
    if (a.src) {
      // 播放/暂停状态统一由 audio 元素的 onPlay/onPause 事件同步，避免异步竞态
      a.play().catch(() => {});
    }
  }, []);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (isPlaying) a.pause();
    else a.play().catch(() => {});
  };

  const toggleTrack = (job: Job) => {
    if (currentTrack?.id === job.id && isPlaying) {
      audioRef.current?.pause();
    } else {
      loadAndPlay(job);
    }
  };

  const seek = (t: number) => {
    const a = audioRef.current;
    if (a) a.currentTime = t;
  };

  const handleGenerate = async (p: GeneratePayload) => {
    try {
      setGenerating(true);
      const res = await api.generate(p);
      setCurrentJobId(res.job_id);
      refresh();
    } catch (e) {
      alert((e as Error).message);
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try { await api.softDelete(id); refresh(); } catch (e) { alert((e as Error).message); }
  };
  const handleRestore = async (id: string) => {
    try { await api.restore(id); refresh(); } catch (e) { alert((e as Error).message); }
  };
  const handlePurge = async (id: string) => {
    try { await api.purge(id); refresh(); } catch (e) { alert((e as Error).message); }
  };

  const renderContent = (id: string) => {
    const app = APPS.find((a) => a.id === id)!;
    switch (app.kind) {
      case 'composer':
        return (
          <ComposerWindow
            onGenerate={handleGenerate}
            generating={generating}
            progress={currentJobId ? progressMap[currentJobId] || null : null}
          />
        );
      case 'history':
        return (
          <HistoryWindow
            jobs={history}
            onPlay={toggleTrack}
            onDelete={handleDelete}
            currentId={currentTrack?.id ?? null}
            isPlaying={isPlaying}
          />
        );
      case 'trash':
        return <TrashWindow jobs={trash} onRestore={handleRestore} onPurge={handlePurge} />;
      default:
        return <ComingSoonWindow title={app.title} />;
    }
  };

  if (authChecking) {
    return <div className="desktop h-full w-full flex items-center justify-center text-white">加载中…</div>;
  }
  if (!authed) {
    return <LoginScreen onSuccess={() => setAuthed(true)} />;
  }

  if (stage === 'landing') {
    return <Landing onEnter={() => setStage('boot')} />;
  }
  if (stage === 'boot') {
    return <BootScreen onDone={() => setStage('desktop')} />;
  }

  return (
    <div className="desktop scanlines h-full w-full relative flex flex-col overflow-hidden">
      {/* 桌面图标 */}
      <div className="flex-1 p-2 flex flex-col flex-wrap content-start gap-1 overflow-hidden">
        {APPS.map((app) => (
          <div
            key={app.id}
            className={`desktop-icon ${selected === app.id ? 'selected' : ''}`}
            onClick={() => setSelected(app.id)}
            onDoubleClick={() => openApp(app.id)}
          >
            <div className="ico">{app.icon}</div>
            <div className="lbl">{app.title}</div>
          </div>
        ))}
      </div>

      {/* 窗口 */}
      {wins.map((w) => {
        const app = APPS.find((a) => a.id === w.id)!;
        return (
          <Window
            key={w.id}
            title={app.title}
            icon={app.icon}
            x={w.x}
            y={w.y}
            zIndex={w.z}
            width={app.w}
            height={app.h}
            active={activeId === w.id}
            onFocus={() => focusApp(w.id)}
            onClose={() => closeApp(w.id)}
          >
            {renderContent(w.id)}
          </Window>
        );
      })}

      {/* 任务栏 */}
      <Taskbar
        apps={APPS}
        openIds={wins.map((w) => w.id)}
        activeId={activeId}
        onOpen={openApp}
        onFocus={focusApp}
        currentTrack={currentTrack}
        isPlaying={isPlaying}
        time={time}
        onTogglePlay={togglePlay}
        onSeek={seek}
      />

      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setTime({ current: a.currentTime, duration: a.duration || 0 });
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          const a = audioRef.current;
          if (a) setTime((t) => ({ ...t, duration: a.duration || 0 }));
        }}
      />
    </div>
  );
}
