import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = path.dirname(fileURLToPath(import.meta.url));
export const project = path.resolve(root, '../../..');
export const production = path.join(project, '.production/naves-del-sur');
export const frames = path.join(production, 'intermediates/v3/frames');
export const review = path.join(production, 'intermediates/v3/review');
export const reports = path.join(production, 'reports/v3');
export const renders = path.join(production, 'renders');
export const master = path.join(production, 'masters/Naves del Sur - Motion Showcase V3.mp4');
export const masterPoster = path.join(production, 'masters/poster.png');
export const delivery = path.join(project, 'web/public/projects/naves-del-sur/motion');
export const movie = path.join(delivery, 'motion-showcase-v3.mp4');
export const poster = path.join(delivery, 'poster.webp');
