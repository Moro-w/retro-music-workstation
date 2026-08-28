import { useEffect, useState } from 'react';

const LINES = [
  '复古音乐工作站 BIOS v1.0',
  'Copyright (C) 2026 Retro Music Studio',
  '',
  'CPU : Apple M4 @ 24GB Unified Memory .... OK',
  'Memory Test : 24576K .................... OK',
  '',
  'Detecting Audio Engine ... ACE-Step 1.5',
  'Backend : Metal (MLX backend) ........... OK',
  '',
  'Initializing Desktop ....................',
];

export default function BootScreen({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const showBrand = count >= LINES.length;

  useEffect(() => {
    const t1 = setInterval(() => setCount((c) => Math.min(c + 1, LINES.length)), 240);
    const t2 = setInterval(() => setProgress((p) => Math.min(p + 2, 100)), 70);
    const done = setTimeout(onDone, 9500);
    return () => {
      clearInterval(t1);
      clearInterval(t2);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div className="bios" onClick={onDone}>
      <div className="text-lg leading-6">
        {LINES.slice(0, count).map((l, i) => (
          <div key={i}>{l || '\u00A0'}</div>
        ))}
      </div>

      {showBrand && (
        <div className="mt-8">
          <div className="brand text-3xl mb-5">RETRO MUSIC</div>
          <div className="w-[360px] max-w-full">
            <div className="border border-gray-600 p-1">
              <div
                className="h-5 transition-all"
                style={{ width: `${progress}%`, background: 'repeating-linear-gradient(90deg,#00c000 0 18px,#008000 18px 22px)' }}
              />
            </div>
            <div className="mt-1 text-sm">
              {progress < 100 ? `Loading... ${progress}%` : 'Press any key to continue...'}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-600">点击任意位置跳过</div>
    </div>
  );
}
