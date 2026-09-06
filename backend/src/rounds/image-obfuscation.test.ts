import assert from 'node:assert/strict'
import test from 'node:test'

import sharp from 'sharp'

import { obfuscateImage } from './image-obfuscation.js'

test('creates a solid silhouette from the artwork alpha channel', async () => {
  const original = await sharp({
    create: { width: 200, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: await sharp({ create: { width: 80, height: 80, channels: 4, background: '#f02828' } }).png().toBuffer(), left: 60, top: 20 }])
    .png()
    .toBuffer()

  const obfuscated = await obfuscateImage(original)
  const metadata = await sharp(obfuscated).metadata()
  const { data, info } = await sharp(obfuscated).raw().toBuffer({ resolveWithObject: true })
  const backgroundOffset = 0
  const silhouetteOffset = (Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * info.channels

  assert.notDeepEqual(obfuscated, original)
  assert.equal(metadata.format, 'png')
  assert.equal(metadata.width, 96)
  assert.equal(metadata.height, 58)
  assert.equal(metadata.hasProfile, false)
  assert.deepEqual([...data.subarray(backgroundOffset, backgroundOffset + 3)], [223, 244, 233])
  assert.deepEqual([...data.subarray(silhouetteOffset, silhouetteOffset + 3)], [21, 33, 40])
})

test('rejects invalid image data and images without transparency', async () => {
  await assert.rejects(() => obfuscateImage(Buffer.from('not an image')))
  const opaqueImage = await sharp({
    create: { width: 32, height: 32, channels: 3, background: '#f02828' },
  })
    .png()
    .toBuffer()

  await assert.rejects(() => obfuscateImage(opaqueImage))
})