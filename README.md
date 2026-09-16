# Industrial ERP Management System

A production-quality full-stack ERP application built with the **PERN stack** (PostgreSQL, Express.js, React.js, Node.js) implementing a complete industrial business workflow.

## Business Workflow

```
Customer Enquiry → Quotation → Accepted Quotation → Sales Order → Admin Confirms → Inventory Reserved → Admin Dispatches
```

**Full traceability:** Customer → Enquiry → Quotation → Sales Order → Dispatch

## Features

- **Role-Based Access Control (RBAC)**: Admin and Sales User roles with backend-enforced authorization
- **Customer Management**: Create and manage industrial customers
- **Enquiry Management**: Multi-product enquiries with customer association
- **Quotation System**: Line-item pricing with discount %, GST %, backend-calculated totals
- **Strict Status Transitions**: DRAFT → SENT → ACCEPTED/REJECTED (enforced on backend)
- **Sales Order Conversion**: Only ACCEPTED quotations, with duplicate prevention (unique constraint)
- **Inventory Management**: Physical/Reserved/Available quantities with PostgreSQL CHECK constraints
- **Concurrency-Safe Reservations**: `SELECT ... FOR UPDATE` row-level locking in transactions
- **Dispatch Processing**: Decreases both physical and reserved quantities atomically
- **JWT Authentication**: bcrypt password hashing, token-based API protection
- **Swagger API Documentation**: Interactive API docs at `/api-docs`
- **Automated Tests**: 6 tests covering calculations, status rules, authorization, concurrency

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js + Vite + Tailwind CSS v4 |
| Backend | Node.js + Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Auth | JWT + bcrypt |
| Validation | Zod |
| Testing | Jest + Supertest |
| API Docs | Swagger/OpenAPI |
| Containers | Docker Compose |

## Database Schema (ER Diagram)

```mermaid
erDiagram
    users {
        Int id PK
        String email UK
        String password
        String name
        Role role
    }
    customers {
        Int id PK
        String companyName
        String contactPerson
        String mobile
        String email UK
        String city
    }
    products {
        Int id PK
        String productCode UK
        String productName
        String category
        String unit
        Decimal basePrice
    }
    inventory {
        Int id PK
        Int productId FK_UK
        Int physicalQuantity
        Int reservedQuantity
    }
    enquiries {
        Int id PK
        String enquiryNumber UK
        Int customerId FK
        DateTime requiredDate
        EnquiryStatus status
        Int createdById FK
    }
    enquiry_items {
        Int id PK
        Int enquiryId FK
        Int productId FK
        Int quantity
    }
    quotations {
        Int id PK
        String quotationNumber UK
        Int enquiryId FK
        Int customerId FK
        DateTime validUntil
        QuotationStatus status
        Decimal grandTotal
    }
    quotation_items {
        Int id PK
        Int quotationId FK
        Int productId FK
        Int quantity
        Decimal unitPrice
        Decimal discountPercent
        Decimal gstPercent
        Decimal lineAmount
    }
    sales_orders {
        Int id PK
        String orderNumber UK
        Int customerId FK
        Int quotationId FK_UK
        Decimal totalAmount
        SalesOrderStatus status
    }
    sales_order_items {
        Int id PK
        Int salesOrderId FK
        Int productId FK
        Int quantity
        Decimal unitPrice
        Decimal lineAmount
    }
    dispatches {
        Int id PK
        String dispatchNumber UK
        Int salesOrderId FK_UK
        String vehicleNumber
        String driverName
    }
    dispatch_items {
        Int id PK
        Int dispatchId FK
        Int productId FK
        Int quantity
    }

    customers ||--o{ enquiries : "has"
    users ||--o{ enquiries : "creates"
    enquiries ||--o{ enquiry_items : "contains"
    products ||--o{ enquiry_items : "in"
    enquiries ||--o{ quotations : "quoted as"
    customers ||--o{ quotations : "for"
    quotations ||--o{ quotation_items : "contains"
    products ||--o{ quotation_items : "in"
    quotations ||--o| sales_orders : "converts to"
    customers ||--o{ sales_orders : "for"
    sales_orders ||--o{ sales_order_items : "contains"
    products ||--o{ sales_order_items : "in"
    sales_orders ||--o| dispatches : "dispatched as"
    dispatches ||--o{ dispatch_items : "contains"
    products ||--|| inventory : "tracked in"
```

### Key Constraints

