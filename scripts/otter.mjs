import { spawnSync } from 'node:child_process'
import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const desktop = path.join(root, 'desktop')
const pnpm = path.join(root, 'node_modules', 'pnpm', 'bin', 'pnpm.cjs')
const localChore = path.join(root, 'target', 'otter-tools', process.platform === 'win32' ? 'chore.exe' : 'chore')
// Nested pnpm scripts add more paths. Remove duplicates to keep cmd.exe
// below its 8191-character environment variable limit on developer machines.
const paths = [path.dirname(realpathSync(process.execPath)), path.join(root, 'node_modules', '.bin'), path.dirname(localChore), ...process.env.PATH.split(path.delimiter)]
process.env.PATH = [...new Set(paths)].join(path.delimiter)

const localClang = path.join(root, 'target', 'otter-tools', 'bindgen', 'clang', 'native')
if (!process.env.LIBCLANG_PATH && existsSync(localClang)) process.env.LIBCLANG_PATH = localClang

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.error) console.error(result.error.message)
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function frontend(...args) {
  run(process.execPath, [pnpm, ...args], desktop)
}

function setup() {
  run(existsSync(localChore) ? localChore : 'chore', ['setup'], root)
}

switch (process.argv[2]) {
  case 'init':
    frontend('install', '--frozen-lockfile', '--ignore-workspace')
    setup()
    break
  case 'dev':
  case 'build:dev':
  case 'build':
  case 'bundle': {
    setup()
    const action = process.argv[2]
    const args = action === 'dev' ? ['dev'] : ['build']
    if (action === 'build') args.push('--no-bundle')
    if (action === 'build:dev') args.push('--debug', '--no-bundle')
    if (action === 'bundle') args.push('--config', '{"bundle":{"createUpdaterArtifacts":false}}')
    frontend('exec', 'tauri', ...args)
    break
  }
  case 'tauri':
    frontend('exec', 'tauri', ...process.argv.slice(3))
    break
  case 'test':
    frontend('run', 'i18n:generate')
    frontend('test')
    break
  case 'check':
    frontend('build')
    run('cargo', ['check', '--locked', '--workspace'], root)
    break
  default:
    throw new Error('Expected init, dev, build, build:dev, bundle, check, tauri, or test')
}
