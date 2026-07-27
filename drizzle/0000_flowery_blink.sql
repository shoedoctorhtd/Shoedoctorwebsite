CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`reference` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`email` text,
	`service_id` text NOT NULL,
	`service_name` text NOT NULL,
	`shoe_type` text NOT NULL,
	`shoe_brand` text,
	`preferred_date` text,
	`notes` text,
	`express_requested` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bookings_reference_unique` ON `bookings` (`reference`);--> statement-breakpoint
CREATE INDEX `bookings_status_created_idx` ON `bookings` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`price_label` text NOT NULL,
	`special_price_label` text,
	`turnaround` text NOT NULL,
	`description` text NOT NULL,
	`features` text DEFAULT '[]' NOT NULL,
	`badge` text,
	`tone` text DEFAULT 'lime' NOT NULL,
	`icon` text DEFAULT '+' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `services_category_sort_idx` ON `services` (`category`,`sort_order`);