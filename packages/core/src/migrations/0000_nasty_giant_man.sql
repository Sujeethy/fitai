CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`height_cm` integer,
	`birth_year` integer,
	`goal` text,
	`experience` text,
	`constraints` text,
	`units` text DEFAULT 'kg' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`display_name` text,
	`is_local` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE TABLE `exercise_substitutes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`from_exercise_id` text NOT NULL,
	`to_exercise_id` text NOT NULL,
	`score` real DEFAULT 0.5 NOT NULL,
	`times_used` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_substitutes_from` ON `exercise_substitutes` (`user_id`,`from_exercise_id`,`score`);--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`primary_muscle` text NOT NULL,
	`secondary_muscles` text NOT NULL,
	`equipment` text NOT NULL,
	`aliases` text NOT NULL,
	`increment_kg` real DEFAULT 2.5 NOT NULL,
	`is_custom` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_exercises_user_name` ON `exercises` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_exercises_user_muscle` ON `exercises` (`user_id`,`primary_muscle`);--> statement-breakpoint
CREATE TABLE `routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`routine_version_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL,
	`target_sets` integer,
	`target_reps_low` integer,
	`target_reps_high` integer
);
--> statement-breakpoint
CREATE INDEX `idx_routine_exercises_version` ON `routine_exercises` (`routine_version_id`,`position`);--> statement-breakpoint
CREATE TABLE `routine_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`routine_id` text NOT NULL,
	`version_number` integer NOT NULL,
	`change_note` text
);
--> statement-breakpoint
CREATE INDEX `idx_routine_versions_routine` ON `routine_versions` (`user_id`,`routine_id`,`version_number`);--> statement-breakpoint
CREATE TABLE `routines` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`name` text NOT NULL,
	`current_version_id` text,
	`archived_at` text
);
--> statement-breakpoint
CREATE TABLE `body_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`date` text NOT NULL,
	`weight_kg` real NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `idx_body_weights_user_date` ON `body_weights` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`planned_exercise_id` text,
	`substitution_reason` text,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_session_exercises_session` ON `session_exercises` (`session_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_session_exercises_planned` ON `session_exercises` (`user_id`,`planned_exercise_id`);--> statement-breakpoint
CREATE TABLE `session_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_session_plan_session` ON `session_plan` (`session_id`,`position`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`date` text NOT NULL,
	`origin` text NOT NULL,
	`routine_version_id` text,
	`started_at` text NOT NULL,
	`finished_at` text,
	`body_weight_kg` real,
	`notes` text
);
--> statement-breakpoint
CREATE INDEX `idx_sessions_user_date` ON `sessions` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `sets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`session_exercise_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`weight_kg` real NOT NULL,
	`reps` integer NOT NULL,
	`rpe` real,
	`set_type` text DEFAULT 'working' NOT NULL,
	`completed` integer DEFAULT true NOT NULL,
	`position` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_sets_session_exercise` ON `sets` (`session_exercise_id`,`position`);--> statement-breakpoint
CREATE INDEX `idx_sets_user_exercise_created` ON `sets` (`user_id`,`exercise_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`thread_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`provider_id` text,
	`model` text,
	`turn_index` integer NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`latency_ms` integer,
	`error_kind` text
);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_thread` ON `chat_messages` (`thread_id`,`turn_index`);--> statement-breakpoint
CREATE TABLE `chat_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`title` text,
	`session_id` text
);
--> statement-breakpoint
CREATE INDEX `idx_chat_threads_user` ON `chat_threads` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `change_journal` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`actor` text NOT NULL,
	`provider` text,
	`tool` text,
	`entity_table` text NOT NULL,
	`entity_id` text NOT NULL,
	`operation` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`batch_id` text NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_journal_user_created` ON `change_journal` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_journal_batch` ON `change_journal` (`batch_id`);--> statement-breakpoint
CREATE INDEX `idx_journal_pending` ON `change_journal` (`user_id`,`synced_at`,`created_at`);--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	`key` text NOT NULL,
	`value` text NOT NULL
);
