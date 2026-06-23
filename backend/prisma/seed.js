import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const passwordHash = await bcrypt.hash("password123", 12);

async function main() {
  await prisma.statusHistory.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@smartutility.local",
      passwordHash,
      phone: "+880 1700-000000",
      role: "ADMIN",
    },
  });

  const citizen = await prisma.user.create({
    data: {
      name: "Citizen User",
      email: "citizen@smartutility.local",
      passwordHash,
      phone: "+880 1711-111111",
      role: "CITIZEN",
    },
  });

  const aminul = await prisma.user.create({
    data: {
      name: "Aminul Islam",
      email: "aminul@smartutility.local",
      passwordHash,
      phone: "+880 1712-445566",
      role: "TECHNICIAN",
      technician: {
        create: {
          skill: "ELECTRICITY",
          area: "Dhanmondi",
          distanceKm: 1.2,
          etaMinutes: 18,
          rating: 4.8,
        },
      },
    },
    include: { technician: true },
  });

  await prisma.user.create({
    data: {
      name: "Nusrat Jahan",
      email: "nusrat@smartutility.local",
      passwordHash,
      phone: "+880 1811-339900",
      role: "TECHNICIAN",
      technician: {
        create: {
          skill: "WATER",
          area: "Mirpur",
          distanceKm: 0.9,
          etaMinutes: 12,
          rating: 4.9,
        },
      },
    },
  });

  await prisma.user.create({
    data: {
      name: "Rakib Hasan",
      email: "rakib@smartutility.local",
      passwordHash,
      phone: "+880 1915-778899",
      role: "TECHNICIAN",
      technician: {
        create: {
          skill: "GAS",
          area: "Uttara",
          distanceKm: 1.8,
          etaMinutes: 24,
          rating: 4.7,
        },
      },
    },
  });

  await prisma.complaint.create({
    data: {
      token: "DQ-1024",
      title: "Transformer sparking near Road 7",
      description: "Transformer has been sparking since morning and nearby homes are affected.",
      type: "ELECTRICITY",
      area: "Dhanmondi",
      address: "Road 7, Dhanmondi",
      status: "PROCESSING",
      priority: "EMERGENCY",
      position: 1,
      citizenId: citizen.id,
      technicianId: aminul.technician.id,
      statusHistory: {
        create: {
          status: "PROCESSING",
          note: "Seed complaint assigned to technician",
        },
      },
    },
  });

  console.log(`Seeded users including ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
