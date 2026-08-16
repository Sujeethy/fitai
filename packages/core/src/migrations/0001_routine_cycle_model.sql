CREATE TABLE `routine_days` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`routine_version_id` text NOT NULL,
	`day_index` integer NOT NULL,
	`name` text NOT NULL,
	`is_rest_day` integer DEFAULT false NOT NULL,
	`warmup_note` text
);
--> statement-breakpoint
CREATE INDEX `idx_routine_days_version` ON `routine_days` (`routine_version_id`,`day_index`);--> statement-breakpoint
CREATE TABLE `routine_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`routine_exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`set_type` text DEFAULT 'working' NOT NULL,
	`target_weight_kg` real,
	`target_reps` integer,
	`target_note` text,
	`rest_seconds` integer
);
--> statement-breakpoint
CREATE INDEX `idx_routine_sets_exercise` ON `routine_sets` (`routine_exercise_id`,`position`);--> statement-breakpoint
ALTER TABLE `routines` ADD `cycle_length` integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `routines` ADD `anchor_date` text;--> statement-breakpoint
ALTER TABLE `routines` ADD `is_active` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `session_exercises` ADD `routine_exercise_id` text;
--> statement-breakpoint
DROP INDEX `idx_routine_exercises_version`;--> statement-breakpoint
ALTER TABLE `routine_exercises` DROP COLUMN `routine_version_id`;--> statement-breakpoint
ALTER TABLE `routine_exercises` DROP COLUMN `target_sets`;--> statement-breakpoint
ALTER TABLE `routine_exercises` DROP COLUMN `target_reps_low`;--> statement-breakpoint
ALTER TABLE `routine_exercises` DROP COLUMN `target_reps_high`;
--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `routine_day_id` text;--> statement-breakpoint
ALTER TABLE `routine_exercises` ADD `note` text;--> statement-breakpoint
CREATE INDEX `idx_routine_exercises_day` ON `routine_exercises` (`routine_day_id`,`position`);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`routine_day_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`note` text
);
--> statement-breakpoint
INSERT INTO `__new_routine_exercises`("id", "user_id", "created_at", "updated_at", "deleted_at", "routine_day_id", "exercise_id", "position", "note") SELECT "id", "user_id", "created_at", "updated_at", "deleted_at", "routine_day_id", "exercise_id", "position", "note" FROM `routine_exercises`;--> statement-breakpoint
DROP TABLE `routine_exercises`;--> statement-breakpoint
ALTER TABLE `__new_routine_exercises` RENAME TO `routine_exercises`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_routine_exercises_day` ON `routine_exercises` (`routine_day_id`,`position`);
