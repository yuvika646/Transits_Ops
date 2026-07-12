CREATE TYPE "public"."approval_status" AS ENUM('PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED');
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "slug" varchar(120) DEFAULT 'transitops' NOT NULL;
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "signup_code_hash" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approval_status" "approval_status" DEFAULT 'PENDING' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "approved_by" text;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rejection_reason" text;
--> statement-breakpoint
UPDATE "users" SET "approval_status" = 'ACTIVE' WHERE "active" = true;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "active" SET DEFAULT false;
--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_unique" ON "organizations" USING btree ("slug");