| Constraint | Purpose |
|-----------|---------|
| `sales_orders.quotationId` UNIQUE | Prevents duplicate Sales Order from same Quotation |
| `dispatches.salesOrderId` UNIQUE | Prevents duplicate dispatch for same Order |
| `inventory.productId` UNIQUE | One inventory record per product |
| All monetary fields: `DECIMAL(12,2)` | Precision arithmetic |
| `physicalQuantity >= 0`, `reservedQuantity >= 0` | Enforced at application level |

## Setup Instructions

### Prerequisites

- Node.js v18+ (tested with v24.12.0)
- Docker & Docker Compose
- Git

### 1. Clone and Install

```bash
git clone <repository-url>
cd "Industrial ERP Management System"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure Environment

```bash
# Copy example env to backend
cp .env.example backend/.env
# Edit backend/.env if needed (defaults work with docker-compose)
```

### 4. Run Migrations & Seed

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Start the Application

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Swagger Docs**: http://localhost:3000/api-docs

### 6. Run Tests

```bash
cd backend
npm test
```

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@example.com | Admin@123 |
| Sales | sales@example.com | Sales@123 |

## API Documentation

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/login | Login | Public |
| GET | /api/auth/me | Current user | All |
| GET | /api/customers | List customers | All |
| POST | /api/customers | Create customer | SALES, ADMIN |
| GET | /api/customers/:id | Customer details | All |
| GET | /api/products | List products | All |
| POST | /api/products | Create product | ADMIN |
| GET | /api/inventory | List inventory | All |
| PATCH | /api/inventory/:productId | Update inventory | ADMIN |
| GET | /api/enquiries | List enquiries | All |
| POST | /api/enquiries | Create enquiry | SALES, ADMIN |
| GET | /api/enquiries/:id | Enquiry details | All |
| GET | /api/quotations | List quotations | All |
| POST | /api/quotations | Create quotation | SALES, ADMIN |
| GET | /api/quotations/:id | Quotation details | All |
| PATCH | /api/quotations/:id/status | Update status | SALES, ADMIN |
| POST | /api/quotations/:id/convert | Convert to SO | SALES, ADMIN |
| GET | /api/sales-orders | List orders | All |
| GET | /api/sales-orders/:id | Order details | All |
| POST | /api/sales-orders/:id/confirm | Confirm + reserve | ADMIN |
| POST | /api/sales-orders/:id/dispatch | Dispatch order | ADMIN |

## Important Business Rules

1. Only authenticated users can access protected APIs
2. Only ADMIN can confirm Sales Orders and dispatch
3. Only ACCEPTED quotations can become Sales Orders
4. DRAFT/REJECTED quotations cannot become Sales Orders
5. One quotation → one Sales Order (unique constraint)
6. Inventory cannot become negative
7. Reservation cannot exceed available quantity
8. Physical inventory does NOT decrease during reservation
9. Dispatch decreases BOTH physical and reserved quantities
10. Cancelled/unconfirmed orders cannot be dispatched
11. All monetary calculations done on the backend using Decimal.js
12. All critical inventory operations use database transactions

## Inventory Concurrency Approach

When an admin confirms a sales order, the backend:

1. **Starts a Prisma interactive transaction** (`$transaction`)
2. **Locks inventory rows** using raw SQL `SELECT ... FOR UPDATE`
3. **Checks available quantity** (`physical - reserved >= requested`)
4. **Increments `reservedQuantity`** if sufficient
5. **Commits the transaction**

If two concurrent requests try to reserve the same inventory:
- The first request acquires the row lock
- The second request **waits** for the lock to release
- After the first commits, the second re-reads the updated values
- If inventory is now insufficient, the second request is **rejected**

This is demonstrated in the concurrency test (Test 6).

## JWT + RBAC Explanation

- **JWT**: On login, the server issues a JWT token containing `userId`, `email`, and `role`
- **Authentication Middleware**: Every protected route verifies the JWT token and loads the user
- **Authorization Middleware**: `authorize('ADMIN')` checks `req.user.role` against allowed roles
- **Frontend**: Stores token in localStorage, sends via `Authorization: Bearer <token>` header
- **401 Handling**: Axios interceptor auto-redirects to login on 401 responses

## Screenshots

> Run the application and navigate through the demo flow to see all screens.

## Future Improvements

- [ ] Add DAMAGED stock field (`Available = Physical - Reserved - Damaged`)
- [ ] Add customer edit/delete operations
- [ ] Add pagination for large datasets
- [ ] Add email notifications for status changes
- [ ] Add audit logging for all critical operations
- [ ] Add dashboard with analytics and charts
- [ ] Add PDF export for quotations and invoices
- [ ] Add multi-tenant support
