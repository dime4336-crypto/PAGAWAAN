import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { z } from 'zod';
import {
  addRequestInternalNote,
  createCategoryRecord,
  createServiceRequest,
  createMarketplaceListing,
  getAdminCatalog,
  getPublicCatalog,
  getWorkshopConfig,
  initializeDatabase,
  listPublicQueueItems,
  listAllServiceRequests,
  listMarketplaceListings,
  updateRequestQueueStatus,
  updateCategoryRecord,
  updateRequestStatus,
  updateServiceRecord,
  updateMarketplaceListingStatus,
  updateWorkshopConfig,
} from './src/server/db.ts';
import {
  QUEUE_STATUSES,
  REQUEST_STATUSES,
  submitRequestPayloadSchema,
} from './src/types/pagawaan.ts';

dotenv.config();

initializeDatabase();

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_COOKIE_NAME = 'pagawaan_admin_session';
const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || 'pagawaan-bench-2026';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  crypto.createHash('sha256').update(`pagawaan-${ADMIN_ACCESS_KEY}-secret`).digest('hex');

const rateLimitStore = new Map<string, { count: number; windowStart: number }>();
const actionPinAttemptStore = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 12;
const ACTION_PIN_MAX_ATTEMPTS = 8;
const MAX_LISTING_IMAGE_BYTES = 1_200_000;
const MAX_LISTING_IMAGES = 4;
const MARKETPLACE_CONDITIONS = ['Brand new', 'In stock', 'Like new', 'Second-hand'] as const;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  record.count += 1;
  return false;
}

function verifyActionPin(req: Request, res: Response): boolean {
  const expectedPin = process.env.ADMIN_ACTION_PIN;
  if (!expectedPin) {
    res.status(503).json({ error: 'Admin action PIN is not configured on the server.' });
    return false;
  }

  const ip = req.ip || 'unknown';
  const now = Date.now();
  const attempts = actionPinAttemptStore.get(ip);
  if (attempts && now - attempts.windowStart <= RATE_LIMIT_WINDOW_MS) {
    if (attempts.count >= ACTION_PIN_MAX_ATTEMPTS) {
      res.status(429).json({ error: 'Too many PIN attempts. Please try again later.' });
      return false;
    }
    attempts.count += 1;
  } else {
    actionPinAttemptStore.set(ip, { count: 1, windowStart: now });
  }

  const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
  const pinBuffer = Buffer.from(pin);
  const expectedBuffer = Buffer.from(expectedPin);
  if (
    pinBuffer.length === 0 ||
    pinBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(pinBuffer, expectedBuffer)
  ) {
    res.status(401).json({ error: 'Incorrect PIN.' });
    return false;
  }

  actionPinAttemptStore.delete(ip);
  return true;
}

