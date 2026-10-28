import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
const root = path.dirname(fileURLToPath(import.meta.url)), project = path.resolve(root, '../../..');
const child = spawn(process.execPath, [path.join(project, 'web/node_modules/astro/bin/astro.mjs'), 'build', '--config', path.relative(path.join(project, 'web'), path.join(root, 'astro.config.mjs')), '--outDir', path.join(project, '.production/typography-portal/hero-site')], { cwd: path.join(project, 'web'), stdio: 'inherit', env: { ...process.env, PUBLIC_DEPLOY_TARGET: 'netlify' } });
child.on('exit', code => process.exitCode = code ?? 1);
