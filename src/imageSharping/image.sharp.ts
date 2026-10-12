import sharp from 'sharp';

export const normalizedImage = async (
  imageBuffer: Buffer,
): Promise<Buffer> => {

  console.log('BUFFER FIRST BYTES:', imageBuffer.subarray(0, 20));

  try {
    const metadata = await sharp(imageBuffer).metadata();

    console.log('IMAGE METADATA:', metadata);

    return await sharp(imageBuffer)
      .rotate()
      .resize({
        width: 1600,
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
      })
      .toBuffer();

  } catch (error) {
    console.error('SHARP ERROR:', error);
    throw error;
  }
};