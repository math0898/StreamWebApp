import tmi from 'tmi.js'

const TWITCH_HELIX_BASE = 'https://api.twitch.tv/helix'

let nextIdCounter = 0
function nextMessageId() {
  nextIdCounter = (nextIdCounter + 1) % 1000000
  return `${Date.now()}-${nextIdCounter}`
}

class ChatManager {
  constructor() {
    this.connections = new Map()
    this.buffers = new Map()
  }

  async connect(mod, moduleId, onMessage) {
    const channel = mod.channel.toLowerCase().replace(/^#/, '')
    if (!channel) return false

    const messageLimit = typeof mod.messageLimit === 'number' && mod.messageLimit > 0
      ? Math.floor(mod.messageLimit) : 50

    this.buffers.set(moduleId, {
      channel,
      messages: [],
      messageLimit,
      onMessage,
      platform: mod.platform || 'twitch',
    })

    if (this.connections.has(channel)) {
      const conn = this.connections.get(channel)
      // If this module has credentials and existing connection doesn't, upgrade badge map
      if (mod.clientId && mod.accessToken && !conn.badgeMapFetched) {
        try {
          conn.badgeMap = await this.fetchBadgeMap(channel, mod.clientId, mod.accessToken)
          conn.badgeMapFetched = true
        } catch (err) {
          console.warn(`[chat] Failed to fetch badges for #${channel}: ${err.message}`)
        }
      }
      return conn.status === 'connected' || conn.status === 'connecting'
    }

    let badgeMap = {}
    let badgeMapFetched = false
    if (mod.clientId && mod.accessToken) {
      try {
        badgeMap = await this.fetchBadgeMap(channel, mod.clientId, mod.accessToken)
        badgeMapFetched = true
      } catch (err) {
        console.warn(`[chat] Failed to fetch badges for #${channel}: ${err.message}`)
      }
    }

    const identity = {}
    if (mod.accessToken) {
      identity.password = `oauth:${mod.accessToken}`
    }

    const client = new tmi.Client({
      options: { debug: false },
      identity,
      channels: [channel],
    })

    client.on('message', (_channel, userstate, message) => {
      const conn = this.connections.get(channel)
      const currentBadgeMap = conn?.badgeMap ?? badgeMap
      const msg = {
        id: nextMessageId(),
        platform: mod.platform || 'twitch',
        username: userstate['display-name'] || userstate.username || 'Unknown',
        message,
        messageParts: this.parseEmotes(message, userstate.emotes || {}),
        color: userstate.color || '#ffffff',
        badges: userstate.badges || {},
        badgeUrls: this.resolveBadgeUrls(currentBadgeMap, userstate.badges || {}),
        timestamp: Date.now(),
        isAction: userstate['message-type'] === 'action',
      }

      for (const [mid, buf] of this.buffers) {
        if (buf.channel === channel) {
          buf.messages.push(msg)
          while (buf.messages.length > buf.messageLimit) buf.messages.shift()
          buf.onMessage(msg, mid)
        }
      }
    })

    client.on('connected', () => {
      const conn = this.connections.get(channel)
      if (conn) conn.status = 'connected'
      console.log(`[chat] Connected to #${channel}`)
    })

    client.on('disconnected', (reason) => {
      const conn = this.connections.get(channel)
      if (conn) conn.status = 'disconnected'
      console.log(`[chat] Disconnected from #${channel}: ${reason}`)
    })

    try {
      await client.connect()
    } catch (err) {
      console.error(`[chat] Failed to connect to #${channel}:`, err)
      this.buffers.delete(moduleId)
      return false
    }

    this.connections.set(channel, { client, badgeMap, badgeMapFetched, status: 'connected' })
    return true
  }

  disconnect(moduleId) {
    const buf = this.buffers.get(moduleId)
    if (!buf) return
    this.buffers.delete(moduleId)

    const channel = buf.channel
    const hasOther = [...this.buffers.values()].some(b => b.channel === channel)
    if (!hasOther) {
      const conn = this.connections.get(channel)
      if (conn) {
        try { conn.client.disconnect() } catch {}
        this.connections.delete(channel)
        console.log(`[chat] Disconnected from #${channel} (no more modules)`)
      }
    }
  }

  disconnectAll() {
    for (const [channel, conn] of this.connections) {
      try { conn.client.disconnect() } catch {}
    }
    this.connections.clear()
    this.buffers.clear()
  }

  getConnectionStatus(channel) {
    const norm = channel.toLowerCase().replace(/^#/, '')
    return this.connections.get(norm)?.status ?? 'disconnected'
  }

  getMessages(moduleId) {
    return this.buffers.get(moduleId)?.messages ?? []
  }

  setMessageLimit(moduleId, limit) {
    const buf = this.buffers.get(moduleId)
    if (buf) {
      buf.messageLimit = Math.max(1, Math.floor(limit))
      while (buf.messages.length > buf.messageLimit) buf.messages.shift()
    }
  }

  async fetchBadgeMap(channel, clientId, accessToken) {
    const userRes = await fetch(
      `${TWITCH_HELIX_BASE}/users?login=${encodeURIComponent(channel)}`,
      {
        headers: {
          'Client-Id': clientId,
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    if (!userRes.ok) {
      const text = await userRes.text().catch(() => '')
      throw new Error(`User lookup failed (${userRes.status}): ${text}`)
    }
    const userData = await userRes.json()
    const userId = userData.data?.[0]?.id
    if (!userId) throw new Error(`Twitch user "${channel}" not found`)

    const [channelBadgesRes, globalBadgesRes] = await Promise.all([
      fetch(`${TWITCH_HELIX_BASE}/chat/badges?broadcaster_id=${userId}`, {
        headers: { 'Client-Id': clientId, Authorization: `Bearer ${accessToken}` },
      }),
      fetch(`${TWITCH_HELIX_BASE}/chat/badges/global`, {
        headers: { 'Client-Id': clientId, Authorization: `Bearer ${accessToken}` },
      }),
    ])

    const badgeMap = {}
    const process = (response) => {
      if (!response.ok) return
      return response.json().then(data => {
        for (const badge of data.data || []) {
          const versions = {}
          for (const version of badge.versions || []) {
            versions[version.id] = version.image_url_1x
          }
          badgeMap[badge.set_id] = versions
        }
      })
    }

    await Promise.all([process(channelBadgesRes), process(globalBadgesRes)])
    return badgeMap
  }

  resolveBadgeUrls(badgeMap, badges) {
    const urls = {}
    for (const [name, version] of Object.entries(badges)) {
      const versionMap = badgeMap[name]
      if (versionMap) {
        urls[name] = versionMap[version]
      }
    }
    return urls
  }

  parseEmotes(message, emotes) {
    if (!emotes || typeof emotes !== 'object') {
      return [{ type: 'text', value: message }]
    }

    const positions = []
    for (const [emoteId, ranges] of Object.entries(emotes)) {
      for (const range of ranges) {
        const [start, end] = range.split('-').map(Number)
        positions.push({ start, end: end + 1, emoteId })
      }
    }

    if (positions.length === 0) {
      return [{ type: 'text', value: message }]
    }

    positions.sort((a, b) => a.start - b.start)

    const parts = []
    let cursor = 0
    for (const pos of positions) {
      if (pos.start > cursor) {
        parts.push({ type: 'text', value: message.slice(cursor, pos.start) })
      }
      parts.push({
        type: 'emote',
        id: pos.emoteId,
        url: `https://static-cdn.jtvnw.net/emoticons/v2/${pos.emoteId}/default/dark/1.0`,
      })
      cursor = pos.end
    }
    if (cursor < message.length) {
      parts.push({ type: 'text', value: message.slice(cursor) })
    }

    return parts
  }
}

export const chatManager = new ChatManager()
