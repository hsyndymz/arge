CREATE TABLE `provinces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	CONSTRAINT `provinces_id` PRIMARY KEY(`id`),
	CONSTRAINT `provinces_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `quarries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`imageUrl` text,
	`description` text,
	`province` varchar(100),
	`district` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quarries_id` PRIMARY KEY(`id`)
);
