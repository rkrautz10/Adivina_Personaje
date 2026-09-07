-- CreateEnum
CREATE TYPE "GameMode" AS ENUM ('STANDARD', 'STREAK');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "gameMode" "GameMode" NOT NULL DEFAULT 'STANDARD';
