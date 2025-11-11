/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `login` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[login_hmac]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email_hmac]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `entity_id` on the `OperationLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `email_encrypted` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email_hmac` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email_masked` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `login_encrypted` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `login_hmac` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `login_masked` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."OperationLog" DROP CONSTRAINT "OperationLog_user_id_fkey";

-- DropIndex
DROP INDEX "public"."User_email_key";

-- DropIndex
DROP INDEX "public"."User_login_key";

-- AlterTable
ALTER TABLE "public"."OperationLog" ALTER COLUMN "user_id" DROP NOT NULL,
DROP COLUMN "entity_id",
ADD COLUMN     "entity_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "email",
DROP COLUMN "login",
ADD COLUMN     "email_encrypted" TEXT NOT NULL,
ADD COLUMN     "email_hmac" TEXT NOT NULL,
ADD COLUMN     "email_masked" TEXT NOT NULL,
ADD COLUMN     "key_version" TEXT,
ADD COLUMN     "login_encrypted" TEXT NOT NULL,
ADD COLUMN     "login_hmac" TEXT NOT NULL,
ADD COLUMN     "login_masked" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_login_hmac_key" ON "public"."User"("login_hmac");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_hmac_key" ON "public"."User"("email_hmac");

-- AddForeignKey
ALTER TABLE "public"."OperationLog" ADD CONSTRAINT "OperationLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
