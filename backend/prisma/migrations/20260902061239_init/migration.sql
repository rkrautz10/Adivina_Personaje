-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('IN_PROGRESS', 'FINISHED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "alias" VARCHAR(30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "difficultyLevel" "DifficultyLevel" NOT NULL DEFAULT 'EASY',
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "entityId" INTEGER NOT NULL,
    "entityName" VARCHAR(100) NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'ACTIVE',
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "hints" JSONB,
    "correct" BOOLEAN,
    "score" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityCache" (
    "entityId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "attributes" JSONB NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "EntityCache_pkey" PRIMARY KEY ("entityId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_alias_key" ON "Player"("alias");

-- CreateIndex
CREATE INDEX "Match_playerId_idx" ON "Match"("playerId");

-- CreateIndex
CREATE INDEX "Match_status_finishedAt_idx" ON "Match"("status", "finishedAt");

-- CreateIndex
CREATE INDEX "Round_matchId_idx" ON "Round"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "Round_matchId_roundNumber_key" ON "Round"("matchId", "roundNumber");

-- CreateIndex
CREATE INDEX "EntityCache_expiresAt_idx" ON "EntityCache"("expiresAt");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
