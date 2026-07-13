import { z } from 'zod';

export const assetFormSchema = z.object({
  assetTag: z.string().trim().max(64).optional(),
  deviceType: z.string().trim().min(1, 'Device type is required').max(64),
  brand: z.string().trim().min(1, 'Brand is required').max(128),
  model: z.string().trim().min(1, 'Model is required').max(128),
  serialNumber: z.string().trim().min(1, 'Serial number is required').max(128),
  imei: z.string().trim().max(32).optional(),
  purchaseDate: z.string().optional(),
  purchaseAmount: z
    .union([z.number().nonnegative(), z.string()])
    .optional()
    .transform((v) => (v === '' || v === undefined ? undefined : Number(v)))
    .refine((v) => v === undefined || (Number.isFinite(v) && v >= 0), {
      message: 'Purchase amount must be non-negative',
    }),
  purchaseCurrency: z.string().length(3).optional().or(z.literal('')),
  vendor: z.string().trim().max(255).optional(),
  warrantyExpiry: z.string().optional(),
  officeLocation: z.string().trim().max(128).optional(),
  department: z.string().trim().max(128).optional(),
  notes: z.string().optional(),
  markAvailableImmediately: z.boolean().optional(),
});

export type AssetFormValues = z.infer<typeof assetFormSchema>;
