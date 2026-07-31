export default {
  command: ['get'],
  help: 'get <url>',
  description: 'Realiza una petición HTTP GET a una URL.',

  run: async m => {
    const url = (m.args || []).join(' ').trim()

    if (!url) {
      return m.reply(`Usa: \`${m.prefix}get <url>\``)
    }

    try {
      const parsedUrl = new URL(url)

      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        return m.reply('🍡 Brinda una *URL* válida!')
      }

      const response = await fetch(parsedUrl)
      const text = await response.text()

      let data

      try {
        data = JSON.parse(text)
      } catch {
        data = text
      }

      await m.reply(JSON.stringify({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        response: data
      }, null, 2))
    } catch (error) {
      console.error('Error haciendo GET:', error)

      await m.reply(JSON.stringify({
        status: false,
        error: error.message
      }, null, 2))
    }
  }
}