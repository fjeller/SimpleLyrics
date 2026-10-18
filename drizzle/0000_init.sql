CREATE TABLE `app_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_name_nocase` ON `categories` ("name" COLLATE NOCASE);--> statement-breakpoint
CREATE TABLE `interpreters` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `interpreters_name_nocase` ON `interpreters` ("name" COLLATE NOCASE);--> statement-breakpoint
CREATE TABLE `song_interpreters` (
	`song_id` integer NOT NULL,
	`interpreter_id` integer NOT NULL,
	PRIMARY KEY(`song_id`, `interpreter_id`),
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`interpreter_id`) REFERENCES `interpreters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `song_interpreters_interpreter_idx` ON `song_interpreters` (`interpreter_id`);--> statement-breakpoint
CREATE TABLE `songs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`key` text,
	`original_key` text,
	`first_line` text,
	`category_id` integer,
	`capo` integer DEFAULT 0 NOT NULL,
	`song_text` text,
	`chords` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "songs_capo_range" CHECK("songs"."capo" BETWEEN 0 AND 12),
	CONSTRAINT "songs_key_len" CHECK(length("songs"."key") <= 10),
	CONSTRAINT "songs_original_key_len" CHECK(length("songs"."original_key") <= 10),
	CONSTRAINT "songs_first_line_len" CHECK(length("songs"."first_line") <= 100),
	CONSTRAINT "songs_chords_len" CHECK(length("songs"."chords") <= 2000)
);
--> statement-breakpoint
CREATE INDEX `songs_category_idx` ON `songs` (`category_id`);--> statement-breakpoint
CREATE INDEX `songs_title_idx` ON `songs` (`title`);