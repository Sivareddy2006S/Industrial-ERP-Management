const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('@localhost:', '@127.0.0.1:') : undefined;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'] });

module.exports = prisma;
