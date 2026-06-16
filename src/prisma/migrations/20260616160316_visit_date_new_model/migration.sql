/*
  Warnings:

  - You are about to drop the column `date` on the `Visit` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Visit" DROP COLUMN "date",
ADD COLUMN     "billed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ewus_verified_at" TIMESTAMP(3),
ADD COLUMN     "planned_date" TIMESTAMP(3),
ADD COLUMN     "register_date" TIMESTAMP(3);
