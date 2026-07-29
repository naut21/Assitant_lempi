import sharp from 'sharp'

const IMAGE_URL = 'https://s.lempi.lat/wbJYmt4e'

function escapeXml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

async function createLocationThumbnail({ name, latitude, longitude }) {
  const response = await fetch(IMAGE_URL, {
    signal: AbortSignal.timeout(15_000)
  })

  if (!response.ok) {
    throw new Error(`No se pudo descargar la imagen: HTTP ${response.status}`)
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer())

  const safeName = escapeXml(
    String(name || 'Ubicación')
      .trim()
      .slice(0, 40)
  )

  const coordinates = escapeXml(
    `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
  )

  const overlay = Buffer.from(`
    <svg width="500" height="250" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="35%" stop-color="#000000" stop-opacity="0"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.82"/>
        </linearGradient>
      </defs>

      <rect width="500" height="250" fill="url(#shadow)"/>

      <circle cx="43" cy="188" r="18" fill="#e53935"/>
      <circle cx="43" cy="184" r="6" fill="#ffffff"/>
      <path
        d="M29 188 C29 212 43 224 43 224 C43 224 57 212 57 188"
        fill="#e53935"
      />

      <text
        x="72"
        y="197"
        font-size="27"
        font-weight="700"
        fill="#ffffff"
        font-family="Arial, sans-serif"
      >${safeName}</text>

      <text
        x="24"
        y="232"
        font-size="15"
        fill="#ffffff"
        opacity="0.9"
        font-family="Arial, sans-serif"
      >${coordinates}</text>
    </svg>
  `)

  return sharp(imageBuffer)
    .resize(500, 250, {
      fit: 'cover',
      position: 'center'
    })
    .composite([
      {
        input: overlay,
        top: 0,
        left: 0
      }
    ])
    .jpeg({
      quality: 82
    })
    .toBuffer()
}

export default {
  command: ['location', 'loc', 'ubi'],
  help: 'location',
  description: 'Envía una ubicación con imagen personalizada',

  run: async m => {
    const [lat, lng, ...nameParts] = m.args

    const latitude = Number(lat)
    const longitude = Number(lng)
    const name = nameParts.join(' ').trim() || 'Ubicación'

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return m.reply(
        'Uso: .location <latitud> <longitud> [nombre]\n' +
        'Ejemplo: .location 14.0723 -87.1921 Tegucigalpa'
      )
    }

    if (latitude < -90 || latitude > 90) {
      return m.reply('La latitud debe estar entre -90 y 90.')
    }

    if (longitude < -180 || longitude > 180) {
      return m.reply('La longitud debe estar entre -180 y 180.')
    }

    try {
      const sock = m.sock
      const jid = m.chat || m.from || m.key?.remoteJid

      if (!sock?.sendMessage) {
        throw new Error('No se encontró m.sock.sendMessage')
      }

      if (!jid) {
        throw new Error('No se encontró el JID del chat')
      }

      const jpegThumbnail = await createLocationThumbnail({
        name,
        latitude,
        longitude
      })

      const quoted = [m.raw, m.message, m].find(
        message => message?.key && message?.message
      )

      const sentMessage = await sock.sendMessage(
        jid,
        {
          location: {
            degreesLatitude: latitude,
            degreesLongitude: longitude,
            name,
            address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
            url:
              `https://www.google.com/maps/search/?api=1&query=` +
              `${latitude},${longitude}`,
            jpegThumbnail
          }
        },
        quoted ? { quoted } : {}
      )

      return sentMessage
    } catch (error) {
      console.error('Error enviando ubicación:', error)

      return m.reply(
        `No se pudo enviar la ubicación.\n\n` +
        `Error: ${error.message}`
      )
    }
  }
}