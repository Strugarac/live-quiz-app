import { uploadFile } from './client'
import type { UUID } from './types'

export interface ImageUploadResponse {
  id: UUID
  /** Store this in a question's or option's imageUrl. */
  url: string
  contentType: string
  sizeBytes: number
}

/** Mirrors ProfessorImageController (POST /api/professor/images). */
export const imageApi = {
  upload: (file: File) => uploadFile<ImageUploadResponse>('/professor/images', file),
}

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

/** Keep in step with ImageService.MAX_SIZE_BYTES and spring.servlet.multipart.max-file-size. */
export const MAX_IMAGE_BYTES = 50 * 1024 * 1024

export const MAX_IMAGE_LABEL = '50 MB'
