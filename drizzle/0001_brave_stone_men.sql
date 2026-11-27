CREATE TABLE `analytics_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_visits` (
	`day` text NOT NULL,
	`session_key` text NOT NULL,
	`visitor_key` text NOT NULL,
	`user_id` text,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`day`, `session_key`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `last_login_at` integer;