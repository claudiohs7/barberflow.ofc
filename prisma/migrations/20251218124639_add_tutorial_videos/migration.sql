-- CreateTable
CREATE TABLE `tutorialvideo` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `youtubeUrl` VARCHAR(500) NOT NULL,
    `youtubeId` VARCHAR(50) NULL,
    `targetEmail` VARCHAR(255) NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `TutorialVideo_targetEmail_idx`(`targetEmail`),
    INDEX `TutorialVideo_enabled_idx`(`enabled`),
    INDEX `TutorialVideo_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
