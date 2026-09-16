const request = require('supertest');
const app = require('../src/app');
const { prisma, setupTestDB, cleanupTestDB } = require('./setup');
const jwt = require('jsonwebtoken');
const config = require('../src/config');

let admin, sales, customer, productA, productB;
let adminToken, salesToken;

beforeAll(async () => {
  const data = await setupTestDB();
  admin = data.admin;
  sales = data.sales;
  customer = data.customer;
  productA = data.productA;
  productB = data.productB;

  adminToken = jwt.sign({ userId: admin.id, email: admin.email, role: admin.role }, config.jwtSecret, { expiresIn: '1h' });
  salesToken = jwt.sign({ userId: sales.id, email: sales.email, role: sales.role }, config.jwtSecret, { expiresIn: '1h' });
});

afterAll(async () => {
  await cleanupTestDB();
});

// ─── Helper: Create full workflow up to a quotation ─────────────
async function createEnquiryAndQuotation(overrides = {}) {
  // Create enquiry
  const enquiryRes = await request(app)
    .post('/api/enquiries')
    .set('Authorization', `Bearer ${salesToken}`)
    .send({
      customerId: customer.id,
      requiredDate: '2027-01-01',
      items: [
        { productId: productA.id, quantity: overrides.qtyA || 10 },
        { productId: productB.id, quantity: overrides.qtyB || 5 },
      ],
    });

  // Create quotation
  const quotationRes = await request(app)
    .post('/api/quotations')
    .set('Authorization', `Bearer ${salesToken}`)
    .send({
      enquiryId: enquiryRes.body.data.id,
      validUntil: '2027-06-01',
      items: [
        { productId: productA.id, quantity: overrides.qtyA || 10, unitPrice: 1000, discountPercent: 10, gstPercent: 18 },
        { productId: productB.id, quantity: overrides.qtyB || 5, unitPrice: 2000, discountPercent: 5, gstPercent: 18 },
      ],
    });

  return quotationRes.body.data;
}

// ─── Test 1: Quotation total is calculated correctly ────────────
describe('Test 1: Quotation Total Calculation', () => {
  test('should calculate quotation totals correctly on the backend', async () => {
    const quotation = await createEnquiryAndQuotation();

    // Product A: 10 × 1000 = 10000, discount 10% = 1000, taxable = 9000, GST 18% = 1620, line = 10620
    // Product B: 5 × 2000 = 10000, discount 5% = 500, taxable = 9500, GST 18% = 1710, line = 11210
    // Subtotal = 20000, Discount = 1500, GST = 3330, Grand Total = 21830

    expect(Number(quotation.subtotal)).toBe(20000);
    expect(Number(quotation.discountAmount)).toBe(1500);
    expect(Number(quotation.gstAmount)).toBe(3330);
    expect(Number(quotation.grandTotal)).toBe(21830);
  });
});

// ─── Test 2: DRAFT/REJECTED quotation cannot create SO ──────────
describe('Test 2: DRAFT/REJECTED Quotation Cannot Create Sales Order', () => {
  test('DRAFT quotation cannot be converted to Sales Order', async () => {
    const quotation = await createEnquiryAndQuotation();

    // Quotation is in DRAFT status, try to convert
    const res = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.errorCode).toBe('INVALID_STATUS');
  });

  test('REJECTED quotation cannot be converted to Sales Order', async () => {
    const quotation = await createEnquiryAndQuotation();

    // Move to SENT, then REJECTED
    await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'SENT' });

    await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'REJECTED' });

    const res = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

// ─── Test 3: Same quotation cannot generate duplicate SOs ───────
describe('Test 3: Duplicate Sales Order Prevention', () => {
  test('should not allow duplicate Sales Order from same quotation', async () => {
    const quotation = await createEnquiryAndQuotation();

    // Move to ACCEPTED
    await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'SENT' });
    await request(app)
      .patch(`/api/quotations/${quotation.id}/status`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ status: 'ACCEPTED' });

    // First conversion should succeed
    const res1 = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res1.status).toBe(201);

    // Second conversion should fail
    const res2 = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);
    expect(res2.status).toBe(409);
    expect(res2.body.errorCode).toBe('DUPLICATE_SALES_ORDER');
  });
});

// ─── Test 4: Cannot reserve more than available inventory ───────
describe('Test 4: Inventory Reservation Limits', () => {
  test('should reject confirmation when inventory is insufficient', async () => {
    // Create quotation with quantity exceeding inventory (100 available for A)
    const quotation = await createEnquiryAndQuotation({ qtyA: 200 });

    // Move to ACCEPTED and convert
    await request(app).patch(`/api/quotations/${quotation.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'SENT' });
    await request(app).patch(`/api/quotations/${quotation.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'ACCEPTED' });
    const soRes = await request(app).post(`/api/quotations/${quotation.id}/convert`).set('Authorization', `Bearer ${salesToken}`);

    // Try to confirm (should fail - not enough inventory)
    const res = await request(app)
      .post(`/api/sales-orders/${soRes.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('INSUFFICIENT_INVENTORY');
  });
});

// ─── Test 5: Unauthorized user cannot perform restricted operation
describe('Test 5: Authorization Enforcement', () => {
  test('Sales user cannot confirm a sales order (ADMIN only)', async () => {
    const quotation = await createEnquiryAndQuotation({ qtyA: 5, qtyB: 2 });

    await request(app).patch(`/api/quotations/${quotation.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'SENT' });
    await request(app).patch(`/api/quotations/${quotation.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'ACCEPTED' });
    const soRes = await request(app).post(`/api/quotations/${quotation.id}/convert`).set('Authorization', `Bearer ${salesToken}`);

    // Sales user tries to confirm -> should be forbidden
    const res = await request(app)
      .post(`/api/sales-orders/${soRes.body.data.id}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe('FORBIDDEN');
  });

  test('Unauthenticated user cannot access protected API', async () => {
    const res = await request(app).get('/api/customers');
    expect(res.status).toBe(401);
  });
});

// ─── BONUS: Concurrency test for simultaneous reservations ──────
describe('BONUS: Concurrency - Simultaneous Inventory Reservations', () => {
  test('should not allow both reservations when combined exceeds available', async () => {
    // Reset inventory to exact amount: A=100, B=50
    await prisma.inventory.update({ where: { productId: productA.id }, data: { physicalQuantity: 100, reservedQuantity: 0 } });
    await prisma.inventory.update({ where: { productId: productB.id }, data: { physicalQuantity: 50, reservedQuantity: 0 } });

    // Create two quotations that each want 80 of product A (only 100 available)
    const q1 = await createEnquiryAndQuotation({ qtyA: 80, qtyB: 1 });
    const q2 = await createEnquiryAndQuotation({ qtyA: 80, qtyB: 1 });

    // Accept both
    for (const q of [q1, q2]) {
      await request(app).patch(`/api/quotations/${q.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'SENT' });
      await request(app).patch(`/api/quotations/${q.id}/status`).set('Authorization', `Bearer ${salesToken}`).send({ status: 'ACCEPTED' });
    }

    // Convert both to SOs
    const so1Res = await request(app).post(`/api/quotations/${q1.id}/convert`).set('Authorization', `Bearer ${salesToken}`);
    const so2Res = await request(app).post(`/api/quotations/${q2.id}/convert`).set('Authorization', `Bearer ${salesToken}`);

    // Confirm both simultaneously
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/sales-orders/${so1Res.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`),
      request(app).post(`/api/sales-orders/${so2Res.body.data.id}/confirm`).set('Authorization', `Bearer ${adminToken}`),
    ]);

    // Exactly one should succeed and one should fail
    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);
  });
});
