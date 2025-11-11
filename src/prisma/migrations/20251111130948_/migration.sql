/*
  Warnings:

  - A unique constraint covering the columns `[user_id,role_id]` on the table `UserRole` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserRole_user_id_role_id_key" ON "public"."UserRole"("user_id", "role_id");
