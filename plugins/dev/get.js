export default {
  command: ['get'],
  help: 'get <url>',
  description: 'Hace una petición HTTP GET.',

  run: async (sock, m, options = {}) => {
    if (!m) {
      m = sock
      sock = m.sock 
    }

    const args = options.args || m.args || []
    const prefix = options.prefix || m.prefix || '.'
    const input = args.join(' ').trim()

    if (!input) return m.reply(`🍡 Usa: \`${prefix}get <url>\``)

    let url

    try {
      url = new URL(input)

      if (!['http:', 'https:'].includes(url.protocol)) {
        return m.reply('🍡 Brinda una *URL* válida!')
      }
    } catch {
      return m.reply('🍡 Brinda una *URL* válida!')
    }

    try {
      const response = await fetch(url.href, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          accept: '*/*',
          'user-agent': 'Mozilla/5.0'
        }
      })

      const type = response.headers
        .get('content-type')
        ?.split(';')[0]
        .trim()
        .toLowerCase() || 'application/octet-stream'

      if (
        type.startsWith('text/') ||
        type.includes('json') ||
        type.includes('xml') ||
        type.includes('javascript')
      ) {
        return m.reply(await response.text())
      }

      const buffer = Buffer.from(await response.arrayBuffer())

      if (!sock?.sendMessage) {
        return m.reply('🍡 El handler no proporcionó el socket para enviar el archivo.')
      }

      const disposition = response.headers.get('content-disposition')
      const headerName = disposition?.match(
        /filename\*?=(?:UTF-8''|["'])?([^;"']+)/i
      )?.[1]

      const pathName = new URL(response.url).pathname.split('/').pop()
      let fileName = headerName || pathName || 'archivo'

      try {
        fileName = decodeURIComponent(fileName)
      } catch {}

      fileName = fileName.replace(/[\\/:*?"<>|]/g, '_')

      if (['image/jpeg', 'image/jpg', 'image/png'].includes(type)) {
        return sock.sendMessage(
          m.chat,
          { image: buffer, mimetype: type },
          { quoted: m }
        )
      }

      if (type === 'image/gif') {
        return sock.sendMessage(
          m.chat,
          {
            video: buffer,
            mimetype: 'video/mp4',
            gifPlayback: true
          },
          { quoted: m }
        )
      }

      if (type.startsWith('video/')) {
        return sock.sendMessage(
          m.chat,
          {
            video: buffer,
            mimetype: type,
            fileName
          },
          { quoted: m }
        )
      }

      if (type.startsWith('audio/')) {
        return sock.sendMessage(
          m.chat,
          {
            audio: buffer,
            mimetype: type,
            fileName,
            ptt: false
          },
          { quoted: m }
        )
      }

      return sock.sendMessage(
        m.chat,
        {
          document: buffer,
          mimetype: type,
          fileName
        },
        { quoted: m }
      )
    } catch (error) {
      console.error('Error ejecutando get:', error)
      return m.reply(`🍡 ${error.message}`)
    }
  }
}