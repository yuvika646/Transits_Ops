import { Elysia, t } from 'elysia';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client';
import { vehicleDocuments, vehicles } from '../../db/schema';
import { env } from '../../config/env';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { AppError, notFound } from '../../shared/errors';
import { ok } from '../../shared/response';
import { deleteDocument, documentUrl, putDocument } from '../../shared/storage';

export const documentRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get(
    '/vehicles/:id/documents',
    async ({ actor, params }) =>
      ok(
        await db
          .select()
          .from(vehicleDocuments)
          .where(
            and(
              eq(vehicleDocuments.organizationId, actor.organizationId),
              eq(vehicleDocuments.vehicleId, params.id),
            ),
          ),
      ),
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .post(
    '/vehicles/:id/documents',
    async ({ actor, params, body }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [vehicle] = await db
        .select({ id: vehicles.id })
        .from(vehicles)
        .where(and(eq(vehicles.id, params.id), eq(vehicles.organizationId, actor.organizationId)));
      if (!vehicle) throw notFound('Vehicle');
      if (body.file.size > env.MAX_UPLOAD_BYTES)
        throw new AppError('FILE_TOO_LARGE', 'Document exceeds the upload limit.', 413);
      const allowed = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowed.includes(body.file.type))
        throw new AppError('INVALID_FILE_TYPE', 'Only PDF, PNG and JPEG files are allowed.', 422);
      const key = `${actor.organizationId}/${vehicle.id}/${crypto.randomUUID()}`;
      const bytes = new Uint8Array(await body.file.arrayBuffer());
      await putDocument(key, bytes, body.file.type);
      const [row] = await db
        .insert(vehicleDocuments)
        .values({
          organizationId: actor.organizationId,
          vehicleId: vehicle.id,
          category: body.category,
          displayName: body.file.name,
          objectKey: key,
          contentType: body.file.type,
          sizeBytes: body.file.size,
          expiresAt: body.expiresAt || null,
          uploadedBy: actor.id,
        })
        .returning();
      return ok(row);
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        file: t.File(),
        category: t.String(),
        expiresAt: t.Optional(t.String({ format: 'date' })),
      }),
    },
  )
  .get(
    '/vehicle-documents/:id/download',
    async ({ actor, params }) => {
      const [doc] = await db
        .select()
        .from(vehicleDocuments)
        .where(
          and(
            eq(vehicleDocuments.id, params.id),
            eq(vehicleDocuments.organizationId, actor.organizationId),
          ),
        );
      if (!doc) throw notFound('Document');
      return ok({ url: await documentUrl(doc.objectKey), expiresInSeconds: 300 });
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .delete(
    '/vehicle-documents/:id',
    async ({ actor, params }) => {
      requireRole(actor, ['FLEET_MANAGER']);
      const [doc] = await db
        .delete(vehicleDocuments)
        .where(
          and(
            eq(vehicleDocuments.id, params.id),
            eq(vehicleDocuments.organizationId, actor.organizationId),
          ),
        )
        .returning();
      if (!doc) throw notFound('Document');
      await deleteDocument(doc.objectKey);
      return ok({ deleted: true });
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  );
