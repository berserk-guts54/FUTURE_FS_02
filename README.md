# Client Lead Management System (Mini CRM)

A full-stack Mini CRM application developed for the Future Interns Full Stack Web Development Internship.

## Project Overview

The Client Lead Management System helps manage client enquiries and track their progress through different stages. It provides an interface to create, view, update, and delete leads, along with notes and follow-up information.

## Features

- Admin login and logout
- Protected API routes using JSON Web Tokens (JWT)
- Create and view client leads
- Store client name, email, phone, source, and enquiry details
- Update lead status: New, Contacted, or Converted
- Delete leads
- Add notes and follow-up information
- Search leads and view dashboard counters
- Persistent data storage using MySQL

## Technologies Used

**Frontend**
- HTML
- CSS
- JavaScript

**Backend**
- Node.js
- Express.js
- MySQL
- JSON Web Tokens (JWT)

## Project Structure

```text
FUTURE_FS_02/
├── backend/
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
├── .gitignore
├── index.html
├── script.js
├── style.css
└── README.md
```

## Prerequisites

Install the following before running the application:

- Node.js and npm
- MySQL Server
- A web browser

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/berserk-guts54/Future-Interns-Mini-CRM.git
cd Future-Interns-Mini-CRM
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure MySQL

Create a MySQL database named `mini_crm` and configure the tables required by the application.

The database should contain a `leads` table for client information and a `follow_up_notes` table for lead notes and follow-ups. Configure their columns and relationship according to the application's SQL queries.

### 4. Configure environment variables

Create a `.env` file inside the `backend` directory. Add your own configuration:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mini_crm
PORT=5000

ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
JWT_SECRET=your_long_random_secret
```

Replace the example values with your own settings. Never commit the `.env` file to GitHub.

### 5. Start the backend

From the `backend` directory, run:

```bash
node server.js
```

The backend should run at `http://localhost:5000`.

### 6. Open the frontend

Open `index.html` in a browser. If your browser blocks frontend API requests when opening the file directly, use a local development server.

## Authentication

The application uses an admin login and JWT-based authentication to protect lead and note API routes.

Configure the admin credentials locally using the environment variables described above.

## Security Notes

- Environment variables and passwords must not be committed to the repository.
- Use unique, strong admin credentials and a long random JWT secret.
- This project is an internship demonstration, not a production-hardened CRM.

## Project Status

The main CRM features, authentication, and MySQL data persistence have been tested locally.

## Author

Developed as a project for the Future Interns Full Stack Web Development Internship.
