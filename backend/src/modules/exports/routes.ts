import { Elysia, t } from 'elysia';
import { eq, sql } from 'drizzle-orm';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { db } from '../../db/client';
import { drivers, expenses, trips, vehicles } from '../../db/schema';
import { resolveActor, requireRole } from '../../shared/auth-context';
import { notFound } from '../../shared/errors';

const toCsv = (rows: Record<string, unknown>[]): string => {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]!);
  const escapeCell = (value: unknown): string =>
    '"' + String(value ?? '').replaceAll('"', '""') + '"';

  return [
    columns.map(escapeCell).join(','),
    ...rows.map((row) => columns.map((column) => escapeCell(row[column])).join(',')),
  ].join('\r\n');
};
export const exportRoutes = new Elysia({ prefix: '/api/v1' })
  .derive(async ({ request }) => ({ actor: await resolveActor(request.headers) }))
  .get(
    '/exports/:resource.csv',
    async ({ actor, params }) => {
      requireRole(actor, ['FLEET_MANAGER', 'FINANCIAL_ANALYST']);
      let data: Record<string, unknown>[];
      switch (params.resource) {
        case 'vehicles':
          data = await db
            .select()
            .from(vehicles)
            .where(eq(vehicles.organizationId, actor.organizationId));
          break;
        case 'drivers':
          data = await db
            .select()
            .from(drivers)
            .where(eq(drivers.organizationId, actor.organizationId));
          break;
        case 'trips':
          data = await db
            .select()
            .from(trips)
            .where(eq(trips.organizationId, actor.organizationId));
          break;
        case 'expenses':
          data = await db
            .select()
            .from(expenses)
            .where(eq(expenses.organizationId, actor.organizationId));
          break;
        default:
          throw notFound('Export');
      }
      return new Response(toCsv(data), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${params.resource}.csv"`,
        },
      });
    },
    {
      params: t.Object({
        resource: t.Union([
          t.Literal('vehicles'),
          t.Literal('drivers'),
          t.Literal('trips'),
          t.Literal('expenses'),
        ]),
      }),
    },
  )
  .get('/exports/analytics.pdf', async ({ actor }) => {
    requireRole(actor, ['FLEET_MANAGER', 'FINANCIAL_ANALYST']);
    const pdf = await PDFDocument.create(),
      page = pdf.addPage([595, 842]),
      font = await pdf.embedFont(StandardFonts.Helvetica),
      bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    page.drawText('TransitOps Analytics Report', { x: 48, y: 790, size: 20, font: bold });
    page.drawText(`Generated: ${new Date().toISOString()}`, { x: 48, y: 765, size: 10, font });
    const [counts] = await db
      .select({
        vehicles: sql<number>`count(distinct ${vehicles.id})`,
        activeTrips: sql<number>`count(distinct ${trips.id}) filter(where ${trips.status} in ('DISPATCHED','IN_PROGRESS'))`,
      })
      .from(vehicles)
      .leftJoin(trips, eq(trips.organizationId, vehicles.organizationId))
      .where(eq(vehicles.organizationId, actor.organizationId));
    page.drawText(`Vehicles: ${counts?.vehicles ?? 0}`, { x: 48, y: 725, size: 12, font });
    page.drawText(`Active trips: ${counts?.activeTrips ?? 0}`, { x: 48, y: 703, size: 12, font });
    return new Response((await pdf.save()).buffer as ArrayBuffer, {
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="transitops-analytics.pdf"',
      },
    });
  });
