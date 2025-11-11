/*
  Warnings:

  - The `key_version` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "key_version",
ADD COLUMN     "key_version" INTEGER NOT NULL DEFAULT 1;
