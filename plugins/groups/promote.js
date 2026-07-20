export default {
  command: ['promote', 'daradmin'],
  help: 'promote @usuario',
  description: 'Convierte a un usuario en administrador',
  isGroup: true,
  isAdmin: true,
  isBotAdmin: true,

  run: async m => {
    if (!m.target) {
      return m.reply('Etiqueta o responde al usuario que quieres ascender.')
    }

    if (m.targetNumber === m.botNumber) {
      return m.reply('No puedo ascenderme a mi mismo.')
    }

    try {
      await m.sock.groupParticipantsUpdate(m.chat, [m.target], 'promote')
      m.clearGroupCache()

      await m.reply(`@${m.targetNumber} ahora es administrador.`, {
        mentions: [m.target]
      })
    } catch (error) {
      console.error('Error en promote:', error)
      await m.reply('No se pudo ascender al usuario.')
    }
  }
}
