const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config');
const swaggerSpec = require('./config/swagger');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const customerRoutes = require('./routes/customerRoutes');
const productRoutes = require('./routes/productRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const salesOrderRoutes = require('./routes/salesOrderRoutes');

const app = express();

// ─── Global Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// ─── Swagger Docs ────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Health Check ────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ERP API is running' });
});

// ─── API Routes ──────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/sales-orders', salesOrderRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    errorCode: 'ROUTE_NOT_FOUND',
  });
});

// ─── Error Handler ───────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
