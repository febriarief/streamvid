import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { PrismaClient } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not configured');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function upsertUser(input: {
  email: string;
  username: string;
  passwordHash: string;
  role: Role;
}) {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: input.email }, { username: input.username }],
    },
  });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
        role: input.role,
      },
    });
  }

  return prisma.user.create({
    data: input,
  });
}

async function main() {
  console.log('Seeding...');

  const adminPassword = await bcrypt.hash('Admin123!', 12);
  const admin = await upsertUser({
    email: 'admin@streamvid.local',
    username: 'admin',
    passwordHash: adminPassword,
    role: Role.ADMIN,
  });
  console.log('Admin user:', admin.email);

  const userPassword = await bcrypt.hash('User123!', 12);
  const user = await upsertUser({
    email: 'user@streamvid.local',
    username: 'demouser',
    passwordHash: userPassword,
    role: Role.USER,
  });
  console.log('Demo user:', user.email);

  const categories = ['Action', 'Comedy', 'Drama', 'Horror', 'Documentary', 'Animation'];
  for (const name of categories) {
    const slug = name.toLowerCase();
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
  }

  console.log('Categories seeded:', categories.join(', '));
  console.log('Seeding complete!');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
