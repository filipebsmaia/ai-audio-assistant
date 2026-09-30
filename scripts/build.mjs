// Build: limpa dist/, compila main+preload e renderer, e copia os arquivos estáticos da UI.
import { cpSync, rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

const run = (command) => execSync(command, { stdio: 'inherit' });

rmSync('dist', { recursive: true, force: true });
run('tsc -p .');
run('tsc -p src/renderer');
for (const file of ['index.html', 'styles.css']) cpSync(`src/renderer/${file}`, `dist/renderer/${file}`);
