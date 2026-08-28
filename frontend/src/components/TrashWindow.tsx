import type { Job } from '../api';

interface Props {
  jobs: Job[];
  onRestore: (id: string) => void;
  onPurge: (id: string) => void;
}

export default function TrashWindow({ jobs, onRestore, onPurge }: Props) {
  if (jobs.length === 0) {
    return <div className="text-[#404040] text-center mt-10">回收站是空的。</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {jobs.map((j) => (
        <div key={j.id} className="border-2 border-l-[#808080] border-t-[#808080] border-r-white border-b-white bg-[#c0c0c0] p-2 flex items-center gap-2">
          <span className="text-xl">🗑️</span>
          <div className="flex-1 min-w-0">
            <div className="truncate font-bold">{j.title || '未命名'}</div>
            <div className="text-sm text-[#404040] truncate">{j.prompt}</div>
          </div>
          <button className="btn95 !px-2" onClick={() => onRestore(j.id)}>还原</button>
          <button className="btn95 !px-2" onClick={() => onPurge(j.id)}>彻底删除</button>
        </div>
      ))}
    </div>
  );
}
