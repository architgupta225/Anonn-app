CREATE TABLE "access_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"resource_id" integer,
	"ip_address" "inet",
	"user_agent" text,
	"success" boolean DEFAULT true,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "access_level" varchar(20) DEFAULT 'public' NOT NULL;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "allowed_users" text[];--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "admin_only_features" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "security_settings" jsonb DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_logs_user_id_idx" ON "access_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "access_logs_created_at_idx" ON "access_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "access_logs_resource_idx" ON "access_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "organizations_access_level_idx" ON "organizations" USING btree ("access_level");