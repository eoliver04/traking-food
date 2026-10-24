import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';
import { normalizedImage } from './normalized-image';

describe('normalizedImage', () => {
  it('normaliza: corrige formato, redimensiona y devuelve JPEG', async () => {
    const pngWide = await sharp({
      create: { width: 2000, height: 10, channels: 3, background: 'blue' },
    })
      .png()
      .toBuffer();

    const result = await normalizedImage(pngWide);

    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe('jpeg');
    // Se reduce al ancho máximo de 1600 px
    expect(metadata.width).toBe(1600);
    expect(metadata.height).toBeLessThan(10); // rotate/resize mantienen escala
  });

  it('no agranda imágenes pequeñas (withoutEnlargement)', async () => {
    const smallJpeg = await sharp({
      create: { width: 50, height: 50, channels: 3, background: 'red' },
    })
      .jpeg()
      .toBuffer();

    const result = await normalizedImage(smallJpeg);

    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(50);
    expect(metadata.height).toBe(50);
  });

  it('lanza BadRequestException con bytes que no son una imagen', async () => {
    await expect(
      normalizedImage(Buffer.from('esto no es una imagen')),
    ).rejects.toThrow(BadRequestException);
  });
});
