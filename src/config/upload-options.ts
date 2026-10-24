import { BadRequestException } from '@nestjs/common';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Tamaño máximo por imagen: 5 MB */
export const IMAGE_MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Opciones compartidas de Multer para la subida de imágenes. */
export const imageUploadOptions = {
  limits: {
    files: 1,
    fileSize: IMAGE_MAX_FILE_SIZE,
  },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    callback: (error: Error | null, acceptFile: boolean) => void,
  ): void => {
    if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
      callback(
        new BadRequestException(
          `Unsupported file type "${file.mimetype}". Allowed types: ${IMAGE_MIME_TYPES.join(', ')}`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  },
};
