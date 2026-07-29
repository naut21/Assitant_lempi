export default {
  command: ['playaudio'],
  help: 'playaudio <Nombre o URL>',
  description: 'Descarga audio de YouTube en MP3',

  run: async m => {
    const query = (m.args || []).join(' ').trim()

    if (!query) {
      return m.reply(
        `🧃 Usa \`${m.prefix}playaudio <Nombre o URL>\`.`
      )
    }

    try {
      const videoId = getYouTubeId(query)

      const search = await getJson(
        `https://api.lempi.lat/search/yt?q=${encodeURIComponent(videoId || query)}&limit=5&apikey=Adobuffkey`
      )

      const result = videoId
        ? search.resultados?.find(video => video.id === videoId)
        : search.resultados?.[0]

      if (!videoId && !result?.url) {
        return m.reply(`> *🍡 No se encontraron resultados para* \`${query}\`.`)
      }

      const videoUrl = result?.url || query
      const title = result?.titulo || 'Audio de YouTube'
      const thumbnail =
        result?.miniatura ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`

      const caption =
`🍧 Descargando  \`${title}\`
  ◦ *Duración :* ${formatDuration(result?.duracion)}
  ◦ *Vistas :* ${formatViews(result?.vistas)}
  ◦ *Publicado :* ${formatPublished(result?.subido)}`

      await m.send({
        image: { url: thumbnail },
        caption
      })

      const data = await getJson(
        `https://api.lempi.lat/dl/yta?url=${encodeURIComponent(videoUrl)}&quality=128&apikey=Adobuffkey`,
        120000
      )

      if (!data.status || !data.descarga?.url) {
        throw new Error('La api no devolvió el audio')
      }

      return m.send({
        audio: { url: data.descarga.url },
        mimetype: 'audio/mpeg',
        fileName: data.descarga.archivo || `${data.titulo}.mp3`,
        ptt: false
      })
    } catch (error) {
      console.error('Error descargando audio:', error)
      return m.reply('> Algo salió mal, no se pudo descargar el `audio`.')
    }
  }
}

function getYouTubeId(text) {
  try {
    const url = new URL(text)
    const host = url.hostname.replace(/^www\./, '').toLowerCase()

    if (host === 'youtu.be') {
      return url.pathname.split('/')[1] || null
    }

    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      return (
        url.searchParams.get('v') ||
        url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ||
        null
      )
    }
  } catch {}

  return null
}

function formatDuration(duration) {
  if (!duration) return 'Desconocida'

  const parts = String(duration)
    .split(':')
    .map(part => part.padStart(2, '0'))

  return parts.join(':')
}

function formatViews(views) {
  const value = Number(views)

  if (!Number.isFinite(value)) return 'Desconocidas'

  if (value >= 1_000_000_000) {
    return `${compactNumber(value / 1_000_000_000)} B`
  }

  if (value >= 1_000_000) {
    return `${compactNumber(value / 1_000_000)} M`
  }

  if (value >= 1_000) {
    return `${compactNumber(value / 1_000)} K`
  }

  return value.toLocaleString('es-HN')
}

function compactNumber(value) {
  return value
    .toFixed(value >= 100 || Number.isInteger(value) ? 0 : 1)
    .replace('.', ',')
}

function formatPublished(value) {
  if (!value) return 'Desconocida'

  const relative = String(value).match(
    /^(\d+)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/i
  )

  if (relative) {
    const amount = Number(relative[1])
    const units = {
      second: ['segundo', 'segundos'],
      minute: ['minuto', 'minutos'],
      hour: ['hora', 'horas'],
      day: ['día', 'días'],
      week: ['semana', 'semanas'],
      month: ['mes', 'meses'],
      year: ['año', 'años']
    }

    const unit = units[relative[2].toLowerCase()]
    return `Hace ${amount} ${amount === 1 ? unit[0] : unit[1]}`
  }

  if (/^today$/i.test(value)) return 'Hoy'
  if (/^yesterday$/i.test(value)) return 'Ayer'

  const date = new Date(value)

  if (!Number.isNaN(date.getTime())) {
    return new Intl.DateTimeFormat('es-HN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date)
  }

  return String(value)
}

async function getJson(url, timeout = 30000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeout)
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error('La API devolvió una respuesta inválida')
  }
}