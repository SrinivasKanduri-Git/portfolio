/**
 * Regenerate the wrap-section resume assets from the source PDF.
 * Usage: node scripts/make-resume-preview.mjs [path/to/resume.pdf]
 * Requires poppler's pdftoppm on PATH; webp via the ffmpeg-static devDep.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, rmSync } from 'node:fs';
import ffmpeg from 'ffmpeg-static';

const src = process.argv[2] ?? 'Srinivas_K_Resume_0607.pdf';

execFileSync('pdftoppm', ['-png', '-r', '150', '-f', '1', '-l', '1', '-singlefile', src, 'public/resume-preview']);
execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', 'public/resume-preview.png', '-quality', '82', 'public/resume-preview.webp']);
rmSync('public/resume-preview.png');
copyFileSync(src, 'public/Srinivas_K_Resume.pdf');
console.log(`public/resume-preview.webp + public/Srinivas_K_Resume.pdf regenerated from ${src}`);
