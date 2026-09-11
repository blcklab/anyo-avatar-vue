import { cp, mkdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'

await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true })
const result = spawnSync('tsc', ['-p', 'tsconfig.json'], { cwd: new URL('..', import.meta.url), stdio: 'inherit', shell: true })
if (result.status !== 0) process.exit(result.status ?? 1)
await mkdir(new URL('../dist/', import.meta.url), { recursive: true })
await cp(new URL('../src/style.css', import.meta.url), new URL('../dist/style.css', import.meta.url))
