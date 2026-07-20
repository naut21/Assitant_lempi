export default {
  command: ['hidetag', 'tag'],
  help: 'hidetag <texto>',
  description: 'Menciona a todos sin mostrar los arrobas',
  isGroup: true,
  isAdmin: true,

  run: async m => {
    const text = m.input || m.quoted?.text

    if (!text) {
      return m.reply('Escribe un texto o responde a un mensaje.')
    }

    const mentions = m.groupMetadata.participants
      .map(participant => participant.id)
      .filter(Boolean)

    await m.reply(text, { mentions })
  }
}
