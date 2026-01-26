/*
  Warnings:

  - The `entity_id` column on the `OperationLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "OperationLog" DROP COLUMN "entity_id",
ADD COLUMN     "entity_id" JSONB;
