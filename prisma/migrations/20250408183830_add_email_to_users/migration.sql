/*
  Warnings:

  - You are about to drop the column `email` on the `Contact` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Contact` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id]` on the table `Contact` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Contact_email_key";

-- AlterTable
ALTER TABLE "Contact" DROP COLUMN "email",
DROP COLUMN "phone",
ADD COLUMN     "emails" TEXT[],
ADD COLUMN     "phones" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Contact_id_key" ON "Contact"("id");
