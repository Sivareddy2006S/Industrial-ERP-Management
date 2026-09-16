const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('@localhost:', '@127.0.0.1:') : undefined;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Users ──────────────────────────────────────────────────
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const salesPassword = await bcrypt.hash('Sales@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { password: adminPassword },
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Admin User',
      role: 'ADMIN',
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: { password: salesPassword },
    create: {
      email: 'sales@example.com',
      password: salesPassword,
      name: 'Sales User',
      role: 'SALES',
    },
  });

  console.log('✅ Users seeded');

  // ─── Customers ────────────────────────────────────────────────
  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { email: 'info@abcengineering.com' },
      update: {},
      create: {
        companyName: 'ABC Engineering Pvt. Ltd.',
        contactPerson: 'Rajesh Kumar',
        mobile: '9876543210',
        email: 'info@abcengineering.com',
        city: 'Mumbai',
      },
    }),
    prisma.customer.upsert({
      where: { email: 'contact@steelworks.com' },
      update: {},
      create: {
        companyName: 'National Steel Works',
        contactPerson: 'Priya Sharma',
        mobile: '9876543211',
        email: 'contact@steelworks.com',
        city: 'Pune',
      },
    }),
    prisma.customer.upsert({
      where: { email: 'purchase@heavyindustries.com' },
      update: {},
      create: {
        companyName: 'Metro Heavy Industries',
        contactPerson: 'Suresh Patel',
        mobile: '9876543212',
        email: 'purchase@heavyindustries.com',
        city: 'Ahmedabad',
      },
    }),
  ]);

  console.log('✅ Customers seeded');

  // ─── Products ─────────────────────────────────────────────────
  const productData = [
    {
      productCode: 'IND-A001',
      productName: 'Industrial Hydraulic Press',
      category: 'Heavy Machinery',
      unit: 'PCS',
      basePrice: 45000.00,
    },
    {
      productCode: 'IND-B001',
      productName: 'CNC Lathe Machine',
      category: 'Machine Tools',
      unit: 'PCS',
      basePrice: 125000.00,
    },
    {
      productCode: 'IND-C001',
      productName: 'Industrial Air Compressor',
      category: 'Pneumatic Equipment',
      unit: 'PCS',
      basePrice: 32000.00,
    },
    {
      productCode: 'IND-D001',
      productName: 'Stainless Steel Pipe (6m)',
      category: 'Raw Materials',
      unit: 'MTR',
      basePrice: 2500.00,
    },
    {
      productCode: 'IND-E001',
      productName: 'Industrial Ball Bearing',
      category: 'Components',
      unit: 'PCS',
      basePrice: 850.00,
    },
    {
      productCode: 'IND-F001',
      productName: 'Electric Motor 5HP',
      category: 'Electrical',
      unit: 'PCS',
      basePrice: 15000.00,
    },
  ];

  const products = [];
  for (const pd of productData) {
    const product = await prisma.product.upsert({
      where: { productCode: pd.productCode },
      update: {},
      create: pd,
    });
    products.push(product);
  }

  console.log('✅ Products seeded');

  // ─── Inventory ────────────────────────────────────────────────
  const inventoryData = [
    { productId: products[0].id, physicalQuantity: 150, reservedQuantity: 20 },
    { productId: products[1].id, physicalQuantity: 50, reservedQuantity: 10 },
    { productId: products[2].id, physicalQuantity: 200, reservedQuantity: 30 },
    { productId: products[3].id, physicalQuantity: 500, reservedQuantity: 50 },
    { productId: products[4].id, physicalQuantity: 1000, reservedQuantity: 100 },
    { productId: products[5].id, physicalQuantity: 100, reservedQuantity: 15 },
  ];

  for (const inv of inventoryData) {
    await prisma.inventory.upsert({
      where: { productId: inv.productId },
      update: {},
      create: inv,
    });
  }

  console.log('✅ Inventory seeded');

  // ─── Sample Enquiry ───────────────────────────────────────────
  const existingEnquiry = await prisma.enquiry.findUnique({
    where: { enquiryNumber: 'ENQ-0001' },
  });

  if (!existingEnquiry) {
    await prisma.enquiry.create({
      data: {
        enquiryNumber: 'ENQ-0001',
        customerId: customers[0].id,
        enquiryDate: new Date(),
        requiredDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        notes: 'Urgent requirement for production line upgrade',
        status: 'NEW',
        createdById: salesUser.id,
        items: {
          create: [
            { productId: products[0].id, quantity: 100 },
            { productId: products[1].id, quantity: 40 },
            { productId: products[2].id, quantity: 200 },
          ],
        },
      },
    });
    console.log('✅ Sample enquiry seeded');
  }

  console.log('🎉 Database seeding complete!');
  console.log('');
  console.log('Login credentials:');
  console.log('  Admin: admin@example.com / Admin@123');
  console.log('  Sales: sales@example.com / Sales@123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
