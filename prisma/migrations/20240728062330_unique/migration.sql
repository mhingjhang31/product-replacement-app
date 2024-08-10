/*
  Warnings:

  - Made the column `domainName` on table `StoreInformation` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreInformation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domainName" TEXT NOT NULL,
    "companyName" TEXT,
    "emailContent" TEXT,
    "contactNo" TEXT,
    "whatsappNo" TEXT,
    "senderName" TEXT,
    "email" TEXT,
    "companyAddress" TEXT,
    "copyRightYear" TEXT,
    "emailColor" TEXT,
    "durationOfEmailExpiration" INTEGER
);
INSERT INTO "new_StoreInformation" ("companyAddress", "companyName", "contactNo", "copyRightYear", "domainName", "durationOfEmailExpiration", "email", "emailColor", "emailContent", "id", "senderName", "whatsappNo") SELECT "companyAddress", "companyName", "contactNo", "copyRightYear", "domainName", "durationOfEmailExpiration", "email", "emailColor", "emailContent", "id", "senderName", "whatsappNo" FROM "StoreInformation";
DROP TABLE "StoreInformation";
ALTER TABLE "new_StoreInformation" RENAME TO "StoreInformation";
CREATE UNIQUE INDEX "StoreInformation_domainName_key" ON "StoreInformation"("domainName");
PRAGMA foreign_key_check("StoreInformation");
PRAGMA foreign_keys=ON;
