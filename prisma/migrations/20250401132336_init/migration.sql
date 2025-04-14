-- CreateTable
CREATE TABLE `Card` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `cardNumber` VARCHAR(191) NOT NULL,
    `pinCode` VARCHAR(191) NOT NULL,
    `balance` VARCHAR(191) NULL,
    `validityDate` VARCHAR(191) NULL,

    UNIQUE INDEX `Card_cardNumber_key`(`cardNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
