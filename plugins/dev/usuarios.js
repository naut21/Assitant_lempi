import { getUserCount, getUsers } from '../../lib/database.js'

export default {
  command: ['usuarios', 'listusers', 'database'],
  help: 'usuarios',
  description: 'Muestra los usuarios registrados',
  isDev: true,

  run: async m => {
    const users = getUsers(50)
    const total = getUserCount()

    if (!users.length) return m.reply('No hay usuarios registrados.')

    let text = `*Usuarios registrados:* ${total}\n\n`

    users.forEach((user, index) => {
      text += `${index + 1}. @${user.id} - ${user.name} (${user.commands} comandos)\n`
    })

    if (total > users.length) {
      text += `\n... y ${total - users.length} usuarios mas.`
    }

    await m.reply(text.trim(), {
      mentions: users.map(user => user.jid)
    })
  }
}
