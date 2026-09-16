# Industrial ERP Management System

A full-stack ERP application designed to manage the day-to-day sales process of an industrial business — from customer enquiries and quotations to sales orders, inventory management, and dispatch.

The application provides separate access for **Admin** and **Sales** users and keeps the complete order journey connected in one system.

---

## Overview

In an industrial business, information such as customer requirements, quotations, orders, stock, and dispatch details can become difficult to track when they are handled separately.

This project brings these activities together into a single application.

The main workflow is:

**Customer → Enquiry → Quotation → Sales Order → Inventory Check → Order Confirmation → Dispatch**

This also provides traceability between the different stages of a sale.

---

## Key Features

### Customer Management
- Add and view customer information
- Maintain company and contact details
- Associate customers with their enquiries, quotations, and orders

### Enquiry Management
- Create enquiries for customers
- Add multiple products to an enquiry
- Track enquiry status and required date

### Quotation Management
- Create quotations based on customer enquiries
- Add multiple products with quantity and pricing
- Apply discounts and GST
- Calculate quotation totals on the backend
- Manage quotation status:
  - DRAFT
  - SENT
  - ACCEPTED
  - REJECTED

### Sales Order Management
- Convert an accepted quotation into a Sales Order
- Prevent the same quotation from being converted more than once
- View order details and order status
- Allow only Admin users to confirm orders

### Inventory Management
- Maintain product inventory information
- Track:
  - Physical Quantity
  - Reserved Quantity
  - Available Quantity
- Check stock availability before confirming an order
- Prevent inventory from becoming negative

### Dispatch Management
- Process confirmed sales orders
- Store vehicle and driver details
- Create dispatch records
- Update inventory when an order is dispatched

### Authentication & Authorization
- JWT-based authentication
- Passwords stored using bcrypt hashing
- Role-based access control for Admin and Sales users
- Backend authorization protects sensitive operations

---

## Business Workflow

The complete process works as follows:

1. A customer requirement is recorded as an **Enquiry**.
2. The Sales team creates a **Quotation** based on the enquiry.
3. The quotation can be sent and then marked as **Accepted** or **Rejected**.
4. An accepted quotation can be converted into a **Sales Order**.
5. Before confirmation, the system checks the available inventory.
6. The **Admin** confirms the Sales Order if sufficient stock is available.
7. The required stock is reserved.
8. The Admin processes the **Dispatch** by entering the vehicle and driver details.
9. During dispatch, the inventory quantities are updated.

### Workflow at a glance

```text
Customer
   ↓
Enquiry
   ↓
Quotation
   ↓
Accepted
   ↓
Sales Order
   ↓
Inventory Check
   ↓
Admin Confirmation
   ↓
Inventory Reservation
   ↓
Dispatch
```

---

## User Roles

| Role | Responsibilities |
|------|------------------|
| **Sales** | Manage customers, enquiries, quotations and sales orders |
| **Admin** | Confirm sales orders, manage inventory and process dispatch |

Access to important operations is controlled on the backend based on the user's role.

---

## Technology Stack

| Area | Technology |
|------|------------|
| Frontend | React.js, Vite, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma |
| Authentication | JWT, bcrypt |
| Validation | Zod |
| API Documentation | Swagger / OpenAPI |
| Testing | Jest, Supertest |
| Database Container | Docker Compose |

---

## Application Architecture

```text
                     ┌─────────────────┐
                     │      User       │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ React Frontend  │
                     │ Vite + Tailwind │
                     └────────┬────────┘
                              │
                         REST API
                              │
                              ▼
                     ┌─────────────────┐
                     │ Express Backend │
                     │                 │
                     │ JWT + RBAC      │
                     │ Validation      │
                     │ Business Logic  │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ Prisma ORM      │
                     └────────┬────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │ PostgreSQL      │
                     │    Database     │
                     └─────────────────┘
                             
                     Docker PostgreSQL
```

---

## Database Schema

The database is designed around the main business entities: customers, enquiries, quotations, sales orders, products, inventory, and dispatches.

