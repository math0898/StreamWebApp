import express from 'express'

const app = express()
const PORT = 3302

let count = 0
const clients = new Set()

app.use(express.json())

// SSE endpoint — overlay connects here to receive live updates
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  // Send current state to the newly connected client
  res.write(`data: ${JSON.stringify({ count })}\n\n`)

  clients.add(res)
  req.on('close', () => clients.delete(res))
  req.on('error', () => clients.delete(res))
})

// POST endpoint — dashboard sends counter updates here
app.post('/api/counter', (req, res) => {
  const incoming = req.body?.count
  if (typeof incoming === 'number') {
    count = incoming
    const payload = `data: ${JSON.stringify({ count })}\n\n`
    for (const client of clients) {
      client.write(payload)
    }
  }
  res.json({ count })
})

app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`)
})
