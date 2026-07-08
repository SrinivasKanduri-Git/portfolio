/**
 * Cut the four per-theme Docucaine hero clips from the raw screencast.
 *
 * Source: `Screencast from 2026-07-08 08-13-24.webm` (VP8, 1850x925, 41.8s) — a single
 * take that walks through all four live themes, each introduced by its own branded loader
 * ("Entering the Orbit / Matrix / Dunes / Neon Arc"). We slice one clip per theme, each
 * beginning on its loader so the intro replays every loop, re-encode to web-quality H.264,
 * and grab a poster from the first post-loader (stable) frame.
 *
 * Run: `node scripts/cut-docucaine.mjs`  (needs the webm at repo root)
 * Overwrites public/assets/docucaine/{theme}.mp4 and {theme}.jpg.
 */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import ffmpegPath from 'ffmpeg-static';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'Screencast from 2026-07-08 08-13-24.webm');
const OUT = join(root, 'public/assets/docucaine');

if (!existsSync(SRC)) {
  console.error(`Source screencast not found:\n  ${SRC}`);
  process.exit(1);
}

// [start, end] in seconds — clip opens on the loader, runs through the stable theme.
// poster: a stable (post-loader) timestamp for the still frame.
const THEMES = [
  { name: 'starry',  start: 2.7,  end: 10.6, poster: 4.2 },
  { name: 'matrix',  start: 10.6, end: 16.5, poster: 12.0 },
  { name: 'francis', start: 16.5, end: 26.3, poster: 18.5 },
  { name: 'neonarc', start: 26.3, end: 41.8, poster: 28.0 },
];

const SCALE = 'scale=1600:-2'; // web-quality, even height, preserves 2:1 aspect

const run = (args) => execFileSync(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'inherit'] });

for (const { name, start, end, poster } of THEMES) {
  const dur = (end - start).toFixed(3);
  const mp4 = join(OUT, `${name}.mp4`);
  const jpg = join(OUT, `${name}.jpg`);

  console.log(`→ ${name}: clip ${start}–${end}s (${dur}s) + poster @ ${poster}s`);

  run([
    '-y', '-ss', String(start), '-i', SRC, '-t', dur,
    '-vf', `${SCALE},format=yuv420p`,
    '-an',
    '-c:v', 'libx264', '-profile:v', 'high', '-crf', '20', '-preset', 'slow',
    '-movflags', '+faststart',
    mp4,
  ]);

  run([
    '-y', '-ss', String(poster), '-i', SRC, '-frames:v', '1',
    '-vf', SCALE,
    '-q:v', '3',
    jpg,
  ]);
}

console.log('done — 4 clips + posters written to public/assets/docucaine/');
