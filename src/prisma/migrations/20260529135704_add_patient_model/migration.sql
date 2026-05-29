-- CreateEnum
CREATE TYPE "PeselStatus" AS ENUM ('ASSIGNED', 'UNASSIGNED', 'UNKNOWN', 'NEWBORN', 'FOREIGNER_EU', 'FOREIGNER_NON_EU');

-- CreateTable
CREATE TABLE "Patient" (
    "id" UUID NOT NULL,
    "pesel_hmac" TEXT NOT NULL,
    "pesel_encrypted" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "first_name_id" UUID,
    "second_name_id" UUID,
    "surname_id" UUID,
    "date_of_birth" TIMESTAMP(3) NOT NULL,
    "sex_id" UUID,
    "pesel_status" "PeselStatus" NOT NULL DEFAULT 'ASSIGNED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID,
    "updated_by" UUID,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_pesel_hmac_key" ON "Patient"("pesel_hmac");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_first_name_id_fkey" FOREIGN KEY ("first_name_id") REFERENCES "GivenName"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_second_name_id_fkey" FOREIGN KEY ("second_name_id") REFERENCES "GivenName"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_surname_id_fkey" FOREIGN KEY ("surname_id") REFERENCES "Surname"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_sex_id_fkey" FOREIGN KEY ("sex_id") REFERENCES "Sex"("id") ON DELETE SET NULL ON UPDATE CASCADE;
