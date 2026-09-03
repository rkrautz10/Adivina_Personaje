/*
  Warnings:

  - A unique constraint covering the columns `[normalizedAlias]` on the table `Player` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `normalizedAlias` to the `Player` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Player_alias_key";

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "normalizedAlias" VARCHAR(30) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Player_normalizedAlias_key" ON "Player"("normalizedAlias");
