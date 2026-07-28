import os from 'os'
import { statfs } from 'fs/promises'

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(2)} KB`
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(2)} MB`
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

function percent(used, total) {
  return ((used / total) * 100).toFixed(2)
}

export default {
  command: ['ping', 'p'],
  help: 'ping',
  description: 'Comprueba si el bot esta funcionando',
  run: async m => {
    const latency = Date.now() - (Number(m.messageTimestamp) * 1000)

    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem
    const botMem = process.memoryUsage().rss

    const disk = await statfs('/')
    const diskTotal = disk.blocks * disk.bsize
    const diskFree = disk.bfree * disk.bsize
    const diskUsed = diskTotal - diskFree

    const senderNumber = String(m.sender).split('@')[0].split(':')[0].replace(/\D/g, '')

    const caption =
`🐢 *Pong!*

> *@${senderNumber}* Aquí tienes la información!

◦  *Velocidad :* ${latency} ms
◦  *RAM Usada :* ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${percent(usedMem, totalMem)}%)
◦  *RAM Bot :* ${formatBytes(botMem)}
◦  *Disco :* ${formatBytes(diskUsed)} / ${formatBytes(diskTotal)} (${percent(diskUsed, diskTotal)}%)`.trim()

    await m.reply(caption, { mentions: [m.sender] })
  }
}