function signSessionToken(expiresAt: number): string {
  const payload = `${expiresAt}`;
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${hmac}`;
}

function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [expiresStr, sig] = parts;
  const expiresAt = Number(expiresStr);
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) return false;

  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(expiresStr)
    .digest('hex');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

function requireAdminAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Admin authorization required.' });
    return;
  }
  next();
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function startServer(): Promise<void> {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Public catalog & workshop configuration
  app.get('/api/catalog', (_req, res) => {
    try {
      res.json(getPublicCatalog());
    } catch (error) {
      console.error('Failed to fetch catalog:', error);
      res.status(500).json({ error: 'Unable to load service catalog.' });
    }
  });

  app.get('/api/config', (_req, res) => {
    try {
      res.json(getWorkshopConfig());
    } catch (error) {
      console.error('Failed to fetch workshop config:', error);
      res.status(500).json({ error: 'Unable to load workshop configuration.' });
    }
  });

  app.get('/api/queue', (_req, res) => {
    try {
      res.json({ items: listPublicQueueItems() });
    } catch (error) {
      console.error('Failed to fetch public service queue:', error);
      res.status(500).json({ error: 'Unable to load the service queue.' });
    }
  });

  app.get('/api/marketplace', (_req, res) => {
    try {
      res.json({
        listings: listMarketplaceListings().filter((listing) => listing.status === 'Available'),
      });
    } catch (error) {
      console.error('Failed to fetch marketplace listings:', error);
      res.status(500).json({ error: 'Unable to load For Sale listings.' });
    }
  });

  app.post('/api/marketplace', (req, res) => {
    if (!verifyActionPin(req, res)) return;

    const listingSchema = z.object({
      pin: z.string(),
      title: z.string().trim().min(3).max(100),
      category: z.string().trim().min(2).max(50),
      description: z.string().trim().min(5).max(2000),
      price: z.number().int().min(0).max(5_000_000),
      condition: z.enum(MARKETPLACE_CONDITIONS),
      location: z.string().trim().min(2).max(120),
      images: z.array(z.string().max(2_000_000)).max(MAX_LISTING_IMAGES),
    });
    const parsed = listingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid listing details.',
      });
      return;
    }

    const { images } = parsed.data;
    for (const image of images) {
      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
      if (!match) {
        res.status(400).json({ error: 'Use JPEG, PNG, or WebP listing photos.' });
        return;
      }
      const sizeBytes = Buffer.from(match[2], 'base64').length;
      if (sizeBytes === 0 || sizeBytes > MAX_LISTING_IMAGE_BYTES) {
        res.status(400).json({ error: 'Each listing photo must be smaller than 1.2 MB.' });
        return;
      }
    }

    try {
      const listing = createMarketplaceListing(parsed.data);
      res.status(201).json({ listing });
    } catch (error) {
      console.error('Failed to create marketplace listing:', error);
      res.status(500).json({ error: 'Unable to publish listing.' });
    }
  });

  app.patch('/api/marketplace/:id/status', (req, res) => {
    if (!verifyActionPin(req, res)) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid listing ID.' });
      return;
    }
    const parsed = z.object({ pin: z.string(), status: z.enum(['Available', 'Sold']) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid listing status.' });
      return;
    }
    const listing = updateMarketplaceListingStatus(id, parsed.data.status);
    if (!listing) {
      res.status(404).json({ error: 'Listing not found.' });
      return;
    }
    res.json({ listing });
  });

  // Public service request submission with anti-spam + server-side calculation
  app.post('/api/requests', (req, res) => {
    const clientIp = req.ip || 'unknown';
    if (isRateLimited(clientIp)) {
      res.status(429).json({
        error: 'Too many requests submitted from this connection. Please wait a few minutes and try again.',
      });
      return;
    }

    const parsed = submitRequestPayloadSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid service request details.',
        issues: parsed.error.issues,
      });
      return;
    }

    if (parsed.data.customer.websiteHoneypot && parsed.data.customer.websiteHoneypot.length > 0) {
      res.status(400).json({ error: 'Invalid submission detected.' });
      return;
    }

    try {
      const created = createServiceRequest({
        customerName: parsed.data.customer.customerName,
        contactNumber: parsed.data.customer.contactNumber,
        email: parsed.data.customer.email || undefined,
        location: parsed.data.customer.location,
        serviceMethod: parsed.data.customer.serviceMethod,
        preferredDate: parsed.data.customer.preferredDate,
        additionalNotes: parsed.data.customer.additionalNotes || undefined,
        items: parsed.data.items,
      });

      res.status(201).json({
        request: created,
        message:
          'Your request has been submitted. Pagawaan will review your requirements and contact you to confirm the final quotation and service schedule.',
      });
    } catch (error: unknown) {
      console.error('Error submitting service request:', error);
      const message =
        error instanceof Error ? error.message : 'Unable to save service request.';
      res.status(400).json({ error: message });
    }
  });

  // Admin session endpoints
  app.get('/api/admin/session', (req, res) => {
    const authenticated = verifySessionToken(req.cookies?.[ADMIN_COOKIE_NAME]);
    res.json({ authenticated });
  });

  app.post('/api/admin/login', (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode : '';
    const inputBuf = Buffer.from(passcode);
    const expectedBuf = Buffer.from(ADMIN_ACCESS_KEY);

    if (
      inputBuf.length === 0 ||
      inputBuf.length !== expectedBuf.length ||
      !crypto.timingSafeEqual(inputBuf, expectedBuf)
    ) {
      res.status(401).json({ error: 'Incorrect workshop passcode.' });
      return;
    }

    const expiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12h
    const token = signSessionToken(expiresAt);

    res.cookie(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    });

    res.json({ authenticated: true });
  });

  app.post('/api/admin/logout', (_req, res) => {
    res.clearCookie(ADMIN_COOKIE_NAME, { path: '/' });
    res.json({ authenticated: false });
  });

  // Protected Admin Operations
  app.get('/api/admin/requests', requireAdminAuth, (_req, res) => {
    try {
      res.json({ requests: listAllServiceRequests() });
    } catch (error) {
      console.error('Admin fetch requests error:', error);
      res.status(500).json({ error: 'Unable to load requests.' });
    }
  });

  app.patch('/api/admin/requests/:id', requireAdminAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid request ID.' });
      return;
    }

    const statusSchema = z.object({
      status: z.enum(REQUEST_STATUSES as [string, ...string[]]),
    });
    const parsed = statusSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid status value.' });
      return;
    }
    if (parsed.data.status === 'Cancelled' && !verifyActionPin(req, res)) return;

    const updated = updateRequestStatus(id, parsed.data.status as (typeof REQUEST_STATUSES)[number]);
    if (!updated) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }
    res.json({ request: updated });
  });

  app.patch('/api/admin/requests/:id/queue-status', requireAdminAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid request ID.' });
      return;
    }

    const parsed = z.object({
      queueStatus: z.enum(QUEUE_STATUSES),
      pin: z.string(),
    }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid queue status value.' });
      return;
    }
    if (!verifyActionPin(req, res)) return;

    const updated = updateRequestQueueStatus(id, parsed.data.queueStatus);
    if (!updated) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }
    res.json({ request: updated });
  });

  app.post('/api/admin/requests/:id/notes', requireAdminAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid request ID.' });
      return;
    }

    const noteSchema = z.object({
      note: z.string().trim().min(1, 'Note cannot be empty.').max(1000),
    });
    const parsed = noteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid note.' });
      return;
    }

    const updated = addRequestInternalNote(id, parsed.data.note);
    if (!updated) {
      res.status(404).json({ error: 'Service request not found.' });
      return;
    }
    res.status(201).json({ request: updated });
  });

  app.get('/api/admin/catalog', requireAdminAuth, (_req, res) => {
    res.json(getAdminCatalog());
  });

  app.patch('/api/admin/services/:id', requireAdminAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid service ID.' });
      return;
    }

    const servicePatchSchema = z.object({
      startingPrice: z.number().int().min(0).max(500000).optional(),
      isActive: z.boolean().optional(),
      turnaroundEstimate: z.string().trim().min(2).max(80).optional(),
      description: z.string().trim().min(5).max(300).optional(),
      categoryId: z.number().int().positive().optional(),
    });

    const parsed = servicePatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid service update fields.' });
      return;
    }

    const updated = updateServiceRecord(id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }
    res.json({ service: updated });
  });

  app.post('/api/admin/categories', requireAdminAuth, (req, res) => {
    const catSchema = z.object({
      name: z.string().trim().min(2).max(80),
      slug: z
        .string()
        .trim()
        .min(2)
        .max(60)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only.'),
      description: z.string().trim().max(240).default(''),
    });

    const parsed = catSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid category data.' });
      return;
    }

    try {
      const category = createCategoryRecord(parsed.data);
      res.status(201).json({ category });
    } catch (error) {
      console.error('Create category error:', error);
      res.status(400).json({ error: 'Category slug may already exist.' });
    }
  });

  app.patch('/api/admin/categories/:id', requireAdminAuth, (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid category ID.' });
      return;
    }

    const catPatchSchema = z.object({
      name: z.string().trim().min(2).max(80).optional(),
      description: z.string().trim().max(240).optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = catPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid category update fields.' });
      return;
    }

    const updated = updateCategoryRecord(id, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    res.json({ category: updated });
  });

  app.patch('/api/admin/config', requireAdminAuth, (req, res) => {
    const configPatchSchema = z.object({
      serviceLocation: z.string().trim().min(3).max(200).optional(),
      email: z.string().trim().email().optional(),
      contactNumber: z.string().trim().min(5).max(80).optional(),
      businessHours: z.string().trim().min(3).max(160).optional(),
      facebookUrl: z.string().trim().url().optional(),
      messengerUrl: z.string().trim().url().optional(),
      whatsappUrl: z.string().trim().url().optional(),
    });

    const parsed = configPatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid workshop configuration values.' });
      return;
    }

    const updated = updateWorkshopConfig(parsed.data);
    res.json(updated);
  });

  app.get('/api/admin/requests/export', requireAdminAuth, (_req, res) => {
    const requests = listAllServiceRequests();
    const headers = [
      'Reference',
      'Status',
      'Created At',
      'Customer Name',
      'Contact Number',
      'Email',
      'Location',
      'Service Method',
      'Preferred Date',
      'Estimated Total (PHP)',
      'Has Custom Quote Items',
      'Requested Services',
      'Customer Notes',
      'Internal Notes',
    ];

    const lines = [headers.map(escapeCsvCell).join(',')];

    for (const r of requests) {
      const itemsSummary = r.items
        .map(
          (item) =>
            `${item.serviceName} x${item.quantity} (${item.estimatedPrice !== null ? `PHP ${item.estimatedPrice}` : 'Custom'}) ${JSON.stringify(item.configuration)}`
        )
        .join(' | ');
      const notesSummary = r.internalNotes.map((n) => `[${n.createdAt}] ${n.note}`).join(' | ');

      lines.push(
        [
          r.referenceNumber,
          r.status,
          r.createdAt,
          r.customerName,
          r.contactNumber,
          r.email ?? '',
          r.location,
          r.serviceMethod,
          r.preferredDate,
          r.estimatedTotal ?? 0,
          r.hasCustomQuoteItems ? 'Yes' : 'No',
          itemsSummary,
          r.additionalNotes ?? '',
          notesSummary,
        ]
          .map(escapeCsvCell)
          .join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="pagawaan-requests-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.send(lines.join('\r\n'));
  });

  // Mount Vite or Static Dist
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Pagawaan server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Pagawaan server:', err);
  process.exit(1);
});
