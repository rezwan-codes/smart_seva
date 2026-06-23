export const createComplaintToken = (nextNumber) =>
  `DQ-${String(1000 + nextNumber).padStart(4, "0")}`;

export async function createUniqueComplaintToken(prisma) {
  const totalCount = await prisma.complaint.count();

  for (let offset = 1; offset <= 1000; offset += 1) {
    const token = createComplaintToken(totalCount + offset);
    const existing = await prisma.complaint.findUnique({
      where: { token },
      select: { id: true },
    });

    if (!existing) {
      return token;
    }
  }

  return `DQ-${Date.now()}`;
}
