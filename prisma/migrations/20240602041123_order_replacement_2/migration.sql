/*
  Warnings:

  - The primary key for the `OrderReplacement` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `OrderReplacement` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `quantity` on the `OrderReplacement` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `replacementQuantity` on the `OrderReplacement` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - Added the required column `originalProductID` to the `OrderReplacement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `replacementProductID` to the `OrderReplacement` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OrderReplacement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "originalProductID" TEXT NOT NULL,
    "originalProduct" TEXT NOT NULL,
    "quantity" INTEGER,
    "unitPrice" REAL,
    "totalPrice" REAL,
    "replacementProductID" TEXT NOT NULL,
    "replacementProduct" TEXT,
    "replacementQuantity" INTEGER,
    "replacementPrice" REAL,
    "totalReplacementAmount" REAL,
    "balance" REAL,
    "orderStatus" TEXT
);
INSERT INTO "new_OrderReplacement" ("balance", "id", "orderStatus", "originalProduct", "quantity", "replacementPrice", "replacementProduct", "replacementQuantity", "totalPrice", "totalReplacementAmount", "unitPrice") SELECT "balance", "id", "orderStatus", "originalProduct", "quantity", "replacementPrice", "replacementProduct", "replacementQuantity", "totalPrice", "totalReplacementAmount", "unitPrice" FROM "OrderReplacement";
DROP TABLE "OrderReplacement";
ALTER TABLE "new_OrderReplacement" RENAME TO "OrderReplacement";
PRAGMA foreign_key_check("OrderReplacement");
PRAGMA foreign_keys=ON;
