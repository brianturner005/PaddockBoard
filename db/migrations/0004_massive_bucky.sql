CREATE TABLE "club_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'editor' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_club_members_club_user" ON "club_members" USING btree ("club_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_club_members_user" ON "club_members" USING btree ("user_id");--> statement-breakpoint
-- Backfill: club_members is now the access-control source of truth (see
-- apps/web/lib/ownership.ts), so every existing club's owner needs an
-- "owner" row here or they'll be locked out of their own club.
INSERT INTO "club_members" ("club_id", "user_id", "role")
SELECT "id", "owner_user_id", 'owner' FROM "clubs"
ON CONFLICT DO NOTHING;