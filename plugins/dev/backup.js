import { readFile } from 'fs/promises'
import { checkpointDatabase, databasePath } from '../../lib/database.js'

export default {
  command: ['backup', 'respaldo'],
  help: 'backup',
  description: 'Envia un respaldo de la base de datos',
  isDev: true,

  run: async m => {
    try {
      checkpointDatabase()
      const data = await readFile(databasePath)

      await m.sock.sendMessage(m.sender, {
        document: data,
        mimetype: 'application/vnd.sqlite3',
        fileName: 'database.db'
      })

      await m.reply('Respaldo enviado a tu chat privado.')
    } catch (error) {
      console.error('Error creando respaldo:', error)
      await m.reply('No se pudo enviar el respaldo.')
    }
  }
}