```mermaid
erDiagram

    USERS {
        int id PK
        string email UK
        string password
        string name
        string role
    }

    CUSTOMERS {
        int id PK
        string companyName
        string contactPerson
        string mobile
        string email UK
        string city
    }

    PRODUCTS {
        int id PK
        string productCode UK
        string productName
        string category
        string unit
        decimal basePrice
    }

    INVENTORY {
        int id PK
        int productId FK
        int physicalQuantity
        int reservedQuantity
    }

    ENQUIRIES {
        int id PK
        string enquiryNumber UK
        int customerId FK
        string requiredDate
        string status
        int createdById FK
    }

    ENQUIRY_ITEMS {
        int id PK
        int enquiryId FK
        int productId FK
        int quantity
    }

    QUOTATIONS {
        int id PK
        string quotationNumber UK
        int enquiryId FK
        int customerId FK
        string validUntil
        string status
        decimal grandTotal
    }

    QUOTATION_ITEMS {
        int id PK
        int quotationId FK
        int productId FK
        int quantity
        decimal unitPrice
        decimal discountPercent
        decimal gstPercent
        decimal lineAmount
    }

    SALES_ORDERS {
        int id PK
        string orderNumber UK
        int customerId FK
        int quotationId FK
        decimal totalAmount
        string status
    }

    SALES_ORDER_ITEMS {
        int id PK
        int salesOrderId FK
        int productId FK
        int quantity
        decimal unitPrice
        decimal lineAmount
    }

    DISPATCHES {
        int id PK
        string dispatchNumber UK
        int salesOrderId FK
        string vehicleNumber
        string driverName
    }

    DISPATCH_ITEMS {
        int id PK
        int dispatchId FK
        int productId FK
        int quantity
    }

    CUSTOMERS ||--o{ ENQUIRIES : creates
    USERS ||--o{ ENQUIRIES : handles
    ENQUIRIES ||--o{ ENQUIRY_ITEMS : contains
    PRODUCTS ||--o{ ENQUIRY_ITEMS : includes

    ENQUIRIES ||--o{ QUOTATIONS : generates
    CUSTOMERS ||--o{ QUOTATIONS : receives
    QUOTATIONS ||--o{ QUOTATION_ITEMS : contains
    PRODUCTS ||--o{ QUOTATION_ITEMS : includes

    QUOTATIONS ||--o| SALES_ORDERS : converts
    CUSTOMERS ||--o{ SALES_ORDERS : places
    SALES_ORDERS ||--o{ SALES_ORDER_ITEMS : contains
    PRODUCTS ||--o{ SALES_ORDER_ITEMS : includes

    SALES_ORDERS ||--o| DISPATCHES : has
    DISPATCHES ||--o{ DISPATCH_ITEMS : contains
    PRODUCTS ||--|| INVENTORY : tracked
```

---

## Inventory Handling

Inventory is maintained using two main quantities:

- **Physical Quantity** – total quantity currently held in stock
- **Reserved Quantity** – quantity already reserved for confirmed orders

The available quantity is calculated as:

```text
Available Quantity = Physical Quantity - Reserved Quantity
```

When an Admin confirms an order, the system checks whether enough available stock exists before reserving the requested quantity.

When the order is dispatched, the inventory is updated accordingly.

---

## Handling Concurrent Inventory Requests

Inventory reservation is handled using a database transaction.

When an Admin confirms a Sales Order:

1. A database transaction is started.
2. The required inventory row is locked using `SELECT ... FOR UPDATE`.
3. The system checks the available quantity.
4. If enough stock is available, the reserved quantity is increased.
5. The transaction is committed.

This prevents two requests from reserving the same available stock at the same time.

For example, if only 100 units are available and two orders simultaneously try to reserve 80 units each, the database lock ensures that both requests do not reserve the same stock.

---

## Authentication & Role-Based Access

The application uses JWT authentication.

### Login Flow

```text
User Login
    ↓
Backend verifies email/password
    ↓
Password checked using bcrypt
    ↓
JWT token generated
    ↓
Token sent to frontend
    ↓
Token used for protected API requests
```

The backend also checks the user's role before allowing restricted operations.

For example:

```text
Sales → Create quotation
Admin → Confirm Sales Order
Admin → Process Dispatch
```

This authorization is enforced on the **backend**, not only through frontend buttons.

---

## API Documentation

Swagger/OpenAPI documentation is included for the backend API.

After starting the backend, the documentation can be accessed at:

