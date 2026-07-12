import nodemailer from 'nodemailer';
import { and, eq, lte, sql } from 'drizzle-orm';
import { db, pool } from './db/client';
import { drivers, emailDeliveries, organizations, users } from './db/schema';
import { env } from './config/env';
import { logger } from './shared/logger';
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});
export async function runLicenseReminders() {
  const orgs = await db.select().from(organizations);
  for (const org of orgs) {
    const limit = new Date();
    limit.setUTCDate(limit.getUTCDate() + org.licenseReminderDays);
    const expiring = await db
      .select({ driver: drivers, user: users })
      .from(drivers)
      .leftJoin(users, eq(users.id, drivers.linkedUserId))
      .where(
        and(
          eq(drivers.organizationId, org.id),
          lte(drivers.licenseExpiryDate, limit.toISOString().slice(0, 10)),
          sql`${drivers.licenseExpiryDate} >= current_date`,
        ),
      );
    for (const item of expiring) {
      if (!item.user?.email) continue;
      const day = new Date().toISOString().slice(0, 10),
        key = `license:${item.driver.id}:${day}`;
      const [delivery] = await db
        .insert(emailDeliveries)
        .values({
          organizationId: org.id,
          recipient: item.user.email,
          template: 'LICENSE_EXPIRY',
          deduplicationKey: key,
        })
        .onConflictDoNothing()
        .returning();
      if (!delivery) continue;
      try {
        const info = await transport.sendMail({
          from: env.SMTP_FROM,
          to: item.user.email,
          subject: 'TransitOps license expiry reminder',
          text: `Your driving license ${item.driver.licenseNumber} expires on ${item.driver.licenseExpiryDate}.`,
        });
        await db
          .update(emailDeliveries)
          .set({
            status: 'SENT',
            sentAt: new Date(),
            providerMessageId: info.messageId,
            attemptCount: 1,
          })
          .where(eq(emailDeliveries.id, delivery.id));
      } catch (error) {
        await db
          .update(emailDeliveries)
          .set({ status: 'FAILED', lastError: String(error), attemptCount: 1 })
          .where(eq(emailDeliveries.id, delivery.id));
        logger.error({ error, driverId: item.driver.id }, 'Reminder failed');
      }
    }
  }
}
if (import.meta.main) {
  await runLicenseReminders();
  await pool.end();
}
