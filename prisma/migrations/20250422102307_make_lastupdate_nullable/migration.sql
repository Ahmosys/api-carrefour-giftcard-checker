/*
  Warnings:

  - You are about to alter the column `cardNumber` on the `Card` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Char(23)`.
  - You are about to alter the column `pinCode` on the `Card` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Char(4)`.

*/
-- AlterTable
ALTER TABLE `Card` ADD COLUMN `lastUpdate` DATETIME(3) NULL,
    MODIFY `cardNumber` CHAR(23) NOT NULL,
    MODIFY `pinCode` CHAR(4) NOT NULL;
