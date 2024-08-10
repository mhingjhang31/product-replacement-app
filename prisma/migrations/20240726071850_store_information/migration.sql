-- CreateTable
CREATE TABLE "StoreInformation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domainName" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "emailContent" TEXT NOT NULL,
    "contactNo" TEXT NOT NULL,
    "whatsappNo" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyAddress" TEXT NOT NULL,
    "copyRightYear" TEXT NOT NULL,
    "emailColor" TEXT NOT NULL,
    "durationOfEmailExpiration" INTEGER NOT NULL
);
