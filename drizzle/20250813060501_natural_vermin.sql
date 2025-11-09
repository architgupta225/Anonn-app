ALTER TABLE "organizations" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "organizations_name_idx" ON "organizations" USING btree ("name");--> statement-breakpoint
CREATE INDEX "organizations_featured_idx" ON "organizations" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "organizations_created_by_idx" ON "organizations" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_name_unique" UNIQUE("name");