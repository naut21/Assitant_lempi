import { generateWAMessageFromContent, jidNormalizedUser, prepareWAMessageMedia, proto } from 'baileys'

export default {
  command: ['menu', 'help'],
  help: 'menu',
  description: 'Muestra la lista de comandos',

  run: async m => {
    const tz = 'America/Tegucigalpa'

    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        hour12: false
      }).format(new Date())
    )

    const greet =
      hour < 6 ? 'Buenos días' :
      hour < 12 ? 'Buenos días' :
      hour < 19 ? 'Buenas tardes' :
      'Buenas noches'

    const icon =
      hour < 6 ? '🌙' :
      hour < 12 ? '🌅' :
      hour < 19 ? '🌇' :
      '🌃'

    const sections = {}

    for (const plugin of m.plugins) {
      const category = plugin.category || 'Otros'

      sections[category] ??= []

      sections[category].push({
        help: plugin.help,
        description: plugin.description
      })
    }

    let body = ''

    for (const category of Object.keys(sections).sort()) {
      body += `\n☔ *${category.toUpperCase()}*\n`

      const commands = sections[category].sort((a, b) =>
        String(a.help).localeCompare(String(b.help))
      )

      for (const cmd of commands) {
        body += `> ◦ *${m.prefix}${cmd.help}*\n`
        body += `   *${cmd.description || 'Sin descripción'}*\n`
      }
    }

    const time = new Date().toLocaleTimeString('es-HN', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const senderNumber = String(m.sender)
      .split('@')[0]
      .split(':')[0]
      .replace(/\D/g, '')

    const botName = globalThis.botName || 'Sylphy'

    const txt =
`*${icon} Hola, ${greet}* @${senderNumber}, un gusto saludarte. ¡Soy ${botName}!

> Un simple bot de WhatsApp enfocado en ayudar a las personas.

◦ *Hora: ${time}*
${body}`.trim()

    const image = 'https://s.lempi.lat/yvLfgHKY'

    try {
      const sock = m.sock
      const jid = m.chat || m.from || m.key?.remoteJid

      if (!sock) {
        throw new Error('No se encontró m.sock')
      }

      if (!jid) {
        throw new Error('No se encontró el JID del chat')
      }

      if (!sock.user?.id) {
        throw new Error('El socket todavía no tiene una sesión iniciada')
      }

      const botJid = jidNormalizedUser(sock.user.id)

      const media = await prepareWAMessageMedia(
        {
          image: {
            url: image
          }
        },
        {
          upload: sock.waUploadToServer
        }
      )

      const interactiveMessage =
        proto.Message.InteractiveMessage.create({
          header: {
            title: botName,
            hasMediaAttachment: true,

            productMessage: proto.Message.ProductMessage.create({
              product: {
                productImage: media.imageMessage,
                productId: '25015941284694382',
                title: botName,
                description:
                  'Un simple asistente de WhatsApp, destinado a ayudar.',
                retailerId: botName,
                url: 'https://sylphyy.xyz',
                productImageCount: 1
              },

              businessOwnerJid: botJid
            })
          },

          body: {
            text: txt
          },

          footer: {
            text: 'Using Baileys ©'
          },
          nativeFlowMessage: {
            buttons: [],
            messageVersion: 1
          },

          contextInfo: {
            mentionedJid: [m.sender]
          }
        })

      const generatedMessage = generateWAMessageFromContent(
        jid,
        {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2
              },

              interactiveMessage
            }
          }
        },
        {
          userJid: botJid
        }
      )

      await sock.relayMessage(
        jid,
        generatedMessage.message,
        {
          messageId: generatedMessage.key.id
        }
      )

      return generatedMessage
    } catch (error) {
      console.error('Error enviando el menú interactivo:', error)

      return await m.reply(txt, {
        mentions: [m.sender]
      })
    }
  }
}