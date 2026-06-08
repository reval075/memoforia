# Memoforia

![Memoforia Banner](https://via.placeholder.com/1200x400?text=Memoforia+-+Photobooth+%26+Equipment+Rental+Platform)

**Memoforia** is a comprehensive platform designed for managing photobooth services and rental equipment. Built with a modern technology stack using **Laravel** for the robust backend API and **React.js** (via Inertia.js) for a dynamic, reactive frontend. Memoforia streamlines the entire customer journey from booking to payment, while providing administrators with a powerful dashboard to manage operations efficiently.

---

## 1. Project Overview

**Purpose:**  
To provide an end-to-end management system for photobooth businesses and photography equipment rentals, automating booking approvals, payment verifications, and schedule tracking.

**Problem Solved:**  
Eliminates manual tracking of bookings, prevents double-booking on specific dates, simplifies payment processing (both manual and automated via Midtrans), and centralizes the management of service packages and addons.

**Target Audience:**  
- **Customers (Guests):** Individuals or event organizers looking to book photobooth services or rent equipment with real-time tracking.
- **Administrators/Owners:** Business owners needing a centralized dashboard to track revenue, approve bookings, and manage service assets.

---

## 2. Key Features

Here are the active features implemented in the system:

* **Online Booking Photobooth:** Guests can browse service packages, select add-ons, pick photo templates, and submit booking requests for their events.
* **Rental Equipment Management:** A dedicated flow for customers to browse and rent photography equipment.
* **Booking Tracking:** Customers can track the real-time status of their photobooth booking using their Booking Code and contact details.
* **Rental Tracking:** Customers can track their equipment rental request status similarly via a tracking portal.
* **Midtrans Payment Gateway:** Automated payment processing for Down Payments (DP) and settlements using Midtrans Snap.
* **Upload Bukti Pembayaran:** Customers can manually upload payment proofs (e.g., bank transfer receipts) for admin verification.
* **Approval Workflow:** A robust state-machine for bookings and rentals (`pending_approval` → `waiting_dp` → `confirmed` → `completed`).
* **Admin Dashboard:** A centralized control panel providing monthly revenue statistics, pending payment alerts, and quick actions.
* **Calendar Block Management:** Admins can define `Unavailable Dates` to prevent customers from booking on fully booked or closed days.
* **PDF Document Generation:** Automated generation of booking documents and invoices using `barryvdh/laravel-dompdf`.
* **Email Notification:** System utilizes Laravel Mail for essential communications, including secure Password Reset workflows.
* **Customer Management:** Customer data (name, email, phone) is seamlessly captured and associated with their specific booking/rental records.
* **Package Management:** Full CRUD management for Service Packages, Variants, Addons, and Photo Templates (including custom frame uploads).
* **Configuration Management:** Management of physical branches/locations and active booths.

---

## 3. Technology Stack

| Category | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Laravel 10.x | Core application framework & RESTful API |
| **Frontend** | React.js 18.x | User interface library |
| **Routing & SSR** | Inertia.js 2.0 | Seamless SPA routing without building an API |
| **Styling** | Tailwind CSS 4.x | Utility-first CSS framework |
| **Build Tool** | Vite 5.x | Next-generation frontend tooling |
| **Database** | MySQL | Relational database management |
| **Payment** | Midtrans PHP | Payment gateway integration |
| **Email** | Laravel Mail | SMTP based email transmission |
| **PDF Generation**| Laravel DOMPDF | HTML to PDF converter |

---

## 4. System Architecture

The application follows a modern monolithic architecture utilizing the Inertia.js bridge:

`Frontend (React.js + Tailwind)` ↔️ `Inertia.js Middleware` ↔️ `Backend (Laravel Controllers)` ↔️ `Database (MySQL)`

* **Payment Flow:** `Frontend` → `Laravel API` → `Midtrans API` → `Webhook / Snap UI` → `Laravel DB Update`
* **File Storage:** Local/Public disk used for custom frames, payment proofs, and PDF documents.

---

## 5. Installation Guide

Follow these steps to set up the project locally.

### Prerequisites
* PHP >= 8.1
* Composer
* Node.js & NPM
* MySQL

### Steps

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd memoforia
   ```

2. **Composer install**
   ```bash
   composer install
   ```

3. **NPM install**
   ```bash
   npm install
   ```

4. **Environment setup**
   ```bash
   cp .env.example .env
   ```

5. **Generate key**
   ```bash
   php artisan key:generate
   ```

6. **Database Setup & Migration**
   Configure your `.env` (see below), then run:
   ```bash
   php artisan migrate
   ```

7. **Storage Link**
   ```bash
   php artisan storage:link
   ```

8. **Run development servers**
   You need two terminal instances:
   ```bash
   # Terminal 1: Frontend (Vite)
   npm run dev
   
   # Terminal 2: Backend (Laravel)
   php artisan serve
   ```

---

## 6. Environment Variables

Configure your `.env` file with the following critical variables:

```env
APP_NAME=Memoforia
APP_ENV=local
APP_KEY=base64:...
APP_DEBUG=true
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=memoforia
DB_USERNAME=root
DB_PASSWORD=

# Email Configuration (e.g., Gmail / Mailpit)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS="hello@memoforia.com"
MAIL_FROM_NAME="${APP_NAME}"

# Midtrans Configuration
MIDTRANS_SERVER_KEY=SB-Mid-server-...
MIDTRANS_CLIENT_KEY=SB-Mid-client-...
MIDTRANS_MERCHANT_ID=G...
MIDTRANS_IS_PRODUCTION=false

# Booking Rules
RENTAL_DP_EXPIRATION_HOURS=24
RENTAL_MIN_DP_PERCENT=40
BOOKING_MIN_DP_PERCENT=40
```

---

## 7. Database Setup

1. Open your MySQL client (e.g., phpMyAdmin, TablePlus, or CLI).
2. Create a new database named `memoforia`.
3. Update your `.env` file with the database credentials.
4. Run the migrations to build the schema:
   ```bash
   php artisan migrate
   ```
5. *(Optional)* If seeders are available, run `php artisan db:seed` to populate initial data.

---

## 8. Payment Gateway Setup (Midtrans)

1. Register/Login to the [Midtrans Dashboard](https://dashboard.midtrans.com).
2. Go to **Settings > Access Keys**.
3. Copy the **Client Key** and **Server Key** for the Sandbox environment.
4. Paste them into your `.env` file (`MIDTRANS_SERVER_KEY` and `MIDTRANS_CLIENT_KEY`).
5. Ensure `MIDTRANS_IS_PRODUCTION=false` for testing.
6. Once ready for live transactions, replace the keys with Production keys and set `MIDTRANS_IS_PRODUCTION=true`.

---

## 9. Email Setup

Memoforia uses Laravel Mail. To use Gmail as your SMTP server:

1. Go to your Google Account Settings > Security.
2. Enable **2-Step Verification**.
3. Search for **App Passwords** and generate a new password for "Mail".
4. Copy the generated 16-character password.
5. Update your `.env`:
   ```env
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=465
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_16_char_app_password
   MAIL_ENCRYPTION=tls
   ```

---

## 10. User Roles

The system operates with two primary interaction roles:

* **Admin:** Has full access to the backend via `/admin/dashboard`. Can approve/reject bookings, verify manual payments, manage packages, dates, and view revenue statistics.
* **Customer (Guest):** Unauthenticated public users who interact with the frontend. They can browse packages, submit bookings, upload payment proofs, and track their order status via unique tracking codes.

---

## 11. Booking Workflow

1. **Submission:** Customer fills out the booking form (date, location, package, addons). Status becomes `pending_approval`.
2. **Approval:** Admin reviews the request. If accepted, status changes to `waiting_dp` (Down Payment) with a strict expiration deadline (e.g., 24 hours).
3. **Payment:** Customer tracks their booking and pays the DP via Midtrans or manual transfer (uploading proof).
4. **Confirmation:** Once payment is verified (automatically by Midtrans or manually by Admin), the status becomes `confirmed`.
5. **Settlement & Completion:** After the event, the customer pays the remaining balance. Admin updates the status to `completed`.

---

## 12. Rental Workflow

1. **Submission:** Customer submits an equipment rental request. Status: `pending_approval`.
2. **Approval:** Admin checks inventory and approves. Status: `waiting_dp`.
3. **Payment:** Customer pays the required DP.
4. **Confirmation:** System marks the rental as `confirmed`.
5. **Return:** Customer returns the equipment, pays any remaining balance or late fees, and the Admin marks the rental as `completed`.

---

## 13. Admin Workflow

* **Dashboard:** View high-level metrics (Pending Bookings, Monthly Revenue, Pending Payments).
* **Approval Process:** Lock-protected transactions ensure admins cannot double-book dates. When an admin approves a booking, competing pending bookings for the same date are automatically cancelled.
* **Payment Verification:** Admins review manually uploaded payment proofs. Verifying a DP automatically updates the booking to `confirmed`.
* **Data Management:** Admins can dynamically add new Service Packages, Photo Templates (including uploading frame images), and set Unavailable Dates to block out the calendar.

---

## 14. Project Structure

Key directories to understand the application flow:

* `app/` - Contains core backend logic (Models, Controllers, Services).
  * `Http/Controllers/` - API endpoints and Inertia render controllers.
  * `Services/` - Business logic (e.g., MidtransService, PdfDocumentService).
* `database/` - Migrations, Factories, and Seeders defining the MySQL schema.
* `resources/js/` - Frontend React application.
  * `Pages/` - Top-level Inertia views (Dashboard, Booking, Track).
  * `Components/` - Reusable UI components.
  * `Layouts/` - Application shell layouts.
* `routes/` - Application routing.
  * `web.php` - Both frontend Inertia routes and Admin API routes.
* `public/` - Publicly accessible assets and uploaded files (custom frames, payment proofs).

---

## 15. Screenshots

| Home Page | Booking Flow |
| :---: | :---: |
| ![Home](https://via.placeholder.com/600x350?text=Home+Page+Screenshot) | ![Booking](https://via.placeholder.com/600x350?text=Booking+Flow+Screenshot) |

| Tracking Portal | Admin Dashboard |
| :---: | :---: |
| ![Tracking](https://via.placeholder.com/600x350?text=Tracking+Portal+Screenshot) | ![Admin](https://via.placeholder.com/600x350?text=Admin+Dashboard+Screenshot) |

> *Note: Replace the placeholder URLs above with actual screenshots of the application.*

---

## 16. Future Improvements

* **User Authentication for Customers:** Allow customers to create accounts to view their booking history without needing tracking codes.
* **Inventory Tracking:** Real-time stock decrementing for rental equipment to prevent over-booking without manual admin checks.
* **Automated Email & WhatsApp Reminders:** Integrate automated notifications for DP expiration warnings and event day reminders.
* **Review & Rating System:** Allow customers to leave reviews for completed photobooth events.

---

## 17. License

This project is proprietary and confidential. Unauthorized copying of files from this repository, via any medium, is strictly prohibited.

---
*Generated based on actual source code analysis.*
