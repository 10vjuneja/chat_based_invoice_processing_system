CREATE TABLE IF NOT EXISTS `InvoiceTokenUsage` (
    `id` text PRIMARY KEY NOT NULL,
    `invoiceId` text NOT NULL,
    `model` text NOT NULL,
    `promptTokens` integer NOT NULL,
    `completionTokens` integer NOT NULL,
    `totalTokens` integer NOT NULL,
    `createdAt` integer NOT NULL,
    FOREIGN KEY (`invoiceId`) REFERENCES `Invoice`(`id`) ON UPDATE no action ON DELETE no action
); 