-- CreateTable
CREATE TABLE "OrderReplacement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalProduct" TEXT NOT NULL,
    "quantity" TEXT NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL,
    "replacementProduct" DATETIME,
    "replacementQuantity" TEXT NOT NULL,
    "replacementPrice" REAL,
    "totalReplacementAmount" REAL,
    "balance" REAL,
    "orderStatus" INTEGER
);
