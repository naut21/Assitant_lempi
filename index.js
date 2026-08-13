import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestBaileysVersion,
  fetchLatestWaWebVersion,
  useMultiFileAuthState
} from 'baileys'
import pino from 'pino'
import readline from 'readline'
import handler, { pluginsReady } from './handler.js'

const logger = pino({ level: 'silent' })

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = text => new Promise(resolve => rl.question(text, resolve))

async function askPhoneNumber() {
  while (true) {
    const answer = await question(
      '\n> 🌿 VINCULACIÓN <\n\n🍃 Número con código de país\n› '
    )
    const phone = answer.replace(/\D/g, '')

    if (phone.length < 8) {
      console.log('\nEl número ingresado es inválido\n')
      continue
    }

    const confirm = await question(`\n¿Vinculo el número ${phone}? [s/n] › `)
    if (/^s/i.test(confirm.trim())) return phone

    console.log('')
  }
}

async function resolveVersion() {
  try {
    const { version } = await fetchLatestWaWebVersion()
    return version
  } catch {
    const { version } = await fetchLatestBaileysVersion()
    return version
  }
}

let reconnectAttempts = 0

async function startBot(phoneNumber) {
  await pluginsReady

  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const version = await resolveVersion()

  if (!state.creds.registered && !phoneNumber) {
    phoneNumber = await askPhoneNumber()
  }

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
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

  let codeRequested = false

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !state.creds.registered && !codeRequested) {
      codeRequested = true

      try {
        const code = await sock.requestPairingCode(phoneNumber)
        const formatted = code.match(/.{1,4}/g)?.join('-') || code

        console.log(`\n📱 Código para ${phoneNumber}\n\n    ${formatted}\n`)
        console.log('WhatsApp › Dispositivos vinculados › Vincular con número de teléfono')
        console.log('Tienes ~2 minutos antes de que caduque.\n')
      } catch (error) {
        console.error('\n❌ WhatsApp rechazó la solicitud de vinculación:')
        console.error(`   ${error?.message || error}`)
        console.error('   No teclees ningún código, no sería válido.\n')
        codeRequested = false
      }
    }

    if (connection === 'open') {
      reconnectAttempts = 0
      console.log('\n¡El bot se vinculó exitosamente!\n')
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error
      const statusCode = error?.output?.statusCode

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('\nLa sesión fue cerrada. Borra la carpeta "auth" y vuelve a vincular.\n')
        rl.close()
        return
      }

      if (statusCode === DisconnectReason.restartRequired) {
        console.log('\nReiniciando conexión...\n')
        return startBot(phoneNumber)
      }

      reconnectAttempts++
      if (reconnectAttempts > 5) {
        console.error('\n5 reconexiones fallidas seguidas. Me detengo.')
        console.error(`Último error: ${error?.message || error}\n`)
        rl.close()
        return
      }

      const delay = Math.min(reconnectAttempts * 2000, 10000)
      console.log(`\n🌱 Reconectando en ${delay / 1000}s (intento ${reconnectAttempts}/5)...\n`)
      setTimeout(() => startBot(phoneNumber), delay)
    }
  })
}

startBot()
