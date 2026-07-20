export default {
  command: ['kick', 'sacar'],
  help: 'kick @usuario',
  description: 'Expulsa a un usuario del grupo',
  isGroup: true,
  isAdmin: true,
  isBotAdmin: true,

  run: async m => {
    if (!m.target) {
      return m.reply('Etiqueta o responde al usuario que quieres eliminar.')
    }

    if (m.targetNumber === m.botNumber) {
      return m.reply('No puedo eliminarme a mi mismo.')
    }

    try {
      await m.sock.groupParticipantsUpdate(m.chat, [m.target], 'remove')
      m.clearGroupCache()

      await m.reply(`@${m.targetNumber} fue eliminado del grupo.`, {
        mentions: [m.target]
      })
    } catch (error) {
      console.error('Error en kick:', error)
      await m.reply('No se pudo eliminar al usuario.')
    }
  }
}
