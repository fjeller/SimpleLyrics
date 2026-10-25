CREATE TABLE `setlist_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`setlist_id` integer NOT NULL,
	`position` integer NOT NULL,
	`kind` text NOT NULL,
	`song_id` integer,
	FOREIGN KEY (`setlist_id`) REFERENCES `setlists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "setlist_items_kind" CHECK(("setlist_items"."kind" = 'song' and "setlist_items"."song_id" is not null) or ("setlist_items"."kind" = 'break' and "setlist_items"."song_id" is null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setlist_items_position_idx` ON `setlist_items` (`setlist_id`,`position`);--> statement-breakpoint
CREATE INDEX `setlist_items_song_idx` ON `setlist_items` (`song_id`);--> statement-breakpoint
CREATE TABLE `setlists` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `setlists_name_nocase` ON `setlists` ("name" COLLATE NOCASE);