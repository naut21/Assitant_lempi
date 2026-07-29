import { prepareWAMessageMedia } from 'baileys'

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
      sections[plugin.category] ??= []

      sections[plugin.category].push({
        help: plugin.help,
        description: plugin.description
      })
    }

    let body = ''

    for (const category of Object.keys(sections).sort()) {
      body += `\n☔ *${category.toUpperCase()}*\n`

      for (
        const cmd of sections[category].sort((a, b) =>
          a.help.localeCompare(b.help)
        )
      ) {
        body += `> ◦ *${m.prefix}${cmd.help}*\n`
        body += `   *${cmd.description}*\n`
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

    const txt =
`*${icon} Hola, ${greet}* @${senderNumber}, un gusto saludarte. ¡Soy ${globalThis.botName}!

> Un simple bot de WhatsApp enfocado en ayudar a las personas.

◦ *Hora: ${time}*
${body}`.trim()

    const image = 'https://s.lempi.lat/yvLfgHKY'

    try {
      const sock = m.sock

      if (!sock?.waUploadToServer || !sock?.relayMessage) {
        throw new Error(
          'No se encontró el socket de Baileys dentro de m'
        )
      }

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

      const content = {
        interactiveMessage: {
          header: {
            title: globalThis.botName,
            hasMediaAttachment: true,

            productMessage: {
              product: {
                productImage: media.imageMessage,
                productId: '25015941284694382',
                title: '',
                description: 'Un simple asistente de WhatsApp, destinado a ayudar!',
                retailerId: globalThis.botName,
                url: 'https://sylphyy.xyz',
                productImageCount: 1
              },

              businessOwnerJid: '24580450156657@lid'
            }
          },

          body: {
            text: txt
          },

          footer: {
            text: 'Using Baileys ©'
          },

          nativeFlowMessage: {
            buttons: [
              {
                name: 'quick_reply',
                buttonParamsJson: JSON.stringify({
                  display_text: '🪴 PING',
                  id: `${m.prefix}p`
                })
              }
            ]
          },

          contextInfo: {
            mentionedJid: [m.sender],
            groupMentions: [],
            statusAttributions: [],
            pairedMediaType: 0
          }
        }
      }

      return await sock.relayMessage(
        m.chat || m.from,
        {
          viewOnceMessage: {
            message: {
              interactiveMessage: content.interactiveMessage
            }
          }
        },
        {}
      )
    } catch (error) {
      console.error('Error enviando el menú interactivo:', error)

      return await m.reply(txt, {
        mentions: [m.sender]
      })
    }
  }
}