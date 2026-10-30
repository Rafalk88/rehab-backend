/*
  Warnings:

  - A unique constraint covering the columns `[role_id,permission]` on the table `RolePermission` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_id_permission_key" ON "RolePermission"("role_id", "permission");
