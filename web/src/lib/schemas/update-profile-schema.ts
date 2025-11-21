/**
 * Validation schema for updating creator profile
 *
 * Uses Zod for type-safe form validation
 */

import { z } from 'zod';

export const updateProfileFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Page name is required')
    .max(100, 'Page name must be less than 100 characters')
    .trim(),

  bio: z
    .string()
    .max(500, 'Bio must be less than 500 characters')
    .trim(),

  avatar: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'Avatar must be less than 10MB'
    )
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type),
      'Avatar must be a JPEG or PNG image'
    )
    .optional(),

  background: z
    .instanceof(File)
    .refine(
      (file) => file.size <= 10 * 1024 * 1024,
      'Background image must be less than 10MB'
    )
    .refine(
      (file) => ['image/jpeg', 'image/jpg', 'image/png'].includes(file.type),
      'Background image must be a JPEG or PNG image'
    )
    .optional(),

  topic: z
    .number()
    .int('Topic must be an integer')
    .min(0, 'Invalid topic')
    .max(9, 'Invalid topic')
    .optional(),
});

export type UpdateProfileFormData = {
  name: string;
  bio: string;
  avatar?: File;
  background?: File;
  topic?: number;
};
