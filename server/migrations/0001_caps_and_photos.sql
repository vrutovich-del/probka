CREATE TABLE `caps` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`found_on` text NOT NULL,
	`place` text NOT NULL,
	`condition` text NOT NULL,
	`brand` text,
	`product` text NOT NULL,
	`shape` text,
	`country` text,
	`dupes` integer NOT NULL,
	`use_cutout` integer NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `caps_account` ON `caps` (`account_id`);--> statement-breakpoint
CREATE TABLE `photos` (
	`id` text PRIMARY KEY NOT NULL,
	`cap_id` text NOT NULL,
	`account_id` text NOT NULL,
	`role` text NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`bbox` text,
	`rim_color` text,
	`has_original` integer DEFAULT 0 NOT NULL,
	`has_cutout` integer DEFAULT 0 NOT NULL,
	`has_thumb` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`cap_id`) REFERENCES `caps`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `photos_cap` ON `photos` (`cap_id`);--> statement-breakpoint
CREATE INDEX `photos_account` ON `photos` (`account_id`);