export default {
  command: ['menu', 'help'],
  help: 'menu',
  description: 'Muestra la lista de comandos',
  run: async m => {
    const hour = new Date().getHours()
    const greet =
      hour < 6 ? 'Buenos dias' :
      hour < 12 ? 'Buenos días' :
      hour < 19 ? 'Buenas tardes' :
      'Buenas noches'
    const icon =
      hour < 6 ? '🌙' :
      hour < 12 ? '🌅' :
      hour < 19 ? '🌇' :
      '🌃'

    const sections = {}

    for (const plugin of m.plugins) {
      sections[plugin.category] ??= []
      sections[plugin.category].push({
        help: plugin.help,
        description: plugin.description
      })
    }

    let body = ''

    for (const category of Object.keys(sections).sort()) {
      body += `\n☔ *${category.toUpperCase()}*\n`
      for (const cmd of sections[category].sort((a, b) => a.help.localeCompare(b.help))) {
        body += `> ◦ *${m.prefix}${cmd.help}*\n   > ${cmd.description}\n`
      }
    }

    const time = new Date().toLocaleTimeString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const senderNumber = String(m.sender).split('@')[0].split(':')[0].replace(/\D/g, '')

    const caption =
`*${icon} Hola ${greet}* @${senderNumber} un gusto saludarte, soy ${globalThis.botName}!

> Un simple bot de WhatsApp enfocado en ayudar a las personas!
◦  *Hora: ${time}*
${body}
> *Using Baileys* ©`.trim()

    const bannerUrl = 'https://lemi-beryl.vercel.app/p/1d9oos/1d9oos.png'

    try {
      const response = await fetch(bannerUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      await m.send({ image: buffer, caption, mentions: [m.sender] })
    } catch (error) {
      console.error('Error cargando banner del menu:', error)
      await m.reply(caption, { mentions: [m.sender] })
    }
  }
}