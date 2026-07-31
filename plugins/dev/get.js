export default {
  command: ['get'],
  help: 'get <url>',
  description: 'Hace petición HTTP',

  run: async (sock, m, { args, prefix }) => {
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
      const response = await fetch(url, {
        headers: {
          accept: '*/*',
          'user-agent': 'Mozilla/5.0'
        },
        redirect: 'follow'
      })

      const type = response.headers.get('content-type')?.split(';')[0] || 'application/octet-stream'

      if (type.includes('json') || type.startsWith('text/')) {
        const body = await response.text()
        return m.reply(body || '')
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      const disposition = response.headers.get('content-disposition')
      const fileName =
        disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i)?.[1] ||
        decodeURIComponent(new URL(response.url).pathname.split('/').pop()) ||
        'archivo'

      if (type.startsWith('image/') && type !== 'image/webp') {
        return sock.sendMessage(m.chat, { image: buffer, mimetype: type }, { quoted: m })
      }

      if (type.startsWith('video/')) {
        return sock.sendMessage(m.chat, { video: buffer, mimetype: type }, { quoted: m })
      }

      if (type.startsWith('audio/')) {
        return sock.sendMessage(m.chat, { audio: buffer, mimetype: type }, { quoted: m })
      }

      if (type === 'image/webp') {
        return sock.sendMessage(m.chat, { sticker: buffer }, { quoted: m })
      }

      await sock.sendMessage(m.chat, {
        document: buffer,
        mimetype: type,
        fileName
      }, { quoted: m })
    } catch (error) {
      console.error('Error haciendo GET:', error)
      await m.reply(`🍡 ${error.message}`)
    }
  }
}