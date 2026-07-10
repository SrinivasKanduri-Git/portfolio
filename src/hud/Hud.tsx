import { useEffect } from 'react';
import { initGuide } from '../guide';
import { Docucaine } from './Docucaine';

const GITHUB = 'https://github.com/SrinivasKanduri-Git';
const LINKEDIN = 'https://linkedin.com/in/srinivas-kanduri-47658b250';

/** Tiny robot head that matches the SC.01 news-anchor bot — the crew's face. */
function CrewBot() {
  return (
    <svg className="crew-bot" viewBox="0 0 40 40" aria-hidden="true">
      {/* antennae */}
      <line x1="14" y1="9" x2="12" y2="3" stroke="#8b9099" strokeWidth="1.4" />
      <circle className="ant" cx="12" cy="3" r="2" fill="#ffd23f" />
      <line x1="26" y1="9" x2="28" y2="3" stroke="#8b9099" strokeWidth="1.4" />
      <circle className="ant" cx="28" cy="3" r="2" fill="#ffd23f" />
      {/* ears */}
      <rect x="5" y="17" width="4" height="8" rx="1.5" fill="#8b9099" />
      <rect x="31" y="17" width="4" height="8" rx="1.5" fill="#8b9099" />
      {/* head */}
      <rect x="8" y="9" width="24" height="23" rx="7" fill="#c2c6cd" />
      {/* face plate */}
      <rect x="12" y="14" width="16" height="13" rx="4" fill="#20242b" />
      {/* eyes */}
      <circle className="eye" cx="17" cy="20.5" r="3" fill="#ffd23f" />
      <circle className="eye" cx="23" cy="20.5" r="3" fill="#ffd23f" />
    </svg>
  );
}

/** Slate marker for a scene — sits at the top of the scene rail. */
function Slate({ scene, take }: { scene: string; take: string }) {
  return (
    <div className="slate">
      <span><b>SCENE</b>{scene}</span>
      <span><b>TAKE</b>{take}</span>
    </div>
  );
}

