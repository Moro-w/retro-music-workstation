import { useState } from 'react';
import { api, type GeneratePayload } from '../api';

interface Props {
  onGenerate: (p: GeneratePayload) => void;
  generating: boolean;
  progress: { progress: number; msg: string } | null;
}

export default function ComposerWindow({ onGenerate, generating, progress }: Props) {
  const [prompt, setPrompt] = useState('');
  const [tags, setTags] = useState('');
  const [busy, setBusy] = useState(false);
  const [mockMode, setMockMode] = useState(false); // 默认真实生成（fal.ai）

  const enhance = async () => {
    if (!prompt) return;
    setBusy(true);
    try {
      const r = await api.enhance(prompt);
      if (r.topic) setPrompt(r.topic);
      if (r.tags) setTags(r.tags);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submit = () => {
    if (!prompt.trim()) {
      alert('请先填写音乐描述');
      return;
    }
    onGenerate({
      prompt: prompt.trim(),
      tags: tags.trim() || undefined,
      mock: mockMode,
    });
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div>
        <label className="text-sm font-bold">音乐描述 *</label>
        <div className="flex gap-1">
          <input className="field95" placeholder="比如：夏夜海边的篝火，轻柔吉他" value={prompt}
            onChange={(e) => setPrompt(e.target.value)} disabled={generating} />
          <button className="btn95 whitespace-nowrap" onClick={enhance} disabled={busy || generating || !prompt}>
            ✨ 润色
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-bold">音乐风格</label>
        <input className="field95" placeholder="比如：Pop, 抒情, 慢节奏" value={tags}
          onChange={(e) => setTags(e.target.value)} disabled={generating} />
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input type="checkbox" checked={mockMode} onChange={(e) => setMockMode(e.target.checked)} className="w-4 h-4" disabled={generating} />
        <span className={mockMode ? '' : 'font-bold text-red-600'}>
          {mockMode ? '免费测试模式（合成音频，不扣费）' : '真实生成（fal.ai 按次扣费）'}
        </span>
      </label>

      <button className="btn95 !font-bold !text-base !py-2" onClick={submit} disabled={generating}>
        {generating ? '生成中…' : mockMode ? '🎵 生成音乐（免费测试）' : '🎵 生成音乐（真实付费）'}
      </button>

      {generating && (
        <div className="border-2 border-l-[#808080] border-t-[#808080] border-r-white border-b-white p-2 bg-[#c0c0c0]">
          <div className="text-sm mb-1">{progress?.msg || '排队中…'}</div>
          <div className="h-5 border-2 border-l-[#808080] border-t-[#808080] border-r-white border-b-white bg-white p-0.5">
            <div className="h-full" style={{ width: `${progress?.progress || 0}%`, background: 'repeating-linear-gradient(90deg,#000080 0 14px,#1084d0 14px 18px)' }} />
          </div>
        </div>
      )}
    </div>
  );
}
