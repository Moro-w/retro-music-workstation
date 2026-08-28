import { useState } from 'react';
import { api } from '../api';

export default function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.login(code.trim());
      api.setToken(r.token);
      onSuccess();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="desktop scanlines h-full w-full flex items-center justify-center">
      <div className="win95-window w-[360px]">
        <div className="win95-titlebar">
          <span>🎵 复古音乐工作站 · 登录</span>
          <span className="win95-close cursor-default">✕</span>
        </div>
        <div className="win95-body flex flex-col gap-3">
          <p className="text-sm text-[#404040]">请输入邀请码进入工作站：</p>
          <input
            className="field95"
            type="password"
            placeholder="邀请码"
            value={code}
            autoFocus
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          {err && <div className="text-red-600 text-sm">{err}</div>}
          <button className="btn95 !font-bold" onClick={submit} disabled={busy || !code.trim()}>
            {busy ? '验证中…' : '进入'}
          </button>
        </div>
      </div>
    </div>
  );
}
