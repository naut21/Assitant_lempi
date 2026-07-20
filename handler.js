import { readdir } from 'fs/promises'
import { join, relative } from 'path'
import { pathToFileURL } from 'url'
import config from './config.js'
import { registerUser } from './lib/database.js'

const commands = new Map()
const groupCache = new Map()

function jidNumber(jid = '') {
  return String(jid ?? '').split('@')[0].split(':')[0].replace(/\D/g, '')
}

function findParticipant(participants, jid) {
  const number = jidNumber(jid)
  if (!number) return undefined

  return participants.find(participant => {
    const ids = [participant.id, participant.lid, participant.phoneNumber]
    return ids.includes(jid) || ids.some(id => jidNumber(id) === number)
  })
}

async function getGroupMetadata(sock, chat) {
  const cached = groupCache.get(chat)

  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    return cached.data
  }

  const data = await sock.groupMetadata(chat).catch(() => null)
  if (data) groupCache.set(chat, { data, time: Date.now() })
  return data
}

function logCommand(commandName, rawMessage) {
  const user = rawMessage.pushName || 'Usuario'
  const time = new Date().toLocaleTimeString('es-HN', {
    timeZone: 'America/Tegucigalpa',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  console.log('\x1b[38;2;124;58;237m╭───────────────────────────────────────╮\x1b[0m')
  console.log(`\x1b[38;2;124;58;237m│\x1b[0m \x1b[1;38;2;196;181;253mComando :\x1b[0m \x1b[38;2;237;233;254m${commandName}\x1b[0m`)
  console.log(`\x1b[38;2;124;58;237m│\x1b[0m \x1b[1;38;2;196;181;253mUser :\x1b[0m \x1b[38;2;237;233;254m${user}\x1b[0m`)
  console.log(`\x1b[38;2;124;58;237m│\x1b[0m \x1b[1;38;2;196;181;253mTiempo :\x1b[0m \x1b[38;2;237;233;254m${time}\x1b[0m`)
  console.log('\x1b[38;2;124;58;237m╰───────────────────────────────────────╯\x1b[0m')
}

async function findPluginFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...await findPluginFiles(fullPath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath)
    }
  }

  return files
}

export async function loadPlugins() {
  commands.clear()

  const pluginsDirectory = join(process.cwd(), 'plugins')
  const files = await findPluginFiles(pluginsDirectory)

  for (const file of files) {
    try {
      const fileUrl = pathToFileURL(file)
      fileUrl.searchParams.set('update', Date.now().toString())

      const module = await import(fileUrl.href)
      const plugin = module.default

      if (!Array.isArray(plugin?.command)) {
        console.warn(`Plugin sin comandos: ${file}`)
        continue
      }

      if (typeof plugin.run !== 'function') {
        console.warn(`Plugin sin funcion run: ${file}`)
        continue
      }

      plugin.category ??= relative(pluginsDirectory, file).split(/[\\/]/)[0].toLowerCase()
      plugin.help ??= plugin.command[0]
      plugin.description ??= 'Sin descripcion'

      for (const alias of plugin.command) {
        commands.set(alias.toLowerCase(), plugin)
      }
    } catch (error) {
      console.error(`No se pudo cargar el plugin ${file}:`, error)
    }
  }

  console.log(`${commands.size} comandos registrados`)
}

export const pluginsReady = loadPlugins()

function unwrapMessage(message) {
  return (
    message.ephemeralMessage?.message ??
    message.viewOnceMessage?.message ??
    message.viewOnceMessageV2?.message ??
    message
  )
}

function getMessageText(message) {
  const content = unwrapMessage(message)

  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    content.buttonsResponseMessage?.selectedButtonId ??
    content.listResponseMessage?.singleSelectReply?.selectedRowId ??
    content.templateButtonReplyMessage?.selectedId ??
    ''
  )
}

export default async function handler(sock, rawMessage) {
  if (!rawMessage.message) return
  if (rawMessage.key.remoteJid === 'status@broadcast') return

  const chat = rawMessage.key.remoteJid
  if (!chat) return

  const sender = rawMessage.key.participant ?? chat
  const text = getMessageText(rawMessage.message).trim()
  const content = unwrapMessage(rawMessage.message)
  const messageType = Object.keys(content)[0]
  const contextInfo = content[messageType]?.contextInfo || {}
  const mentionedJid = contextInfo.mentionedJid || []
  const quoted = contextInfo.quotedMessage
    ? {
        sender: contextInfo.participant || '',
        message: contextInfo.quotedMessage,
        text: getMessageText(contextInfo.quotedMessage).trim()
      }
    : null
  const prefix = config.prefix.find(item => text.startsWith(item))

  if (!prefix) return

  const parts = text.slice(prefix.length).trim().split(/\s+/)
  const commandName = parts.shift()?.toLowerCase()

  if (!commandName) return

  const plugin = commands.get(commandName)
  if (!plugin) return

  const isGroup = chat.endsWith('@g.us')
  const needsGroupMetadata =
    isGroup && (plugin.isDev || plugin.isAdmin || plugin.isBotAdmin)
  const groupMetadata = needsGroupMetadata ? await getGroupMetadata(sock, chat) : null
  const participants = groupMetadata?.participants || []
  const senderParticipant = findParticipant(participants, sender)
  const botParticipant = findParticipant(participants, sock.user?.id || '')
  const target = mentionedJid[0] || quoted?.sender || null
  const targetParticipant = findParticipant(participants, target)
  const senderNumber = jidNumber(senderParticipant?.phoneNumber || sender)
  const targetNumber = jidNumber(targetParticipant?.phoneNumber || target)
  const botNumber = jidNumber(sock.user?.id)
  const devNumbers = new Set(config.devs.map(jidNumber))
  const isDev = devNumbers.has(senderNumber)
  const isAdmin = ['admin', 'superadmin'].includes(senderParticipant?.admin)
  const isBotAdmin = ['admin', 'superadmin'].includes(botParticipant?.admin)

  registerUser({
    id: senderNumber || sender,
    jid: sender,
    name: rawMessage.pushName || 'Usuario'
  })

  const m = {
    ...rawMessage,
    sock,
    config,
    chat,
    sender,
    text,
    args: parts,
    input: parts.join(' '),
    prefix,
    command: commandName,
    plugins: [...new Set(commands.values())],
    reloadPlugins: loadPlugins,
    mentionedJid,
    quoted,
    target,
    targetNumber,
    botNumber,
    isGroup,
    isDev,
    isAdmin,
    isBotAdmin,
    groupMetadata,
    clearGroupCache() {
      groupCache.delete(chat)
    },

    send(content) {
      return sock.sendMessage(chat, content, { quoted: rawMessage })
    },

    reply(content, extra = {}) {
      return sock.sendMessage(
        chat,
        { text: content, ...extra },
        { quoted: rawMessage }
      )
    }
  }

  logCommand(commandName, rawMessage)

  try {
    if (plugin.isDev && !isDev) return await m.reply('Solo desarrolladores.')
    if (plugin.isGroup && !isGroup) return await m.reply('Solo grupos.')
    if (plugin.isAdmin && !isAdmin) return await m.reply('Solo administradores.')
    if (plugin.isBotAdmin && !isBotAdmin) return await m.reply('Hazme administrador primero.')

    await plugin.run(m)
  } catch (error) {
    console.error(`Error ejecutando ${commandName}:`, error)
    await m.reply('Ocurrio un error al ejecutar el comando.')
  }
}
