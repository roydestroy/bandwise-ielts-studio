CREATE TABLE `usage_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`assessment_id` text,
	`task` text,
	`action` text NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`input_tokens` integer NOT NULL,
	`audio_tokens` integer NOT NULL,
	`output_tokens` integer NOT NULL,
	`cost_usd` real,
	`ok` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_usage_events_owner_created` ON `usage_events` (`owner`,`created_at`);