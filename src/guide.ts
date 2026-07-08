/**
 * The crew: a stick figure in the page corner that answers questions by
 * holding up a hand-lettered placard. No chat log, no bubbles, no persona.
 * Pure local intent matching with a strict relevance threshold — anything
 * off-topic gets a plain refusal and a redirect.
 */

import { figure, IDLE, PRESENT } from './figures';

type Card = {
  keys: string[];
  title: string;
  body: string;
  tags: string[];
};

const A = (href: string, text: string) =>
  `<a href="${href}" target="_blank" rel="noopener">${text}</a>`;

const CARDS: Card[] = [
  {
    keys: ['who', 'about', 'srinivas', 'himself', 'intro', 'summary', 'background'],
    title: 'The engineer',
    body:
      'Srinivas Kanduri — backend engineer in Visakhapatnam, India. ~1.5 years of ' +
      'full-time production work in Ruby on Rails with MongoDB and AWS, plus a ' +
      '3-month internship before that. Builds daily with AI coding agents and owns ' +
      'full product cycles from architecture to deployment.',
    tags: ['projects', 'skills', 'contact'],
  },
  {
    keys: ['projects', 'built', 'building', 'portfolio', 'work on', 'side project', 'platforms'],
    title: 'Three scenes',
    body:
      'SC.01 — The AI Reporter, an autonomous news platform. SC.02 — RubySkope, a ' +
      'Rails Engine gem for user-activity tracing. SC.03 — Docucaine, a document ' +
      'ingestion and spatial editing platform, live at ' +
      A('https://www.docucaine.co.in', 'docucaine.co.in') +
      '. Each owned end to end.',
    tags: ['docucaine', 'rubyskope', 'ai reporter'],
  },
  {
    keys: ['docucaine', 'document', 'canvas', 'finale'],
    title: 'SC.03 — Docucaine',
    body:
      'Document ingestion and spatial editing: DOCX, XLSX, PDF, PPTX and more parsed ' +
      'into structured blocks on a drag-and-resize canvas. Srinivas owns the product ' +
      'architecture, sprint planning and technical direction. Live and in active ' +
      'development at ' + A('https://www.docucaine.co.in', 'docucaine.co.in') + '.',
    tags: ['rubyskope', 'skills', 'contact'],
  },
  {
    keys: ['rubyskope', 'gem', 'engine', 'activity', 'tracking', 'observability'],
    title: 'SC.02 — RubySkope',
    body:
      'A dual-ORM Rails Engine gem (ActiveRecord + Mongoid) for user activity ' +
      'intelligence: HTTP requests, background jobs, model diffs and exceptions, ' +
      'ingested async through middleware with thread-local context. Ships its own ' +
      'BCrypt-secured admin portal with zero host-app coupling. In progress. ' +
      A('https://github.com/SrinivasKanduri-Git/rubyskope', 'Source on GitHub') + '.',
    tags: ['docucaine', 'ai reporter', 'skills'],
  },
  {
    keys: ['reporter', 'news', 'autonomous', 'groq', 'pgvector', 'rag'],
    title: 'SC.01 — The AI Reporter',
    body:
      'An India-first autonomous news platform with zero human editorial ' +
      'intervention; Srinivas is sole architect and product owner. FastAPI + ' +
      'Next.js 14 on Oracle Cloud free tier, pgvector/Supabase semantic search with ' +
      'multilingual sentence-transformer embeddings, Groq as primary LLM. In ' +
      'progress. ' +
      A('https://github.com/SrinivasKanduri-Git/The-Ai-Reporter', 'Source on GitHub') + '.',
    tags: ['rubyskope', 'docucaine', 'skills'],
  },
  {
    keys: ['experience', 'fleetenable', 'imaginnovate', 'company', 'employer', 'singular', 'worked', 'job'],
    title: 'Production credits',
    body:
      'Software Engineer I at Imaginnovate Tech Solutions (Feb 2025 – present), on ' +
      'FleetEnable, a logistics TMS: warehouse management, delivery operations, ' +
      'third-party integrations and Billing/Invoice work in Rails, MongoDB, AWS. ' +
      'Before that: Trainee there (Doorkeeper auth, Pundit policies), and a Rails ' +
      'internship at Singular.dev in 2022–23.',
    tags: ['skills', 'projects', 'contact'],
  },
  {
    keys: ['skills', 'stack', 'tech', 'technologies', 'tools', 'framework', 'languages'],
    title: 'Equipment list',
    body:
      'Backend: Ruby on Rails, RESTful APIs, ActiveRecord, Sidekiq, ActiveJob. ' +
      'Databases: MongoDB (Mongoid), PostgreSQL, Redis, SQLite3. Cloud & DevOps: ' +
      'AWS, Docker, CI/CD, GitHub Actions, Jenkins. Frontend: React, HTML5, CSS3. ' +
      'Testing: RSpec, Minitest. AI tooling: Claude Code, Claude Skills, Cursor, ' +
      'Lovable, Google Stitch, AI Studio.',
    tags: ['ai tools', 'projects', 'experience'],
  },
  {
    keys: ['ai tools', 'claude', 'cursor', 'lovable', 'stitch', 'agents', 'ai-assisted'],
    title: 'AI on the crew',
    body:
      'Srinivas applies AI coding agents in daily production work: Claude Code for ' +
      'architecture, implementation and debugging, custom Claude Skills for ' +
      'token-efficient refactoring, plus Cursor, Lovable, Google Stitch and AI ' +
      'Studio. RubySkope was built end to end this way.',
    tags: ['skills', 'projects', 'contact'],
  },
  {
    keys: ['education', 'degree', 'college', 'certification', 'certificate', 'btech', 'study', 'upgrad', 'microsoft'],
    title: 'Papers on file',
    body:
      'B.Tech in Computer Science, DRK Institute of Science and Technology, ' +
      'Hyderabad. Generative AI Foundations Certificate — upGrad × Microsoft, ' +
      'completed April 2026. Full Stack Java Developer course, Naresh IT. DevOps ' +
      'certification (Jenkins, Docker, AWS) in progress.',
    tags: ['skills', 'experience', 'contact'],
  },
  {
    keys: ['contact', 'email', 'phone', 'reach', 'hire', 'hiring', 'connect', 'available', 'resume'],
    title: 'Reach him',
    body:
      A('mailto:srinivaskanduri03@gmail.com', 'srinivaskanduri03@gmail.com') +
      ' · +91 63056 89291 · ' +
      A('https://github.com/SrinivasKanduri-Git', 'GitHub') + ' · ' +
      A('https://linkedin.com/in/srinivas-kanduri', 'LinkedIn') +
      '. Open to backend, AI-assisted engineering and DevOps-leaning roles.',
    tags: ['projects', 'skills', 'experience'],
  },
  {
    keys: ['location', 'where', 'based', 'city', 'india', 'remote', 'relocate'],
    title: 'On location',
    body: 'Visakhapatnam, India. Comfortable working with distributed teams.',
    tags: ['contact', 'experience', 'projects'],
  },
];

