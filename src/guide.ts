/**
 * The crew: a glass command palette in the page corner that answers questions
 * on a placard. No chat log, no bubbles, no persona. Pure local intent
 * matching with a strict relevance threshold — anything off-topic gets a
 * plain refusal and a redirect.
 */

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
    keys: ['who', 'about him', 'about srinivas', 'srinivas', 'himself', 'intro', 'summary', 'background'],
    title: 'The engineer',
    body:
      'Srinivas Kanduri — backend engineer in Visakhapatnam, India. Two years of ' +
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
      A('https://linkedin.com/in/srinivas-kanduri-47658b250', 'LinkedIn') +
      '. Open to backend, AI-assisted engineering and DevOps-leaning roles.',
    tags: ['projects', 'skills', 'experience'],
  },
  {
    keys: ['location', 'where', 'based', 'city', 'india'],
    title: 'On location',
    body: 'Visakhapatnam, India. Comfortable working with distributed teams.',
    tags: ['contact', 'experience', 'projects'],
  },
  {
    keys: ['story', 'journey', 'started', 'passion', 'why programming', 'origin', 'began', 'into coding'],
    title: 'Origin story',
    body:
      'Programming pulled him in early — the joy of writing logic and brainstorming ' +
      'through complex problems. That instinct still drives how he builds: understand ' +
      'the problem deeply, then engineer the cleanest path through it.',
    tags: ['work style', 'goals', 'projects'],
  },
  {
    keys: ['ai driven', 'ai-driven', 'beyond', 'why ai', 'architect', 'one framework', 'polyglot'],
    title: 'Beyond one stack',
    body:
      'Rails is home base, but AI-assisted engineering removed the fences: he has ' +
      'shipped applications on Vite, Next.js and Python — stacks he hadn’t formally ' +
      'worked in — by thinking like an architect and problem-solver first, and a ' +
      'framework specialist second.',
    tags: ['skills', 'ai tools', 'goals'],
  },
  {
    keys: ['goal', 'goals', 'future', 'years', 'ambition', 'vision', 'aspiration', 'long term'],
    title: 'The long arc',
    body:
      'Over the next 3–5 years: grow Docucaine from a live product into a ' +
      'company-grade platform, keep pace with AI as it evolves, and keep raising the ' +
      'bar on the software he ships.',
    tags: ['docucaine', 'ai tools', 'work style'],
  },
  {
    keys: ['work style', 'working style', 'culture', 'values', 'personality', 'collaborate', 'team player', 'introvert'],
    title: 'On set behaviour',
    body:
      'A focused, low-noise teammate: plans first, ships a working solution, then ' +
      'optimizes and scales — no compromise on quality. Colleagues know him as ' +
      'quietly reliable: heads-down, collaborative when it counts. Daily AI toolkit: ' +
      'Claude Code for architecture, implementation and debugging, custom Claude ' +
      'Skills, Cursor, Lovable, Google Stitch and AI Studio.',
    tags: ['ai tools', 'skills', 'goals'],
  },
  {
    keys: ['hobby', 'hobbies', 'book', 'evidence', 'writer', 'writing', 'film', 'filmmaking', 'screenplay', 'outside', 'fun fact'],
    title: 'Off set',
    body:
      'Writer and filmmaker. He wrote and self-published <em>Evidence</em>, an ' +
      'investigative thriller, and writes screenplays — he’s currently adapting ' +
      'Evidence for film. The storytelling instinct shows on this very set: every ' +
      'project here is staged like a production.',
    tags: ['projects', 'work style', 'contact'],
  },
  {
    keys: ['notice', 'notice period', 'relocate', 'relocation', 'remote', 'onsite', 'hybrid', 'hyderabad', 'bangalore', 'when can he join'],
    title: 'Booking the crew',
    body:
      'Notice period: 90 days. Remote-first by preference; open to onsite in ' +
      'Hyderabad (first choice) or Bangalore. For anything else, reach him directly ' +
      'at ' + A('mailto:srinivaskanduri03@gmail.com', 'srinivaskanduri03@gmail.com') + '.',
    tags: ['contact', 'experience', 'work style'],
  },
];

/** Reached ONLY via the salary hard rule — never part of intent matching. */
const SALARY_CARD: Card & { lead?: string } = {
  keys: [],
  title: 'Above the line',
  body:
    'Compensation is a conversation Srinivas keeps for the negotiating table — ' +
    'this placard doesn’t quote numbers. Reach him at ' +
    A('mailto:srinivaskanduri03@gmail.com', 'srinivaskanduri03@gmail.com') +
    ' and he’ll be glad to discuss.',
  tags: ['contact', 'experience', 'projects'],
};

