import { useRef, useState } from 'react';
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
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef<number | null>(null);

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
    if (!confirming) {
      // 第一次点击：进入确认态，几秒内再点才真正生成（防误触）
      setConfirming(true);
      if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
      confirmTimer.current = window.setTimeout(() => setConfirming(false), 3000);
      return;
    }
    // 二次点击：真正提交
    setConfirming(false);
    if (confirmTimer.current) window.clearTimeout(confirmTimer.current);
    onGenerate({
      prompt: prompt.trim(),
      tags: tags.trim() || undefined,
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

      <button
        className={`btn95 !font-bold !text-base !py-2 ${confirming ? 'btn95-confirm' : ''}`}
        onClick={submit}
        disabled={generating}
      >
        {generating ? '生成中…' : confirming ? '⚠ 再点一次确认生成' : '🎵 生成音乐'}
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
