# Smart Utility Backend

Node.js + Express API for the digital queue system.

## Recommended Database

Use **PostgreSQL**.

Why it fits this project:

- Complaints, users, technicians, assignments, and status history are structured data.
- Admin analytics need reliable filtering, grouping, and reporting.
- PostgreSQL can later add PostGIS if you want nearest-technician matching by real map coordinates.
- It is safer for government/utility workflows than a document-only database because relationships and data integrity matter.

MongoDB is still a fine option for quick prototypes, but PostgreSQL is the better long-term choice here.

## Setup

1. Install backend dependencies:

   ```bash
   cd backend
   npm install
   ```

2. Create your environment file:

   ```bash
   copy .env.example .env
   ```

3. Start PostgreSQL and create a database named `smart_utility`.

4. Run migrations and seed data:

   ```bash
   npm run prisma:migrate -- --name init
   npm run prisma:seed
   ```

5. Start the API:

   ```bash
   npm run dev
   ```

The API will run at `http://localhost:5000`.

## Seed Accounts

- Admin: `admin@smartutility.local` / `password123`
- Citizen: `citizen@smartutility.local` / `password123`
- Technician: `aminul@smartutility.local` / `password123`

## Main Routes

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/complaints`
- `POST /api/complaints`
- `GET /api/complaints/:id`
- `PATCH /api/complaints/:id/status`
- `PATCH /api/complaints/:id/assign`
- `GET /api/technicians`
- `GET /api/admin/analytics`
