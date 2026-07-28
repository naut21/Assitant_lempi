export default {
  command: ['menu', 'help'],
  help: 'menu',
  description: 'Muestra la lista de comandos',
  run: async m => {
    const categories = {}

    for (const plugin of m.plugins) {
      categories[plugin.category] ??= []
      categories[plugin.category].push({
        help: plugin.help,
        description: plugin.description
      })
    }

    let menu = `*¡Hola ${m.pushName || 'Usuario'}!* 🌿\n\nAquí tienes mi lista de funciones:\n`

    for (const category of Object.keys(categories).sort()) {
      menu += `\n☁️ \`${category.toUpperCase()}:\`\n`

      for (const plugin of categories[category].sort((a, b) => a.help.localeCompare(b.help))) {
        menu += `→ ${m.prefix}${plugin.help}\n   ${plugin.description}\n`
      }
    }

    const time = new Date().toLocaleTimeString('es-HN', {
      timeZone: 'America/Tegucigalpa',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const caption = `${menu}\n🕒 ${time}\n*${globalThis.botName}*`.trim()
    const bannerUrl = 'https://lemi-beryl.vercel.app/p/1d9oos/1d9oos.png'

    try {
      const response = await fetch(bannerUrl)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const buffer = Buffer.from(await response.arrayBuffer())
      await m.send({ image: buffer, caption })
    } catch (error) {
      console.error('Error cargando banner del menu:', error)
      await m.reply(caption)
    }
  }
}