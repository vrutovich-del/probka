CREATE TABLE `code_attempts` (
	`account_id` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `friend_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`from_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `friend_requests_pair` ON `friend_requests` (`from_id`,`to_id`);--> statement-breakpoint
CREATE INDEX `friend_requests_to` ON `friend_requests` (`to_id`);--> statement-breakpoint
CREATE TABLE `friendships` (
	`account_id` text NOT NULL,
	`friend_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`account_id`, `friend_id`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`friend_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `friendships_account` ON `friendships` (`account_id`);