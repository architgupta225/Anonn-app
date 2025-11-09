DROP INDEX "users_role_idx";--> statement-breakpoint
DROP INDEX "users_is_public_idx";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_code" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "verification_code_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_public";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "permissions";