const REFUSAL: Card = {
  keys: [],
  title: 'Off script',
  body:
    'That one’s outside my script — I only know Srinivas. Want the projects, ' +
    'the skills, or how to reach him?',
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

// ── tone layer ───────────────────────────────────────────────────────────────
export type Tone = 'greeting' | 'thanks' | 'rude' | 'goodbye' | 'neutral';

const TONE_RES: [Tone, RegExp][] = [
  ['rude', /\b(stupid|dumb|suck(s|ed)?|trash|garbage|useless|terrible|worst|hate|crap|bullshit|boring|lame)\b/i],
  ['greeting', /\b(hi|hii+|hello|hey|yo|howdy|namaste|good\s(morning|afternoon|evening))\b/i],
  ['thanks', /\b(thanks|thank you|thx|ty|appreciated?)\b/i],
  ['goodbye', /\b(bye|goodbye|see\s?ya|later|good\s?night)\b/i],
];

export function detectTone(text: string): Tone {
  for (const [tone, re] of TONE_RES) if (re.test(text)) return tone;
  return 'neutral';
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;

const LEADS: Record<Exclude<Tone, 'neutral'>, string[]> = {
  greeting: ['Hey, welcome to the set!', 'Hello! Glad you dropped by.', 'Hey there — good to see you on set.'],
  thanks: ['Anytime!', 'Happy to help.', 'My pleasure — that’s what the crew is for.'],
  rude: ['Fair enough — everyone’s a critic. Still happy to help.', 'Noted! Opinions welcome on this set. What can I show you?'],
  goodbye: ['Thanks for stopping by the studio.', 'That’s a wrap on this chat — come back anytime.'],
};

// ── salary hard rule: always deflects, never quotes numbers ──────────────────
const SALARY_RE = /\b(salary|ctc|compensation|pay|paid|package|remuneration|hike|lpa|earn(s|ing)?)\b/i;

// ── fuzzy matching ───────────────────────────────────────────────────────────
/** true when a and b are within one edit (insert/delete/replace) — but a bare
 *  prefix extension ("write" → "writer") is a different word, not a typo. */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length !== b.length) {
    const [short, long] = a.length < b.length ? [a, b] : [b, a];
    if (long.startsWith(short)) return false;
  }
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** Query-side synonyms folded into the text before matching. */
const SYNONYMS: Record<string, string> = {
  cv: 'resume',
  bio: 'about',
  mail: 'email',
  ping: 'contact',
  novel: 'book',
  author: 'book',
  movie: 'film',
  cinema: 'film',
  joining: 'notice',
  availability: 'notice',
  wfh: 'remote',
  team: 'work style',
  teammate: 'work style',
  colleagues: 'work style',
};

/** Strict matcher: distinctive keywords with a minimum score so vague or
 *  off-topic questions fall through to the refusal. Single-word keys of 5+
 *  chars also match within one typo (edit distance ≤ 1). */
function match(text: string): Card {
  let q = ' ' + text.toLowerCase().trim() + ' ';
  for (const [syn, canon] of Object.entries(SYNONYMS)) {
    if (new RegExp(`\\b${syn}\\b`).test(q)) q += canon + ' ';
  }
  const words = q.split(/[^a-z0-9.-]+/).filter((w) => w.length >= 5);
  let best: Card | null = null;
  let bestScore = 0;
  for (const card of CARDS) {
    let score = 0;
    for (const k of card.keys) {
      const hit =
        q.includes(k) ||
        (k.length >= 5 && !k.includes(' ') && words.some((w) => near(w, k)));
      if (hit) score += k.length >= 8 ? 5 : k.length >= 4 ? 3 : 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return bestScore >= 3 && best ? best : REFUSAL;
}

/**
 * The full reply pipeline: salary hard rule → tone detection → intent match.
 * Small talk with no real question gets a tone-matched lead on the opener;
 * a question with a tone (e.g. "hey! what are his skills?") gets both.
 */
export function composeReply(text: string): Card & { lead?: string } {
  if (SALARY_RE.test(text)) return SALARY_CARD;
  const tone = detectTone(text);
  const toneRe = TONE_RES.find(([t]) => t === tone)?.[1];
  const stripped = toneRe ? text.replace(toneRe, ' ') : text;
  const hit = match(stripped);
  const lead = tone !== 'neutral' ? pick(LEADS[tone]) : undefined;
  if (hit === REFUSAL && tone !== 'neutral') {
    return { ...OPENER, title: tone === 'rude' ? 'Take it on the chin' : 'Ask the crew', lead };
  }
  return { ...hit, lead };
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

  /** Replace the placard content — typewriter reveal, then full HTML (links).
   *  A tone lead (greeting/thanks/…) lands bold ahead of the body. */
  function show(c: Card & { lead?: string }) {
    window.clearInterval(timer);
    root.classList.add('holding');
    cardTitle.textContent = c.title;

    const html = c.lead ? `<strong>${c.lead}</strong> ${c.body}` : c.body;
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    const plain = tmp.textContent || '';

    if (reduceMotion) {
      cardBody.innerHTML = html;
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
        cardBody.innerHTML = html;
        setTags(c.tags);
      } else {
        cardBody.textContent = plain.slice(0, i);
      }
    }, 24);
  }

  function answer(text: string) {
    if (!text.trim()) return;
    show(composeReply(text));
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
