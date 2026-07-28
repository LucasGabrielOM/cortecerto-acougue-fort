CREATE TABLE `break_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`report_id` integer NOT NULL,
	`product_id` integer,
	`product_name` text NOT NULL,
	`quantity_kg` real NOT NULL,
	`cost` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `break_reports`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `break_reports` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`requisition` text DEFAULT '' NOT NULL,
	`employee` text NOT NULL,
	`total_kg` real NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text DEFAULT 'Bovina' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `time_offs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`employee` text NOT NULL,
	`date` text NOT NULL,
	`type` text DEFAULT 'Semanal' NOT NULL,
	`status` text DEFAULT 'Solicitada' NOT NULL,
	`coverage` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
