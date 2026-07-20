import { downloadContentFromMessage } from 'baileys'
import sharp from 'sharp'
import ffmpegPath from 'ffmpeg-static'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import { readFile, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'

function unwrap(message) {
  return (
    message.ephemeralMessage?.message ??
    message.viewOnceMessage?.message ??
    message.viewOnceMessageV2?.message ??
    message
  )
}

async function downloadMedia(message) {
  const content = unwrap(message)
  const type = Object.keys(content)[0]
  const media = content[type]
  const stream = await downloadContentFromMessage(media, type.replace('Message', ''))
  const chunks = []

  for await (const chunk of stream) chunks.push(chunk)

  return {
    buffer: Buffer.concat(chunks),
    mime: media.mimetype || '',
    seconds: media.seconds || 0
  }
}

async function videoToWebp(buffer) {
  if (!ffmpegPath) throw new Error('FFmpeg no esta disponible')

  const id = randomUUID()
  const input = join(tmpdir(), `${id}.mp4`)
  const output = join(tmpdir(), `${id}.webp`)

  try {
    await writeFile(input, buffer)

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-y',
        '-i', input,
        '-t', '00:00:06',
        '-vf',
        'scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000',
        '-vcodec', 'libwebp',
        '-loop', '0',
        '-an',
        '-preset', 'default',
        '-quality', '75',
        output
      ])

      let error = ''
      ffmpeg.stderr.on('data', chunk => (error += chunk))
      ffmpeg.on('error', reject)
      ffmpeg.on('close', code => {
        if (code === 0) resolve()
        else reject(new Error(error || `FFmpeg termino con codigo ${code}`))
      })
    })

    return await readFile(output)
  } finally {
    await unlink(input).catch(() => {})
    await unlink(output).catch(() => {})
  }
}

export default {
  command: ['sticker', 's'],
  help: 'sticker',
  description: 'Convierte una imagen o video en sticker',

  run: async m => {
    const source = m.quoted?.message || m.message

    try {
      const media = await downloadMedia(source)

      if (!/image|video/.test(media.mime)) {
        return m.reply('Envia o responde a una imagen o video.')
      }

      if (media.mime.startsWith('video/') && media.seconds > 10) {
        return m.reply('El video no puede durar mas de 10 segundos.')
      }

      await m.reply('Creando sticker...')

      const sticker = media.mime.startsWith('image/')
        ? await sharp(media.buffer, { animated: true })
            .resize(512, 512, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ quality: 80 })
            .toBuffer()
        : await videoToWebp(media.buffer)

      await m.send({ sticker })
    } catch (error) {
      console.error('Error creando sticker:', error)
      await m.reply('No se pudo crear el sticker.')
    }
  }
}
