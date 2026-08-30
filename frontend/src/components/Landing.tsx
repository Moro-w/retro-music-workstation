import { ArchiveRestore, MonitorCog, Music2, type LucideIcon } from 'lucide-react';

interface Feature {
  module: string;
  title: string;
  description: string;
  result: string;
  icon: LucideIcon;
  tone: 'violet' | 'cyan' | 'rose';
}

const FEATURES: Feature[] = [
  {
    module: 'MODULE 01',
    title: 'AI 音乐生成',
    description: '描述画面与情绪，快速生成 44.1kHz 立体声音乐。',
    result: '输入描述  →  生成音乐',
    icon: Music2,
    tone: 'violet',
  },
  {
    module: 'MODULE 02',
    title: '复古桌面体验',
    description: '在 Windows 95 风格桌面中，像使用老电脑一样打开创作工具。',
    result: '进入桌面  →  双击开工',
    icon: MonitorCog,
    tone: 'cyan',
  },
  {
    module: 'MODULE 03',
    title: '历史与回收站',
    description: '作品自动留存，可随时播放、下载，或从回收站恢复。',
    result: '播放  ·  下载  ·  还原',
    icon: ArchiveRestore,
    tone: 'rose',
  },
];

export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <div className="landing-grid" />
      <div className="landing-inner">
        <div className="landing-badge">AI MUSIC GENERATOR</div>

        <h1 className="landing-title">
          RETRO<span className="landing-title-accent">MUSIC</span>
        </h1>
        <p className="landing-sub">
          在 80 年代复古桌面里，<br />
          用一句话生成你的专属音乐
        </p>

        <div className="landing-features">
          {FEATURES.map(({ module, title, description, result, icon: Icon, tone }) => (
            <article className={`landing-feature landing-feature--${tone}`} key={module}>
              <div className="landing-feature-bar">
                <span>{module}</span>
                <span className="landing-feature-status"><i /> READY</span>
              </div>
              <div className="landing-feature-main">
                <span className="landing-feature-icon" aria-hidden="true">
                  <Icon size={25} strokeWidth={1.7} />
                </span>
                <div>
                  <h2 className="landing-feature-title">{title}</h2>
                  <p className="landing-feature-desc">{description}</p>
                </div>
              </div>
              <div className="landing-feature-result">{result}</div>
            </article>
          ))}
        </div>

        <button className="landing-cta" onClick={onEnter}>
          进入创作台 <span className="landing-cta-blink">▮</span>
        </button>

        <div className="landing-foot">
          Powered by fal.ai · CassetteAI
        </div>
      </div>
    </div>
  );
}
