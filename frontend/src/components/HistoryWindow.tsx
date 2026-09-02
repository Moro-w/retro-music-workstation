import type { Job } from '../api';
import { api } from '../api';

interface Props {
  jobs: Job[];
  onPlay: (j: Job) => void;
  onDelete: (id: string) => void;
  currentId: string | null;
  isPlaying: boolean;
}

const STATUS: Record<string, string> = {
  queued: '排队中',
  processing: '生成中',
  completed: '已完成',
  failed: '失败',
};

export default function HistoryWindow({ jobs, onPlay, onDelete, currentId, isPlaying }: Props) {
  if (jobs.length === 0) {
    return <div className="text-[#404040] text-center mt-10">还没有作品，去「创作台」生成第一首吧。</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {jobs.map((j) => (
        <div key={j.id} className="border-2 border-l-[#808080] border-t-[#808080] border-r-white border-b-white bg-[#c0c0c0] p-2 flex items-center gap-2">
          <span className="text-xl">🎵</span>
          <div className="flex-1 min-w-0">
            <div className="truncate font-bold">{j.title || '未命名'}</div>
            <div className="text-sm text-[#404040] truncate">{j.prompt}</div>
            <div className="text-xs text-[#404040]">
              {STATUS[j.status]}
              {j.generation_time_seconds ? ` · ${j.generation_time_seconds}s` : ''}
              {j.status === 'failed' && j.error_msg ? ` · ${j.error_msg}` : ''}
            </div>
          </div>
          {j.status === 'completed' && (
            <>
              <button className="btn95 !px-2" onClick={() => onPlay(j)}>
                {currentId === j.id && isPlaying ? '⏸' : '▶'}
              </button>
              <a className="btn95 !px-2 !no-underline" href={api.downloadUrl(j.id)} title="下载到本地" aria-label="下载到本地">⬇ 下载</a>
            </>
          )}
          <button className="btn95 !px-2" onClick={() => onDelete(j.id)}>🗑</button>
        </div>
      ))}
    </div>
  );
}
