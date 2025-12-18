-- CreateTable
CREATE TABLE `whatsappmessagelog` (
    `id` VARCHAR(191) NOT NULL,
    `barbershopId` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NULL,
    `clientName` VARCHAR(191) NULL,
    `clientPhone` VARCHAR(50) NULL,
    `templateType` VARCHAR(100) NULL,
    `status` VARCHAR(20) NOT NULL,
    `message` TEXT NOT NULL,
    `sentAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `details` TEXT NULL,

    INDEX `WhatsappMessageLog_barbershopId_fkey`(`barbershopId`),
    INDEX `WhatsappMessageLog_appointmentId_idx`(`appointmentId`),
    INDEX `WhatsappMessageLog_sentAt_idx`(`sentAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `whatsappmessagelog` ADD CONSTRAINT `WhatsappMessageLog_barbershopId_fkey` FOREIGN KEY (`barbershopId`) REFERENCES `barbershop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
