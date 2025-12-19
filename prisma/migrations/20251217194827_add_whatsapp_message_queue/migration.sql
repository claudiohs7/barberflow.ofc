-- CreateTable
CREATE TABLE `whatsappmessagequeue` (
    `id` VARCHAR(191) NOT NULL,
    `barbershopId` VARCHAR(191) NOT NULL,
    `appointmentId` VARCHAR(191) NOT NULL,
    `templateType` VARCHAR(100) NOT NULL,
    `scheduledFor` DATETIME(3) NOT NULL,
    `status` VARCHAR(20) NOT NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` TEXT NULL,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WhatsappMessageQueue_barbershopId_fkey`(`barbershopId`),
    INDEX `WhatsappMessageQueue_scheduledFor_idx`(`scheduledFor`),
    INDEX `WhatsappMessageQueue_status_idx`(`status`),
    UNIQUE INDEX `WhatsappMessageQueue_appointment_template_unique`(`appointmentId`, `templateType`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `whatsappmessagequeue` ADD CONSTRAINT `WhatsappMessageQueue_barbershopId_fkey` FOREIGN KEY (`barbershopId`) REFERENCES `barbershop`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `whatsappmessagequeue` ADD CONSTRAINT `WhatsappMessageQueue_appointmentId_fkey` FOREIGN KEY (`appointmentId`) REFERENCES `appointment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
