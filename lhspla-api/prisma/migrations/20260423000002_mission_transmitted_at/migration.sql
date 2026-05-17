-- Migration: mission_transmitted_at
-- Ajoute transmittedAt sur MissionRequest pour tracer la transmission assistant_direction → COP

ALTER TABLE "MissionRequest" ADD COLUMN IF NOT EXISTS "transmittedAt" TIMESTAMP(3);
