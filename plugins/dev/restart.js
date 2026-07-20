export default {
  command: ['restart', 'reiniciar'],
  help: 'restart',
  description: 'Reinicia el proceso del bot',
  isDev: true,

  run: async m => {
    await m.reply('Reiniciando el bot...')
    setTimeout(() => process.exit(0), 3000)
  }
}
