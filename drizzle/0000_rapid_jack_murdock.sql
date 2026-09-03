CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`admin_user` text,
	`details` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `fingerprints` (
	`fingerprint` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`content_id` text NOT NULL,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`company_name` text NOT NULL,
	`company_url` text,
	`company_location` text,
	`company_description` text,
	`description` text,
	`required_skills` text,
	`experience_level` text,
	`job_type` text,
	`is_remote` integer,
	`accepts_worldwide` integer,
	`location_restrictions` text,
	`timezone` text,
	`salary_min` integer,
	`salary_max` integer,
	`salary_currency` text DEFAULT 'USD',
	`salary_period` text,
	`application_url` text NOT NULL,
	`application_deadline` text,
	`source_id` text,
	`source_url` text NOT NULL,
	`source_name` text,
	`discovered_at` text,
	`verification_score` integer,
	`verification_status` text DEFAULT 'pending',
	`verification_notes` text,
	`company_verified` integer DEFAULT false,
	`url_verified` integer DEFAULT false,
	`verified_at` text,
	`status` text DEFAULT 'discovered',
	`approved_at` text,
	`approved_by` text,
	`rejection_reason` text,
	`fingerprint` text,
	`telegram_content` text,
	`instagram_content` text,
	`priority` integer DEFAULT 50,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jobs_fingerprint_unique` ON `jobs` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `news` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`summary` text,
	`content` text,
	`source_id` text,
	`source_url` text NOT NULL,
	`source_name` text,
	`original_published_at` text,
	`discovered_at` text,
	`category` text NOT NULL,
	`tags` text,
	`verification_score` integer,
	`verification_status` text DEFAULT 'pending',
	`verification_notes` text,
	`verified_at` text,
	`status` text DEFAULT 'discovered',
	`approved_at` text,
	`approved_by` text,
	`rejection_reason` text,
	`fingerprint` text,
	`url_hash` text,
	`telegram_content` text,
	`instagram_content` text,
	`priority` integer DEFAULT 50,
	`created_at` text,
	`updated_at` text,
	FOREIGN KEY (`source_id`) REFERENCES `sources`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_fingerprint_unique` ON `news` (`fingerprint`);--> statement-breakpoint
CREATE TABLE `publications` (
	`id` text PRIMARY KEY NOT NULL,
	`content_type` text NOT NULL,
	`content_id` text NOT NULL,
	`platform` text NOT NULL,
	`platform_post_id` text,
	`platform_url` text,
	`media_urls` text,
	`status` text DEFAULT 'pending',
	`error_message` text,
	`retry_count` integer DEFAULT 0,
	`scheduled_for` text,
	`published_at` text,
	`created_at` text
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text,
	`updated_at` text
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`url` text NOT NULL,
	`category` text NOT NULL,
	`reliability_score` integer DEFAULT 50,
	`is_primary_source` integer DEFAULT false,
	`config` text,
	`check_interval_minutes` integer DEFAULT 30,
	`last_checked_at` text,
	`is_active` integer DEFAULT true,
	`error_count` integer DEFAULT 0,
	`last_error` text,
	`created_at` text,
	`updated_at` text
);
