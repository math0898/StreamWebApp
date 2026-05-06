// Starts both the Express API server and the Vite dev server in parallel.
// Uses only Node.js built-ins — no extra dependencies needed.
import { spawn } from 'child_process'

const procs = [
  spawn('node', ['server/index.js'], { stdio: 'inherit', shell: false }),
  spawn('npm', ['exec', 'vite', '--', '--port', '3301'], { stdio: 'inherit', shell: false }),
]

for (const proc of procs) {
  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      for (const p of procs) p.kill()
      process.exit(code)
    }
  })
}

process.on('SIGINT', () => {
  for (const p of procs) p.kill()
})
