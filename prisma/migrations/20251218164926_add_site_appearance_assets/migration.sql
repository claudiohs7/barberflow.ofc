-- CreateTable
CREATE TABLE `SiteAppearance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `homeHeroDesktopPath` VARCHAR(500) NULL,
    `homeHeroMobilePath` VARCHAR(500) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
