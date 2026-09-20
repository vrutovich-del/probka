CREATE TABLE `accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`nickname` text NOT NULL,
	`nickname_key` text NOT NULL,
	`avatar` text NOT NULL,
	`friend_code` text NOT NULL,
	`recovery_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_nickname_key_unique` ON `accounts` (`nickname_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_friend_code_unique` ON `accounts` (`friend_code`);--> statement-breakpoint
CREATE TABLE `device_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `device_tokens_account` ON `device_tokens` (`account_id`);