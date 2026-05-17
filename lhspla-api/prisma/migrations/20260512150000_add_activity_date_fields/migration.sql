-- Add structured date fields to Activity (Section B)
ALTER TABLE "Activity" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "Activity" ADD COLUMN "endDate" TIMESTAMP(3);

-- Add structured date fields to PlannedActivity (Section C)
ALTER TABLE "PlannedActivity" ADD COLUMN "startDate" TIMESTAMP(3);
ALTER TABLE "PlannedActivity" ADD COLUMN "endDate" TIMESTAMP(3);
