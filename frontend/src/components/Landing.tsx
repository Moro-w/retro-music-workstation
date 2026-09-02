export default function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <main className="landing landing-classic">
      <div className="landing-classic-grid" aria-hidden="true" />

      <section className="landing-classic-inner" aria-labelledby="landing-title">
        <div className="landing-classic-badge">AI MUSIC GENERATOR</div>

        <h1 id="landing-title" className="landing-classic-title">
          RETRO<span>MUSIC</span>
        </h1>

        <p className="landing-classic-subtitle">
          在 80 年代复古桌面里，
          <br />
          用一句话生成你的专属音乐
        </p>

        <div className="landing-classic-features">
          <article className="landing-classic-feature">
            <span className="landing-classic-icon" aria-hidden="true">🎵</span>
            <div>
              <h2>AI 音乐生成</h2>
              <p>描述画面与情绪，秒出<br />44.1kHz 立体声</p>
            </div>
          </article>

          <article className="landing-classic-feature">
            <span className="landing-classic-icon" aria-hidden="true">🖥️</span>
            <div>
              <h2>复古桌面体验</h2>
              <p>Windows 95 风格窗口，双击图标开工</p>
            </div>
          </article>

          <article className="landing-classic-feature">
            <span className="landing-classic-icon" aria-hidden="true">📼</span>
            <div>
              <h2>历史与回收站</h2>
              <p>生成记录可播放、下载、还原</p>
            </div>
          </article>
        </div>

        <button className="landing-classic-cta" onClick={onEnter}>
          进入创作台 <span aria-hidden="true">▎</span>
        </button>
      </section>
    </main>
  );
}
