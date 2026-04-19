CREATE TABLE "chapter_images" (
	"chapter_slug" text NOT NULL,
	"position" integer NOT NULL,
	"original_url" text NOT NULL,
	"stored_url" text NOT NULL,
	CONSTRAINT "chapter_images_chapter_slug_position_pk" PRIMARY KEY("chapter_slug","position")
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"series" text NOT NULL,
	"chapter" text NOT NULL,
	"comic_url" text NOT NULL,
	"comic_slug" text NOT NULL,
	"total_images" integer NOT NULL,
	"prev_chapter" jsonb,
	"next_chapter" jsonb,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pustaka_items" (
	"id" integer PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"url" text NOT NULL,
	"type" text NOT NULL,
	"genres" text[] NOT NULL,
	"status" text NOT NULL,
	"updated_at" text NOT NULL,
	"scraped_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pustaka_items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "chapter_images" ADD CONSTRAINT "chapter_images_chapter_slug_chapters_slug_fk" FOREIGN KEY ("chapter_slug") REFERENCES "public"."chapters"("slug") ON DELETE cascade ON UPDATE no action;