```text
http://localhost:3000/api-docs
```

Some of the main API endpoints include:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/customers` | List customers |
| POST | `/api/customers` | Create customer |
| GET | `/api/products` | List products |
| GET | `/api/inventory` | View inventory |
| GET | `/api/enquiries` | List enquiries |
| POST | `/api/enquiries` | Create enquiry |
| GET | `/api/quotations` | List quotations |
| POST | `/api/quotations` | Create quotation |
| PATCH | `/api/quotations/:id/status` | Update quotation status |
| POST | `/api/quotations/:id/convert` | Convert quotation to Sales Order |
| GET | `/api/sales-orders` | List Sales Orders |
| GET | `/api/sales-orders/:id` | View Sales Order |
| POST | `/api/sales-orders/:id/confirm` | Confirm Sales Order |
| POST | `/api/sales-orders/:id/dispatch` | Dispatch order |

---

## Project Setup

### Prerequisites

Make sure the following are installed:

- Node.js 18 or later
- Docker Desktop
- Git
- PostgreSQL is not required separately because PostgreSQL runs through Docker

### 1. Clone the Repository

```bash
git clone https://github.com/Sivareddy2006S/Industrial-ERP-Management.git
cd Industrial-ERP-Management
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
cd ..
```

### 4. Start PostgreSQL

From the project root:

```bash
docker compose up -d
```

### 5. Configure Environment Variables

Create:

```text
backend/.env
```

Example:

```env
PORT=3000
DATABASE_URL="postgresql://erp_user:erp_password@127.0.0.1:5432/erp_db?schema=public"
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://localhost:5173"
```

**Do not commit the `.env` file to GitHub.**

### 6. Run Database Setup

```bash
cd backend
npx prisma migrate dev
npm run seed
```

### 7. Start the Backend

```bash
npm run dev
```

Backend:

```text
http://localhost:3000
```

Swagger:

```text
http://localhost:3000/api-docs
```

### 8. Start the Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Frontend:

```text
http://localhost:5173
```

---

## Demo Credentials

The project includes seeded users for testing.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@example.com` | `Admin@123` |
| Sales | `sales@example.com` | `Sales@123` |

> These credentials are intended only for local development/demo purposes.

---

## Business Rules

Some of the important rules implemented in the application are:

1. Protected APIs require authentication.
2. Role-based permissions are checked by the backend.
3. Only accepted quotations can be converted into Sales Orders.
4. A quotation can be converted into only one Sales Order.
5. Inventory availability is checked before order confirmation.
6. Reserved quantity cannot exceed available stock.
7. Inventory quantities cannot become negative.
8. Only Admin users can confirm Sales Orders.
9. Only Admin users can process dispatch.
10. A Sales Order must be confirmed before it can be dispatched.
11. Important inventory operations are performed inside database transactions.
12. Monetary calculations are handled using decimal values to avoid floating-point precision issues.

---

## Testing

The backend includes automated tests using **Jest** and **Supertest**.

The tests cover areas such as:

- Calculation logic
- Quotation status transitions
- Authorization
- Sales Order rules
- Inventory reservation
- Concurrent inventory requests

Run the tests using:

```bash
cd backend
npm test
```

---

## Project Structure

```text
Industrial-ERP-Management/
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.js
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── ...
│   │
│   ├── tests/
│   └── package.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   └── services/
│   │
│   └── package.json
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

## Screenshots

Screenshots of the application can be added here to show:

- Login
- Customer Management
- Enquiries
- Quotations
- Sales Orders
- Inventory
- Dispatch

---

## Future Improvements

Some possible improvements for future versions:

- Customer edit and delete functionality
- Pagination for large datasets
- Email notifications for quotation and order status changes
- Audit logs for important business operations
- Dashboard with sales and inventory analytics
- PDF generation for quotations and invoices
- Damaged stock tracking
- Multi-tenant support

---

## Conclusion

The Industrial ERP Management System connects the major stages of an industrial sales process in one application.

It provides a structured workflow from **customer enquiry to final dispatch**, while also handling authentication, role-based access, quotation calculations, inventory validation, and transaction-safe stock reservations.

The project was built to demonstrate how a full-stack application can be used to solve a practical business workflow using modern web technologies.