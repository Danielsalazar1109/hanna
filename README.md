# Hanna Queue Tickets (Student Ticket + Admin Dashboard)

A full-stack Next.js (App Router) web application for student service **queue tickets**.

Students do **not** create accounts. They enter only:

- Full name
- Student ID

The system stores the ticket in **MongoDB** and generates a unique, sequential ticket number (example: `A-1042`).

## Features

### Student
- Request a queue ticket using **Full name** + **Student ID**
- Ticket is stored permanently in **MongoDB**
- A unique **ticket number** is generated (example: `A-1042`)
- Confirmation screen shows:
  - Name
  - Student ID
  - Ticket number
- Print or download the confirmation

### Admin
- Secure login (credentials via env vars; password stored as a **bcrypt hash**, not plaintext)
- Dashboard:
  - View all tickets/appointments (ordered by ticket number)
  - Search / filter:
    - student name
    - student ID
    - ticket number
    - date (created-at day)
    - status
  - Update appointment status:
    - Scheduled
    - Completed
    - Cancelled
    - No Show
  - Stats:
    - Total
    - Today
    - Completed
    - Cancelled

## Setup

### 1) Install dependencies

```bash
cd hanna
npm install
```

### 2) Configure environment variables

Create `hanna/.env.local` with these variables:

- `MONGODB_URI`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD_HASH`

> If you have a `.env.example`, you can copy it to `.env.local` and fill in values.

#### Generating `ADMIN_PASSWORD_HASH`

Generate a bcrypt hash (12 rounds) and paste it into `ADMIN_PASSWORD_HASH`:

```bash
cd hanna
node -e "const bcrypt=require('bcryptjs'); bcrypt.hash(process.argv[1], 12).then(h=>console.log(h))" "YourAdminPasswordHere"
```

### 3) Start MongoDB

Make sure MongoDB is running and reachable at your `MONGODB_URI`.

### 4) Run the dev server

```bash
cd hanna
npm run dev
```

Open:
- Home: `http://localhost:3000/`
- Student: `http://localhost:3000/student`
- Admin login: `http://localhost:3000/admin/login`

## How to use

### Admin workflow (recommended first)
1. Go to `/admin/login` and sign in
2. Go to `/admin/dashboard`
3. View the queue (ordered by ticket number) and update statuses as tickets are served

### Student workflow
1. Go to `/student`
2. Enter **Full name** + **Student ID**
3. Submit to generate a ticket
4. Print or download the confirmation

## Notes

- Ticket numbers are generated using an atomic MongoDB counter (`Counter` collection), which prevents duplicates.
- This app is a **first-come-first-served queue**: tickets are served in ascending ticket order.
- There are **no appointment slots** or date/time selection in the student flow.
