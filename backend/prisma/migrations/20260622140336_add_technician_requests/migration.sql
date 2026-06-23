-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('ASSIGNMENT', 'HELP', 'REASSIGN', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "TechnicianRequest" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL DEFAULT 'ASSIGNMENT',
    "message" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TechnicianRequest_status_idx" ON "TechnicianRequest"("status");

-- CreateIndex
CREATE INDEX "TechnicianRequest_technicianId_idx" ON "TechnicianRequest"("technicianId");

-- AddForeignKey
ALTER TABLE "TechnicianRequest" ADD CONSTRAINT "TechnicianRequest_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianRequest" ADD CONSTRAINT "TechnicianRequest_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;
