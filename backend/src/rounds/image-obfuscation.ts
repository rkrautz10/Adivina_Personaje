import sharp from 'sharp'

const SILHOUETTE_RGB = [21, 33, 40]
const BACKGROUND_RGB = [223, 244, 233]

export async function obfuscateImage(image: Buffer): Promise<Buffer> {
  const original = sharp(image, { failOn: 'error' })
  const originalMetadata = await original.metadata()

  if (!originalMetadata.hasAlpha) {
    throw new Error('Image does not contain an alpha channel')
  }

  const normalized = await original.rotate().resize({ width: 96, withoutEnlargement: true }).ensureAlpha().png().toBuffer()
  const source = sharp(normalized)
  const metadata = await source.metadata()
  if (!metadata.width || !metadata.height) {
    throw new Error('Image dimensions are unavailable')
  }

  const { data, info } = await source.raw().toBuffer({ resolveWithObject: true })
  const pixels = Buffer.alloc(data.length)

  for (let offset = 0; offset < data.length; offset += info.channels) {
    const color = data[offset + 3] > 0 ? SILHOUETTE_RGB : BACKGROUND_RGB
    pixels[offset] = color[0]
    pixels[offset + 1] = color[1]
    pixels[offset + 2] = color[2]
    pixels[offset + 3] = 255
  }

  return sharp(pixels, {
    raw: { width: metadata.width, height: metadata.height, channels: 4 },
  })
    .removeAlpha()
    .png()
    .toBuffer()
}