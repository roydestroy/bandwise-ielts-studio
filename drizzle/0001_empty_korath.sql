CREATE TABLE `ai_connections` (
	`owner` text NOT NULL,
	`provider` text NOT NULL,
	`config` text NOT NULL,
	`encrypted_key` text NOT NULL,
	`tested_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ai_connections_owner_provider` ON `ai_connections` (`owner`,`provider`);--> statement-breakpoint
CREATE TABLE `ai_preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`writing` text NOT NULL,
	`speaking` text NOT NULL
);
