export default {
  command: ['playvideo'],
  help: 'playvideo <URL de YouTube>',
  description: 'Descarga un video de YouTube en MP4',

  run: async m => {
    const url = (m.args || []).join(' ').trim()

    if (!url) {
      return m.reply(`🧃 Usa \`${m.prefix}playvideo <URL de YouTube>\`.`)
    }

    try {
      const data = await getJson(
        `https://api.lempi.lat/dl/ytv?url=${encodeURIComponent(url)}&apikey=lem921`,
        120000
      )

      if (!data.status || !data.datos?.url) {
        throw new Error('La api no devolvió el video')
      }

      return m.send({
        video: { url: data.datos.url },
        mimetype: 'video/mp4',
        fileName: data.datos.archivo || `${data.titulo}.mp4`
      })
    } catch (error) {
      console.error('Error descargando video:', error)
      return m.reply('> Algo salió mal, no se pudo descargar el `video`.')
    }
  }
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
