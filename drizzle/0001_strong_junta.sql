ALTER TABLE `bookings` ADD `fulfillment_method` text DEFAULT 'self_dropoff' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `pickup_address` text;--> statement-breakpoint
ALTER TABLE `bookings` ADD `location_url` text;