export function Hud({ reduceMotion }: { reduceMotion: boolean }) {
  useEffect(() => {
    // organic scroll reveals — reliable IO, easing/stagger handled in CSS
    const revealables = document.querySelectorAll<HTMLElement>('.reveal');
    if (reduceMotion) {
      revealables.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('in');
              io.unobserve(e.target);
            }
          }
        },
        { threshold: 0.1, rootMargin: '0px 0px -60px 0px' },
      );
      revealables.forEach((el) => io.observe(el));
    }

    // nav backdrop after the top
    const nav = document.getElementById('nav');
    const sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;height:80px;width:1px;pointer-events:none;';
    document.body.prepend(sentinel);
    const navIo = new IntersectionObserver(([entry]) => {
      nav?.classList.toggle('scrolled', !entry!.isIntersecting);
    });
    navIo.observe(sentinel);

    // spine: light the marker of the section currently on screen
    const spineLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.spine a'));
    const byTarget = new Map(spineLinks.map((a) => [a.getAttribute('href')?.slice(1) ?? '', a]));
    const spineIo = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          spineLinks.forEach((a) => a.classList.remove('active'));
          byTarget.get(e.target.id)?.classList.add('active');
        }
      },
      { rootMargin: '-40% 0px -50% 0px' },
    );
    ['top', 'sc1', 'sc2', 'sc3', 'credits', 'equipment', 'papers', 'wrap'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) spineIo.observe(el);
    });

    // the crew (scripted guide)
    initGuide(reduceMotion);

    return () => {
      navIo.disconnect();
      spineIo.disconnect();
      sentinel.remove();
    };
  }, [reduceMotion]);

  const toggleMenu = () => {
    const links = document.getElementById('nav-links');
    const burger = document.getElementById('nav-burger');
    const open = links?.classList.toggle('open');
    burger?.setAttribute('aria-expanded', String(!!open));
    burger?.classList.toggle('is-open', !!open);
  };

  return (
    <>
      <nav className="spine" aria-label="Scenes">
        <a href="#top" title="Cold open"></a>
        <a href="#sc1" title="SC.01 The AI Reporter"></a>
        <a href="#sc2" title="SC.02 RubySkope"></a>
        <a href="#sc3" title="SC.03 Docucaine"></a>
        <a href="#credits" title="Credits"></a>
        <a href="#equipment" title="Equipment"></a>
        <a href="#papers" title="Papers"></a>
        <a href="#wrap" title="Wrap"></a>
      </nav>

      <header className="nav" id="nav">
        <a className="nav-mark" href="#top">S. KANDURI — SOUNDSTAGE</a>
        <nav className="nav-links" id="nav-links" aria-label="Primary">
          <a href="#sc1" onClick={toggleMenu}>Scenes</a>
          <a href="#credits" onClick={toggleMenu}>Credits</a>
          <a href="#equipment" onClick={toggleMenu}>Equipment</a>
          <a href="#papers" onClick={toggleMenu}>Papers</a>
          <a href="#wrap" onClick={toggleMenu}>Wrap</a>
        </nav>
        <div className="nav-social">
          <a href={GITHUB} target="_blank" rel="noopener" aria-label="GitHub"><svg className="ic"><use href="#i-github" /></svg></a>
          <a href={LINKEDIN} target="_blank" rel="noopener" aria-label="LinkedIn"><svg className="ic"><use href="#i-linkedin" /></svg></a>
        </div>
        <button className="nav-burger" id="nav-burger" aria-expanded="false" aria-label="Toggle menu" aria-controls="nav-links" onClick={toggleMenu}>
          <span></span><span></span><span></span>
        </button>
      </header>

      <main id="top">
        {/* ── COLD OPEN ── */}
        <section className="cinematic cold-open">
          <div className="hero-copy">
            <p className="prod-line">PROD. 001 · BACKEND ENGINEER · VISAKHAPATNAM</p>
            <h1 className="hero-name">Srinivas<br />Kanduri</h1>
            <p className="hero-sub">
              Ruby on Rails, MongoDB and AWS in production by day — ~1.5 years of it.
              Three self-built platforms after hours, shipped with AI coding agents on the crew.
            </p>
            <div className="hero-cta">
              <a className="btn" href="#sc1">Roll story</a>
              <a className="btn btn-accent" href="#sc3">Skip to the finale — Docucaine</a>
            </div>
          </div>
        </section>

        {/* ── SC.01 — THE AI REPORTER ── */}
        <section className="cinematic scene" id="sc1">
          <div className="scene-panel reveal">
            <Slate scene="01 — The AI Reporter" take="1" />
            <div className="scene-copy">
              <h2>An autonomous news platform<span className="status"> · in progress</span></h2>
              <p className="lede">
                India-first news intelligence with zero human editorial intervention.
                Sole architect and product owner — every product, stack and AI-pipeline
                decision is his.
              </p>
              <ul className="shotlist">
                <li>FastAPI backend, Next.js 14 frontend.</li>
                <li>Semantic search on pgvector/Supabase with multilingual sentence-transformer embeddings.</li>
                <li>Groq as the primary LLM in the pipeline.</li>
              </ul>
              <div className="props"><span>FastAPI</span><span>Next.js 14</span><span>pgvector</span><span>Supabase</span><span>Groq</span><span>Oracle Cloud</span></div>
              <a className="link-out" href={`${GITHUB}/The-Ai-Reporter`} target="_blank" rel="noopener"><svg className="ic"><use href="#i-github" /></svg> Source on GitHub</a>
            </div>
          </div>
        </section>

        {/* ── SC.02 — RUBYSKOPE ── */}
        <section className="cinematic scene" id="sc2">
          <div className="scene-panel reveal">
            <Slate scene="02 — RubySkope" take="2" />
            <div className="scene-copy">
              <h2>A Rails Engine gem for user-activity intelligence<span className="status"> · in progress</span></h2>
              <p className="lede">
                Mount the engine in any Rails app and every user action becomes
                traceable — with no coupling to the host's auth or infrastructure.
              </p>
              <ul className="shotlist">
                <li>Dual-ORM by design: the same engine runs on ActiveRecord or Mongoid.</li>
                <li>Middleware-driven async ingestion with thread-local request context, JSONB-backed structured storage, diff tracking and XLSX timeline exports.</li>
                <li>Isolated admin portal with BCrypt auth and 5-fail account lockout — fully standalone.</li>
                <li>Built end to end with Claude Code; custom Claude Skills for token-efficient iterative refactoring.</li>
              </ul>
              <div className="props"><span>Ruby on Rails</span><span>Rails Engine</span><span>ActiveRecord</span><span>Mongoid</span><span>JSONB</span></div>
              <a className="link-out" href={`${GITHUB}/rubyskope`} target="_blank" rel="noopener"><svg className="ic"><use href="#i-github" /></svg> Source on GitHub</a>
            </div>
          </div>
        </section>

        {/* ── SC.03 — DOCUCAINE (FINALE) ── */}
        <section className="cinematic scene finale" id="sc3">
          <div className="scene-panel reveal">
            <Slate scene="03 — Docucaine" take="final" />
            <div className="scene-copy">
              <h2>The finale: a document workspace<span className="status status-live"> · live</span></h2>
              <p className="lede">
                Docucaine ingests DOCX, XLSX, PDF, PPTX and more, parses them into
                structured blocks, and puts them on a drag-and-resize spatial canvas.
                Owned end to end — and still in active development.
              </p>
            </div>
          </div>
        </section>

        <div id="cinematic-end" aria-hidden="true"></div>

        {/* ── DOCUCAINE LIVE EMBED ── */}
        <section className="flat finale-embed">
          <Docucaine reduceMotion={reduceMotion} />
          <div className="finale-body">
            <ul className="shotlist">
              <li>Multi-format ingestion: DOCX, XLSX, PDF, PPTX and more, parsed into structured blocks.</li>
              <li>Collaborative drag-and-resize spatial canvas with purpose-built editors per format.</li>
              <li>Product architecture, sprint planning and technical direction — owned end to end.</li>
            </ul>
            <div className="finale-actions">
              <div className="props"><span>Document ingestion</span><span>Spatial canvas</span><span>DOCX · XLSX · PDF · PPTX</span><span>4 hand-built themes</span></div>
              <a className="btn btn-accent" href="https://www.docucaine.co.in" target="_blank" rel="noopener">Open docucaine.co.in <svg className="ic"><use href="#i-arrow" /></svg></a>
            </div>
          </div>
        </section>

        {/* ── CREDITS ── */}
        <section className="flat section" id="credits">
          <div className="sheet-quiet reveal">
            <header className="sheet-head">
              <div className="cell"><span>record</span><b>Experience — production credits</b></div>
              <div className="cell cell-page"><span>role</span><b>Backend Engineer</b></div>
            </header>
            <div className="credits">
              <article className="credit">
                <div className="credit-when">FEB 2025 — PRESENT</div>
                <div className="credit-body">
                  <h3>Software Engineer I <span className="credit-org">· Imaginnovate Tech Solutions</span></h3>
                  <p className="credit-role">FleetEnable — a logistics TMS platform</p>
                  <ul className="shotlist">
                    <li>Built and maintained backend modules for warehouse management, delivery operations and third-party integrations in Ruby on Rails, MongoDB and AWS.</li>
                    <li>Designed RESTful APIs for dispatch teams and external logistics partners; reduced endpoint latency through schema improvements and targeted query optimization.</li>
                    <li>Improved Billing and Invoice architecture; optimized AR reports for clearer shipper-revenue insights.</li>
                    <li>Shipped iteratively in Agile sprints with peer code reviews and AWS deployments.</li>
                  </ul>
                </div>
              </article>
              <article className="credit">
                <div className="credit-when">JUN 2024 — FEB 2025</div>
                <div className="credit-body">
                  <h3>Trainee Software Engineer <span className="credit-org">· Imaginnovate Tech Solutions</span></h3>
                  <ul className="shotlist">
                    <li>Implemented Doorkeeper token-based authentication and Pundit authorization policies across multiple API endpoints.</li>
                    <li>Refactored legacy PDF and XLSX generation into service-class implementations.</li>
                    <li>Hands-on training in MongoDB aggregation pipelines and Mongoid query optimization.</li>
                  </ul>
                </div>
              </article>
              <article className="credit">
                <div className="credit-when">NOV 2022 — FEB 2023</div>
                <div className="credit-body">
                  <h3>Software Developer Intern <span className="credit-org">· Singular.dev</span></h3>
                  <ul className="shotlist">
                    <li>Backend features in a monolithic Rails architecture: API components and cross-stack bug fixes, in Agile cycles alongside senior engineers.</li>
                  </ul>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ── EQUIPMENT ── */}
        <section className="flat section" id="equipment">
          <header className="section-head reveal">
            <p className="eyebrow">EQUIPMENT LIST</p>
            <h2>Only what's been used on set.</h2>
            <p className="section-note">Every item here has production or shipped-project mileage. Nothing padded.</p>
          </header>
          <div className="equipment reveal">
            <div className="equip-row"><span className="equip-label">Backend</span><div className="props"><span>Ruby on Rails</span><span>RESTful APIs</span><span>ActiveRecord</span><span>Sidekiq</span><span>ActiveJob</span></div></div>
            <div className="equip-row"><span className="equip-label">Databases</span><div className="props"><span>MongoDB · Mongoid</span><span>PostgreSQL</span><span>Redis</span><span>SQLite3</span></div></div>
            <div className="equip-row"><span className="equip-label">Cloud &amp; DevOps</span><div className="props"><span>AWS</span><span>Docker</span><span>CI/CD</span><span>Jenkins</span></div></div>
            <div className="equip-row"><span className="equip-label">Frontend</span><div className="props"><span>React</span><span>HTML5</span><span>CSS3</span></div></div>
            <div className="equip-row"><span className="equip-label">AI tooling</span><div className="props"><span>Claude Code</span><span>Claude Skills</span><span>Cursor</span><span>Lovable</span><span>Google Stitch</span><span>AI Studio</span></div></div>
            <div className="equip-row"><span className="equip-label">Testing &amp; practice</span><div className="props"><span>RSpec</span><span>Minitest</span><span>Agile · Scrum/Kanban</span><span>Query optimization</span><span>Service objects</span><span>API design</span></div></div>
          </div>
        </section>

        {/* ── PAPERS ── */}
        <section className="flat section" id="papers">
          <header className="section-head reveal">
            <p className="eyebrow">PAPERS ON FILE</p>
            <h2>Education &amp; certifications.</h2>
          </header>
          <div className="papers">
            <figure className="cert reveal">
              <img src="/assets/genai-cert.jpeg" alt="Generative AI Foundations Certificate awarded to Srinivas Kanduri by upGrad in collaboration with Microsoft" loading="lazy" width={815} height={611} />
              <figcaption>
                <strong>Generative AI Foundations Certificate</strong> — upGrad × Microsoft ·
                completed 12 Apr 2026 · UID CHnEFiKLXy5lSYvj.
                Modules: generative AI fundamentals, prompt engineering, AI-powered research
                and content creation, analysis &amp; presentation, problem-solving, automation.
              </figcaption>
            </figure>
            <ul className="paper-list reveal">
              <li><strong>B.Tech, Computer Science Engineering</strong><span>DRK Institute of Science and Technology, Hyderabad</span></li>
              <li><strong>Full Stack Java Developer</strong><span>Naresh IT</span></li>
              <li><strong>DevOps certification</strong><span>Jenkins, Docker, AWS — in progress</span></li>
            </ul>
          </div>
        </section>

        {/* ── WRAP ── */}
        <section className="flat section wrap" id="wrap">
          <div className="wrap-card reveal">
            <p className="eyebrow">END CREDITS</p>
            <h2>That's a wrap.</h2>
            <p>Open to backend, AI-assisted engineering and DevOps-leaning roles. Based in Visakhapatnam, India — works with teams anywhere.</p>
            <div className="wrap-actions">
              <a className="btn btn-accent" href="mailto:srinivaskanduri03@gmail.com"><svg className="ic"><use href="#i-mail" /></svg> srinivaskanduri03@gmail.com</a>
              <a className="btn" href="tel:+916305689291"><svg className="ic"><use href="#i-phone" /></svg> +91 63056 89291</a>
            </div>
            <div className="wrap-meta">
              <a href={GITHUB} target="_blank" rel="noopener"><svg className="ic"><use href="#i-github" /></svg> GitHub</a>
              <a href={LINKEDIN} target="_blank" rel="noopener"><svg className="ic"><use href="#i-linkedin" /></svg> LinkedIn</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>Directed, animated and built by Srinivas Kanduri. No template.</p>
      </footer>

      {/* ── THE CREW (scripted guide) ── */}
      <aside className="crew" id="crew">
        <div className="crew-desk" id="crew-desk" hidden>
          <div className="crew-card" id="crew-card" role="region" aria-live="polite" aria-label="Answer placard">
            <span className="crew-card-title" id="crew-card-title"></span>
            <p className="crew-card-body" id="crew-card-body"></p>
            <div className="crew-tags" id="crew-tags"></div>
          </div>
          <form className="crew-form" id="crew-form">
            <input id="crew-input" type="text" placeholder="ask about projects, skills, contact…" autoComplete="off" maxLength={160} aria-label="Ask the crew about Srinivas" />
            <button type="submit">ask</button>
          </form>
        </div>
        <button className="crew-toggle" id="crew-toggle" aria-expanded="false" aria-label="Ask the crew about Srinivas">
          <CrewBot />
          <span className="crew-label">ask the crew</span>
        </button>
      </aside>
    </>
  );
}
