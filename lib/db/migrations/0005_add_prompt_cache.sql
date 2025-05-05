-- Create PromptCache table
CREATE TABLE IF NOT EXISTS `PromptCache` (
    `id` text PRIMARY KEY NOT NULL,
    `promptHash` text NOT NULL,
    `response` text NOT NULL,
    `model` text NOT NULL,
    `promptTokens` integer NOT NULL,
    `completionTokens` integer NOT NULL,
    `totalTokens` integer NOT NULL,
    `createdAt` integer NOT NULL,
    `lastAccessed` integer NOT NULL
); 