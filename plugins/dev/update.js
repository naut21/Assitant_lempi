import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'

const execute = promisify(execFile)

export default {
  command: ['update', 'actualizar'],
  help: 'update',
  description: 'Actualiza el repositorio y recarga los plugins',
  isDev: true,

  run: async m => {
    if (!existsSync(join(process.cwd(), '.git'))) {
      return m.reply('Este proyecto no esta conectado a un repositorio Git.')
    }

    try {
      await m.reply('Buscando actualizaciones...')
      const { stdout } = await execute('git', ['pull'], { cwd: process.cwd() })
      await m.reloadPlugins()
      await m.reply(stdout.trim() || 'Plugins recargados correctamente.')
    } catch (error) {
      console.error('Error actualizando:', error)
      await m.reply('No se pudo actualizar el bot.')
    }
  }
}
