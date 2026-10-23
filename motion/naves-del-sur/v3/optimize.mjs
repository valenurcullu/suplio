import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createRequire } from 'node:module';
import { master, masterPoster, delivery, movie, poster, reports } from './paths.mjs';

const require = createRequire(new URL('../../../web/package.json', import.meta.url));
const sharp = require('sharp'), run = promisify(execFile);
const option = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const source = path.resolve(option('--source', master));
const sourcePoster = path.resolve(option('--poster', masterPoster));
const crf = Number(option('--crf', '21'));
if (!Number.isInteger(crf) || crf < 18 || crf > 24) throw new Error('CRF must be an integer between 18 and 24');
await fs.mkdir(delivery, { recursive: true });
await fs.mkdir(reports, { recursive: true });
const original = await fs.readFile(source), sourceHash = crypto.createHash('sha256').update(original).digest('hex');
if (source === movie) throw new Error('Source must be a separate high-quality master');
const temporary = path.join(delivery, '.motion-showcase-v3.tmp.mp4');
try {
  await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', source, '-map', '0:v:0', '-an', '-map_metadata', '-1', '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p', '-threads', '4', '-movflags', '+faststart', temporary]);
  const info = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', temporary])).stdout);
  const video = info.streams.find(s => s.codec_type === 'video');
  if (info.streams.some(s => s.codec_type === 'audio') || video.width !== 1280 || video.height !== 720 || video.avg_frame_rate !== '30/1' || Math.abs(Number(info.format.duration) - 12.6) > .01) throw new Error('Unexpected web export format');
  await fs.rename(temporary, movie);
} catch (error) { await fs.rm(temporary, { force: true }); throw error; }
// Lossless WebP preserves the edges and lettering of the official opening logo.
await sharp(sourcePoster).webp({ lossless: true, effort: 6 }).toFile(poster);
const sourceAfter = crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex');
if (sourceHash !== sourceAfter) throw new Error('Master changed');
const bytes = (await fs.stat(movie)).size;
const report = { source, originalBytes: original.length, sourceSha256: sourceHash, movie, bytes, reductionPercent: (1 - bytes / original.length) * 100, posterBytes: (await fs.stat(poster)).size, width: 1280, height: 720, fps: 30, duration: 12.6, audio: false, settings: `H.264 CRF ${crf}, slow, yuv420p, faststart`, posterSettings: 'WebP lossless, original first frame' };
await fs.writeFile(path.join(reports, 'optimization.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
