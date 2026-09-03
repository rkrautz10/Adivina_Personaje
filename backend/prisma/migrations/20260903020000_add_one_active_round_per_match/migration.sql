CREATE UNIQUE INDEX "Round_one_active_per_match"
ON "Round" ("matchId")
WHERE "status" = 'ACTIVE';