import { z } from 'zod';

export type CategorySlug =
  | 'computer-laptop'
  | 'networking-ethernet'
  | 'network-router'
  | 'mobile-assistance'
  | 'phone-hardware'
  | 'data-recovery'
  | 'data-storage'
  | 'software-development';
  | 'additional-services'
  | 'service-packages';

export type PricingType =
  | 'fixed_starting'
  | 'per_unit'
  | 'custom_quote'
  | 'cable_formula'
  | 'monthly';

export type ConfiguratorType =
  | 'windows_install'
  | 'custom_cable'
  | 'rj45_repair'
  | 'pc_troubleshooting'
  | 'network_install'
  | 'website_dev'
  | 'general_service';

export type RequestStatus =
  | 'New'
  | 'Reviewing'
  | 'Quotation Sent'
  | 'Awaiting Confirmation'
  | 'Confirmed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export const REQUEST_STATUSES: RequestStatus[] = [
  'New',
  'Reviewing',
  'Quotation Sent',
  'Awaiting Confirmation',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
];

export type QueueStatus = 'In Queue' | 'Working on It' | 'Done';

export const QUEUE_STATUSES: QueueStatus[] = ['In Queue', 'Working on It', 'Done'];

export const SERVICE_METHODS = [
  'Walk-in / meet-up by arrangement',
  'On-site service (subject to location and availability)',
  'Remote assistance',
  'Delivery / pickup by arrangement',
] as const;

export interface ServiceCategory {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceItem {
  id: number;
  categoryId: number;
  categorySlug: string;
  categoryName: string;
  slug: string;
  name: string;
  description: string;
  details: string;
  startingPrice: number;
  pricingType: PricingType;
  turnaroundEstimate: string;
  configuratorType: ConfiguratorType;
  supportsQuantity: boolean;
  isActive: boolean;
}

export interface CartServiceItem {
  uid: string;
  serviceId: number;
  serviceSlug: string;
  serviceName: string;
  categoryName: string;
  pricingType: PricingType;
  startingPrice: number;
  quantity: number;
  configuration: Record<string, string | number | boolean>;
  estimatedPrice: number | null;
}

export interface RequestInternalNote {
  id: number;
  requestId: number;
  note: string;
  createdAt: string;
}

export interface ServiceRequestRecord {
  id: number;
  referenceNumber: string;
  customerName: string;
  contactNumber: string;
  email: string | null;
  location: string;
  serviceMethod: string;
  preferredDate: string;
  additionalNotes: string | null;
  estimatedTotal: number | null;
  hasCustomQuoteItems: boolean;
  status: RequestStatus;
  queueStatus: QueueStatus;
  queueDoneAt: string | null;
  createdAt: string;
  items: {
    id: number;
    serviceId: number;
    serviceName: string;
    serviceSlug: string;
    quantity: number;
    configuration: Record<string, unknown>;
    estimatedPrice: number | null;
  }[];
  internalNotes: RequestInternalNote[];
}

export interface PublicQueueItem {
  referenceNumber: string;
  queueStatus: QueueStatus;
  serviceNames: string[];
  createdAt: string;
}

export const customerRequestSchema = z.object({
  customerName: z
    .string()
    .trim()
    .min(2, 'Please enter your full name (at least 2 characters).')
    .max(120, 'Name must be 120 characters or fewer.'),
  contactNumber: z
    .string()
    .trim()
    .min(7, 'Please provide a valid Philippine mobile or landline number.')
    .max(30, 'Contact number is too long.')
    .regex(/^[+0-9()\s-]+$/, 'Use digits, spaces, parentheses, or +63 only.'),
  email: z
    .string()
    .trim()
    .email('Please enter a valid email address or leave this blank.')
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .trim()
    .min(3, 'Please specify your city or barangay (e.g., Brgy. Teachers Village, QC).')
    .max(180, 'Location must be 180 characters or fewer.'),
  serviceMethod: z.enum(SERVICE_METHODS),
  preferredDate: z
    .string()
    .trim()
    .min(4, 'Please choose a preferred date or schedule window.')
    .max(60),
  additionalNotes: z.string().trim().max(1000).optional().or(z.literal('')),
  confirmedDisclaimer: z.literal(true, {
    message: 'Please confirm that this submission is a quotation request, not a confirmed booking.',
  }),
  websiteHoneypot: z.string().max(0).optional(),
});

export type CustomerRequestFormValues = z.infer<typeof customerRequestSchema>;

export const submitRequestPayloadSchema = z.object({
  customer: customerRequestSchema,
  items: z
    .array(
      z.object({
        serviceId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(50),
        configuration: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
      })
    )
    .min(1, 'Select at least one service before submitting a request.')
    .max(25),
});
