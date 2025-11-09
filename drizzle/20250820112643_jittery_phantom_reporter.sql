CREATE TABLE "company_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"domain" varchar(100) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"is_verified" boolean DEFAULT true NOT NULL,
	"logo" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "company_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "company_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"email" varchar(255) NOT NULL,
	"domain" varchar(100) NOT NULL,
	"verification_code" varchar(10) NOT NULL,
	"zk_proof" text,
	"zk_proof_hash" varchar(255),
	"starknet_tx_hash" varchar(255),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "work_life_balance" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "culture_values" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "career_opportunities" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "compensation" integer;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "management" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_email" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_domain" varchar(100);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_name" varchar(255);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_company_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zk_proof_hash" varchar(255);--> statement-breakpoint
ALTER TABLE "company_verifications" ADD CONSTRAINT "company_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_domains_domain_idx" ON "company_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "company_domains_verified_idx" ON "company_domains" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "company_verifications_user_id_idx" ON "company_verifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "company_verifications_email_idx" ON "company_verifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "company_verifications_status_idx" ON "company_verifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "company_verifications_expires_at_idx" ON "company_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "users_company_domain_idx" ON "users" USING btree ("company_domain");--> statement-breakpoint
CREATE INDEX "users_company_verified_idx" ON "users" USING btree ("is_company_verified");