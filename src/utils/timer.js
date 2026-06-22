export function computeTimerMs(mod) {
  if (!mod) return 0
  const now = Date.now()
  if (mod.targetType === 'datetime' && mod.targetDateTime) {
    const target = new Date(mod.targetDateTime).getTime()
    if (!Number.isFinite(target)) return 0
    return target - now
  }
  if (mod.status === 'stopped') {
    return mod.mode === 'countdown' ? mod.duration : 0
  }
  let elapsed
  if (mod.status === 'running') {
    elapsed = now - mod.startedAt - mod.pausedMsTotal
  } else {
    elapsed = mod.pausedAt - mod.startedAt - mod.pausedMsTotal
  }
  if (mod.mode === 'countdown') {
    const remaining = mod.duration - elapsed
    if (remaining <= 0) {
      if (mod.onComplete?.freezeAtZero) return 0
      return remaining
    }
    return remaining
  }
  if (mod.maxDuration > 0 && elapsed >= mod.maxDuration) {
    if (mod.onComplete?.freezeAtZero) return mod.maxDuration
    return elapsed
  }
  return elapsed
}

export function formatTimerValue(ms, precision, maxUnit = 'auto') {
  if (!Number.isFinite(ms)) return '00:00.00'
  const sign = ms < 0 ? '-' : ''
  const abs = Math.abs(ms)

  if (precision === 'minutes') {
    const totalMinutes = Math.round(abs / 60000)

    if (maxUnit === 'minutes' || maxUnit === 'seconds') {
      return `${sign}${totalMinutes}m`
    }

    if (maxUnit === 'hours') {
      const h = Math.floor(totalMinutes / 60)
      const m = totalMinutes % 60
      return `${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    }

    const days = Math.floor(totalMinutes / 1440)
    const h = Math.floor((totalMinutes % 1440) / 60)
    const m = totalMinutes % 60
    let result = sign
    if (days > 0) result += `${days}d `
    result += `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    return result
  }

  const totalSec = Math.floor(abs / 1000)
  const frac = abs % 1000

  if (maxUnit === 'seconds') {
    let result = sign + String(totalSec)
    if (precision === 'millis') result += `.${String(frac).padStart(3, '0')}`
    else if (precision === 'hundredths') result += `.${String(Math.floor(frac / 10)).padStart(2, '0')}`
    else if (precision === 'tenths') result += `.${String(Math.floor(frac / 100))}`
    return result
  }

  if (maxUnit === 'minutes') {
    const totalMinutes = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    let result = `${sign}${String(totalMinutes).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    if (precision === 'millis') result += `.${String(frac).padStart(3, '0')}`
    else if (precision === 'hundredths') result += `.${String(Math.floor(frac / 10)).padStart(2, '0')}`
    else if (precision === 'tenths') result += `.${String(Math.floor(frac / 100))}`
    return result
  }

  let days, hours, minutes, seconds
  if (maxUnit === 'hours') {
    days = 0
    hours = Math.floor(totalSec / 3600)
    minutes = Math.floor((totalSec % 3600) / 60)
    seconds = totalSec % 60
  } else {
    days = Math.floor(totalSec / 86400)
    hours = Math.floor((totalSec % 86400) / 3600)
    minutes = Math.floor((totalSec % 3600) / 60)
    seconds = totalSec % 60
  }

  let result = sign
  if (days > 0) result += `${days}d `
  result += `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  if (precision === 'millis') result += `.${String(frac).padStart(3, '0')}`
  else if (precision === 'hundredths') result += `.${String(Math.floor(frac / 10)).padStart(2, '0')}`
  else if (precision === 'tenths') result += `.${String(Math.floor(frac / 100))}`

  return result
}
