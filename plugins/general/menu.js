import { createMenu } from '../../lib/menu.js'

export default {
  command: ['menu', 'help'],
  help: 'menu',
  description: 'Muestra la lista de comandos',
  run: m => m.reply(createMenu(m))
}
