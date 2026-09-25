CREATE TABLE `email_settings` (
	`owner` text PRIMARY KEY NOT NULL,
	`config` text NOT NULL,
	`encrypted_password` text NOT NULL,
	`tested_at` text
);
--> statement-breakpoint
ALTER TABLE `students` ADD `email` text;