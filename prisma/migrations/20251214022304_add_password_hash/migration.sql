-- AlterTable
ALTER TABLE `user` ADD COLUMN `passwordHash` VARCHAR(255) NULL,
    ADD COLUMN `refreshToken` TEXT NULL;
