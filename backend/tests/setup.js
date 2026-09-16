const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

/**
 * Test setup utilities.
 * Creates test data and cleans up after tests.
 */

async function setupTestDB() {
  // Clean all data in reverse dependency order
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.enquiryItem.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const adminPassword = await bcrypt.hash('Admin@123', 4); // Low rounds for speed
  const salesPassword = await bcrypt.hash('Sales@123', 4);

  const admin = await prisma.user.create({
    data: { email: 'admin@test.com', password: adminPassword, name: 'Test Admin', role: 'ADMIN' },
  });

  const sales = await prisma.user.create({
    data: { email: 'sales@test.com', password: salesPassword, name: 'Test Sales', role: 'SALES' },
  });

  // Create test customer
  const customer = await prisma.customer.create({
    data: {
      companyName: 'Test Corp',
      contactPerson: 'John Doe',
      mobile: '1234567890',
      email: 'test@test.com',
      city: 'TestCity',
    },
  });

  // Create test products
  const productA = await prisma.product.create({
    data: { productCode: 'TEST-A', productName: 'Test Product A', category: 'Test', unit: 'PCS', basePrice: 1000 },
  });
  const productB = await prisma.product.create({
    data: { productCode: 'TEST-B', productName: 'Test Product B', category: 'Test', unit: 'PCS', basePrice: 2000 },
  });

  // Create inventory
  await prisma.inventory.create({
    data: { productId: productA.id, physicalQuantity: 100, reservedQuantity: 0 },
  });
  await prisma.inventory.create({
    data: { productId: productB.id, physicalQuantity: 50, reservedQuantity: 0 },
  });

  return { admin, sales, customer, productA, productB };
}

async function cleanupTestDB() {
  await prisma.dispatchItem.deleteMany();
  await prisma.dispatch.deleteMany();
  await prisma.salesOrderItem.deleteMany();
  await prisma.salesOrder.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.enquiryItem.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
}

module.exports = { prisma, setupTestDB, cleanupTestDB };
