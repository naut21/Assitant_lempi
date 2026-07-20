export default {
  command: ['demote', 'quitaradmin'],
  help: 'demote @usuario',
  description: 'Quita el rango de administrador',
  isGroup: true,
  isAdmin: true,
  isBotAdmin: true,

  run: async m => {
    if (!m.target) {
      return m.reply('Etiqueta o responde al administrador que quieres degradar.')
    }

    if (m.targetNumber === m.botNumber) {
      return m.reply('No puedo degradarme a mi mismo.')
    }

    try {
      await m.sock.groupParticipantsUpdate(m.chat, [m.target], 'demote')
      m.clearGroupCache()

      await m.reply(`@${m.targetNumber} ya no es administrador.`, {
        mentions: [m.target]
      })
    } catch (error) {
      console.error('Error en demote:', error)
      await m.reply('No se pudo degradar al usuario.')
    }
  }
}
