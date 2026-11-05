-- AlterTable
ALTER TABLE "BodyMetric" ADD COLUMN     "focus" INTEGER,
ALTER COLUMN "weight" DROP NOT NULL;