const REFUSAL: Card = {
  keys: [],
  title: 'Off script',
  body:
    "I'm sorry, I can't help you with that. Would you like to know more about " +
    "Srinivas' projects or skills?",
  tags: ['projects', 'skills', 'contact'],
};

const OPENER: Card = {
  keys: [],
  title: 'Ask the crew',
  body:
    'Questions about Srinivas — projects, experience, skills, certifications, ' +
    'contact — get answered on this placard. Anything else stays off script.',
  tags: ['projects', 'skills', 'contact'],
};

/** Strict matcher: distinctive keywords only, and a minimum score so vague or
 *  off-topic questions fall through to the refusal. */
function match(text: string): Card {
  const q = ' ' + text.toLowerCase().trim() + ' ';
  let best: Card | null = null;
  let bestScore = 0;
  for (const card of CARDS) {
    let score = 0;
    for (const k of card.keys) {
      if (q.includes(k)) score += k.length >= 8 ? 5 : k.length >= 5 ? 3 : 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return bestScore >= 3 && best ? best : REFUSAL;
}

export function initGuide(reduceMotion: boolean): void {
  const root = document.getElementById('crew')!;
  const toggle = document.getElementById('crew-toggle') as HTMLButtonElement;
  const desk = document.getElementById('crew-desk')!;
  const card = document.getElementById('crew-card')!;
  const cardTitle = document.getElementById('crew-card-title')!;
  const cardBody = document.getElementById('crew-card-body')!;
  const tagsEl = document.getElementById('crew-tags')!;
  const form = document.getElementById('crew-form') as HTMLFormElement;
  const input = document.getElementById('crew-input') as HTMLInputElement;
  const figIdle = document.getElementById('crew-fig-idle')!;
  const figUp = document.getElementById('crew-fig-up')!;

  figIdle.innerHTML = `<svg viewBox="0 0 80 120" aria-hidden="true">${figure(IDLE)}</svg>`;
  figUp.innerHTML = `<svg viewBox="0 0 80 120" aria-hidden="true">${figure(PRESENT)}</svg>`;

  let timer = 0;

  function setTags(tags: string[]) {
    tagsEl.innerHTML = '';
    for (const t of tags) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = t;
      b.addEventListener('click', () => answer(t));
      tagsEl.appendChild(b);
    }
  }

  /** Replace the placard content — typewriter reveal, then full HTML (links). */
  function show(c: Card) {
    window.clearInterval(timer);
    root.classList.add('holding');
    cardTitle.textContent = c.title;

    const tmp = document.createElement('div');
    tmp.innerHTML = c.body;
    const plain = tmp.textContent || '';

    if (reduceMotion) {
      cardBody.innerHTML = c.body;
      setTags(c.tags);
      return;
    }
    setTags([]);
    let i = 0;
    const step = Math.max(3, Math.round(plain.length / 40));
    timer = window.setInterval(() => {
      i += step;
      if (i >= plain.length) {
        window.clearInterval(timer);
        cardBody.innerHTML = c.body;
        setTags(c.tags);
      } else {
        cardBody.textContent = plain.slice(0, i);
      }
    }, 24);
  }

  function answer(text: string) {
    if (!text.trim()) return;
    show(match(text));
  }

  function open() {
    root.classList.add('open');
    toggle.setAttribute('aria-expanded', 'true');
    desk.hidden = false;
    if (!card.dataset.shown) {
      card.dataset.shown = '1';
      show(OPENER);
    }
    input.focus();
  }

  function close() {
    root.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
    desk.hidden = true;
  }

  toggle.addEventListener('click', () => (desk.hidden ? open() : close()));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !desk.hidden) close();
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value;
    input.value = '';
    answer(v);
  });
}
