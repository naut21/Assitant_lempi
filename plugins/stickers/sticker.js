import {
  downloadContentFromMessage,
  extractMessageContent,
  getContentType
} from 'baileys'
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'child_process'

export default {
  command: ['sticker', 's'],
  help: 'sticker',
  description: 'Convierte una imagen, video o gif en sticker',

  run: async m => {
    const media = getMedia(m.quoted?.message || m.message)

    if (!media) {
      return m.reply(
        `🧃 Envía o responde a una \`imagen\`, \`video\` o \`gif\` con *${m.prefix || '.'}s*.`
      )
    }

    if (
      media.type === 'video' &&
      Number(media.message.seconds || 0) > 10
    ) {
      return m.reply(
        '> *El video o gif no puede durar más de* `10 segundos`.'
      )
    }

    try {
      await m.reply('🍧 Creando `sticker`...')

      const buffer = await downloadMedia(media)

      const sticker = media.type === 'image'
        ? await sharp(buffer, { animated: true })
            .resize(512, 512, {
              fit: 'contain',
              background: {
                r: 0,
                g: 0,
                b: 0,
                alpha: 0
              }
            })
            .webp({ quality: 80 })
            .toBuffer()
        : await videoToWebp(buffer)

      return m.send({ sticker })
    } catch (error) {
      console.error('Error creando sticker:', error)
      return m.reply('> 🍀 No se pudo crear el `sticker`.')
    }
  }
}

function getMedia(message) {
  const content = extractMessageContent(
    message?.message || message
  )

  const type = getContentType(content)

  if (type === 'imageMessage') {
    return {
      type: 'image',
      message: content.imageMessage
    }
  }

  if (type === 'videoMessage') {
    return {
      type: 'video',
      message: content.videoMessage
    }
  }

  return null
}

async function downloadMedia({ type, message }) {
  const stream = await downloadContentFromMessage(message, type)
  const chunks = []

  for await (const chunk of stream) {
    chunks.push(chunk)
  }

  return Buffer.concat(chunks)
}

async function videoToWebp(buffer) {
  if (!ffmpegPath) {
    throw new Error('FFmpeg no está disponible')
  }

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(ffmpegPath, [
      '-i', 'pipe:0',
      '-t', '10',
      '-vf',
      'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
      '-vcodec', 'libwebp',
      '-loop', '0',
      '-an',
      '-quality', '75',
      '-f', 'webp',
      'pipe:1'
    ])

    const chunks = []
    let error = ''

    ffmpeg.stdout.on('data', chunk => {
      chunks.push(chunk)
    })

    ffmpeg.stderr.on('data', chunk => {
      error += chunk
    })

    ffmpeg.on('error', reject)

    ffmpeg.on('close', code => {
      if (code === 0) {
        resolve(Buffer.concat(chunks))
      } else {
        reject(
          new Error(error || `FFmpeg terminó con código ${code}`)
        )
      }
    })

    ffmpeg.stdin.end(buffer)
  })
}