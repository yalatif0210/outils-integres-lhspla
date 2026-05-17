-- Migration: multi_roles_tpm_tdr
-- 1. Multi-rôles : role Role → roles Role[]
-- 2. Workflow mission : ajout statut pending_tpm
-- 3. TDR : ajout tdrFilePath + tdrFileExt sur BudgetProject

-- ─── 1. Ajouter pending_tpm à l'enum MissionStatus ──────────────────────────
ALTER TYPE "MissionStatus" ADD VALUE IF NOT EXISTS 'pending_tpm' BEFORE 'pending_cop';

-- ─── 2. TDR sur BudgetProject ────────────────────────────────────────────────
ALTER TABLE "BudgetProject" ADD COLUMN IF NOT EXISTS "tdrFilePath" TEXT;
ALTER TABLE "BudgetProject" ADD COLUMN IF NOT EXISTS "tdrFileExt"  TEXT;

-- ─── 3. Multi-rôles : Role[] sur User ────────────────────────────────────────
-- 3a. Ajouter la colonne roles (tableau vide par défaut)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roles" "Role"[] NOT NULL DEFAULT ARRAY[]::"Role"[];

-- 3b. Copier le role existant dans le tableau roles
UPDATE "User" SET "roles" = ARRAY["role"::"Role"] WHERE array_length("roles", 1) IS NULL OR array_length("roles", 1) = 0;

-- 3c. Supprimer l'ancienne colonne role
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";

-- 3d. Supprimer l'ancien index sur role
DROP INDEX IF EXISTS "User_role_idx";
