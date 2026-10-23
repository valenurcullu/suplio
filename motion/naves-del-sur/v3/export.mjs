import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { frames, renders, reports } from './paths.mjs';

const run = promisify(execFile);
await fs.mkdir(renders, { recursive: true });
await fs.mkdir(reports, { recursive: true });
// Regenerated exports never overwrite the approved master in masters/.
const output = path.join(renders, 'Naves del Sur - Motion Showcase V3 - render.mp4');
await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-i', path.join(frames, '%05d.png'), '-frames:v', '378', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-threads', '4', '-movflags', '+faststart', output]);
await fs.copyFile(path.join(frames, '00000.png'), path.join(renders, 'poster.png'));
const info = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', output])).stdout);
const video = info.streams.find(s => s.codec_type === 'video');
if (info.streams.some(s => s.codec_type === 'audio') || video.width !== 1280 || video.height !== 720 || video.avg_frame_rate !== '30/1' || Math.abs(Number(info.format.duration) - 12.6) > .01) throw new Error('Unexpected export format');
const report = { output, bytes: (await fs.stat(output)).size, width: video.width, height: video.height, fps: video.avg_frame_rate, duration: Number(info.format.duration), audio: false, settings: 'H.264 CRF 18, slow, yuv420p, faststart' };
await fs.writeFile(path.join(reports, 'render-export.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
