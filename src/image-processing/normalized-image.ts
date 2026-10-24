import { BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';

const logger = new Logger('ImageProcessing');

/**
 * Normaliza la imagen antes de enviarla a Gemini:
 * - corrige la rotación EXIF
 * - reduce a un ancho máximo de 1600 px
 * - re-codifica a JPEG (calidad 85) para ahorrar tokens
 */
export const normalizedImage = async (imageBuffer: Buffer): Promise<Buffer> => {
  try {
    return await sharp(imageBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch (error) {
    logger.error(
      `Failed to process image: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw new BadRequestException(
      'The uploaded file could not be processed as an image',
    );
  }
};
