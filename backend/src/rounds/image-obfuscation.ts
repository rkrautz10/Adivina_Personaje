import sharp from 'sharp'

const OBFUSCATION_BLUR = 18

export async function obfuscateImage(image: Buffer): Promise<Buffer> {
  return sharp(image, { failOn: 'error' })
    .rotate()
    .grayscale()
    .resize({ width: 96, withoutEnlargement: true })
    .blur(OBFUSCATION_BLUR)
    .png()
    .toBuffer()
}