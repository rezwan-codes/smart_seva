-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "citizenId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_complaintId_key" ON "Review"("complaintId");

-- CreateIndex
CREATE INDEX "Review_technicianId_idx" ON "Review"("technicianId");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_citizenId_fkey" FOREIGN KEY ("citizenId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "Technician"("id") ON DELETE CASCADE ON UPDATE CASCADE;
