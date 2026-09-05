import assert from 'node:assert/strict'
import test from 'node:test'

import sharp from 'sharp'

import { obfuscateImage } from './image-obfuscation.js'

test('obfuscates an image as PNG without preserving original pixels', async () => {
  const original = await sharp({
    create: {
      width: 200,
      height: 120,
      channels: 3,
      background: { r: 240, g: 40, b: 20 },
    },
  })
    .png()
    .toBuffer()

  const obfuscated = await obfuscateImage(original)
  const metadata = await sharp(obfuscated).metadata()

  assert.notDeepEqual(obfuscated, original)
  assert.equal(metadata.format, 'png')
  assert.equal(metadata.width, 96)
  assert.equal(metadata.height, 58)
  assert.equal(metadata.hasProfile, false)
})

test('rejects invalid image data', async () => {
  await assert.rejects(() => obfuscateImage(Buffer.from('not an image')))
})