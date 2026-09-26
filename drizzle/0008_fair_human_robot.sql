CREATE TABLE `pilot_feedback` (
	`owner` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`too_cheap` real,
	`bargain` real,
	`expensive` real,
	`too_expensive` real,
	`hours_saved` real,
	`comments` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workspaces` ADD `ai_credit_limit` integer;