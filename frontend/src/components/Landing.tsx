export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <div className="landing-grid" />
      <div className="landing-inner">
        <div className="landing-badge">AI MUSIC GENERATOR · 纯音乐</div>

        <h1 className="landing-title">
          RETRO<span className="landing-title-accent">MUSIC</span>
        </h1>
        <p className="landing-sub">
          在 80 年代复古桌面里，<br />
          用一句话生成你的专属纯音乐
        </p>

        <div className="landing-features">
          <div className="landing-feature">
            <span className="landing-feature-icon">🎵</span>
            <div>
              <div className="landing-feature-title">AI 音乐生成</div>
              <div className="landing-feature-desc">描述画面与情绪，秒出 44.1kHz 立体声</div>
            </div>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">🖥️</span>
            <div>
              <div className="landing-feature-title">复古桌面体验</div>
              <div className="landing-feature-desc">Windows 95 风格窗口，双击图标开工</div>
            </div>
          </div>
          <div className="landing-feature">
            <span className="landing-feature-icon">📼</span>
            <div>
              <div className="landing-feature-title">历史与回收站</div>
              <div className="landing-feature-desc">生成记录可播放、下载、还原</div>
            </div>
          </div>
        </div>

        <button className="landing-cta" onClick={onEnter}>
          进入创作台 <span className="landing-cta-blink">▮</span>
        </button>

        <div className="landing-foot">
          Powered by fal.ai · CassetteAI — 本地运行 · 按次付费
        </div>
      </div>
    </div>
  );
}
