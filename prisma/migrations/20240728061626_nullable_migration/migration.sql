-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StoreInformation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domainName" TEXT,
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
PRAGMA foreign_key_check("StoreInformation");
PRAGMA foreign_keys=ON;
