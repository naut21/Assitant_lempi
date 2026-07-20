import makeWASocket, { Browsers, DisconnectReason, fetchLatestBaileysVersion, useMultiFileAuthState } from 'baileys'
import pino from 'pino'
import readline from 'readline'
import handler, { pluginsReady } from './handler.js'

async function startBot() {
  await pluginsReady

  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.appropriate('Safari'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return

    for (const message of messages) {
      try {
        await handler(sock, message)
      } catch (error) {
        console.error('Error procesando mensaje:', error)
      }
    }
  })

  let pairingDone = false

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !state.creds.registered && !pairingDone) {
      pairingDone = true

      console.log('> 🌿 VINCULACIÓN <')

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })

      rl.question('\n🍃 Número con código de país\n› ', async answer => {
        rl.close()

        const phone = answer.replace(/\D/g, '')

        if (!phone || phone.length < 7) {
          console.log('\nEl numero ingresado es inválido\n')
          pairingDone = false
          return
        }

        try {
          const code = await sock.requestPairingCode(phone)
          const formatted = code.match(/.{1,4}/g)?.join(' - ') || code

          console.log(`CODE › ${formatted}`)
        } catch (error) {
         console.log('\nAlgo salio mal..\n')
         console.dir(error, {
            depth: null,
            colors: true
          })

         pairingDone = false
        }
      })
    }

    if (connection === 'open') {
      console.log('El bot se vinculo exitosamente !')
    }

    if (connection === 'close') {
     const error = lastDisconnect?.error
     const statusCode = error?.output?.statusCode

     console.dir(error, {
       depth: null,
       colors: true
      })

    if (statusCode === DisconnectReason.loggedOut) {
      console.log('\nLa sesion fue cerrada\n')
      return
     }

      console.log('\n🌱 Intentando reconectar...\n')
      startBot()
    }
  })
}

startBot()
