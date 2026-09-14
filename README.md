# Kitchen — Pickleball Court Booking System

A fully working court-booking system: PHP + MongoDB backend, vanilla
JS/HTML/CSS frontend. Real accounts, live availability checking,
double-booking prevention, simulated payments, and a notification
inbox — all backed by an actual database.

```
kitchen-pickleball-system/
├── database/
│   └── seed.php          ← create indexes and starter courts
├── backend/
│   ├── config.php         ← database connection settings
│   ├── helpers.php
│   └── api/                ← one PHP file per endpoint (JSON API)
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/app.js           ← calls the API with fetch()
```

## 1. Requirements

- [XAMPP](https://www.apachefriends.org/) or another Apache + PHP stack.
- PHP MongoDB extension and [Composer](https://getcomposer.org/).
- A MongoDB Atlas database and database user.
- [Visual Studio Code](https://code.visualstudio.com/) (optional, for editing).

## 2. Install the project into XAMPP

1. Copy the whole `kitchen-pickleball-system` folder into your XAMPP
   `htdocs` directory:
   - Windows: `C:\xampp\htdocs\kitchen-pickleball-system`
   - macOS: `/Applications/XAMPP/htdocs/kitchen-pickleball-system`
   - Linux: `/opt/lampp/htdocs/kitchen-pickleball-system`
2. Open the **XAMPP Control Panel** and click **Start** next to
   **Apache**.

## 3. Configure MongoDB

1. Copy `.env.example` to `.env`.
2. In MongoDB Atlas, add your current IP address under Network Access and
   create a database user.
3. Put the Atlas driver connection string in `MONGODB_URI` and set the
   database name in `MONGODB_DATABASE`.
4. Install dependencies and create the indexes and starter courts:

```
composer install
php database/seed.php
```

The application uses the `users`, `courts`, `bookings`, and `notifications`
collections. Existing Atlas data can be imported with MongoDB Compass or
`mongodump`/`mongorestore`; booking references must use the related document
ObjectIds.

## 4. Run the app

With Apache running and the MongoDB PHP extension enabled, open:

```
http://localhost/kitchen-pickleball-system/frontend/index.html
```

**Important:** this must be opened through `http://localhost/...`
(served by Apache), **not** by double-clicking the file. PHP only
runs on a real web server — opening `index.html` directly from your
file system (`file://...`) will not work, since the backend API
calls require Apache/PHP.

## 5. Try it out

1. Click **Create an account** and register.
2. Pick a court, choose a date and time, and confirm the booking.
   Free courts confirm instantly; courts with a fee show a simulated
   payment step.
3. Open **My Schedule** to see the booking, or cancel it.
4. Open **Notifications** to see the confirmation message.
5. To prove double-booking prevention: log in from a second browser
   (or an incognito window) with a second account, and try to book
   the exact same court/date/time — you'll get a "slot just booked"
   error, and the slot will show as unavailable.

## 6. Opening the project in VS Code

1. `File → Open Folder…` and select the `kitchen-pickleball-system`
   folder.
2. VS Code will suggest installing the recommended extensions
   (PHP Intelephense for autocomplete, a MongoDB client for browsing the
   database, PHP Debug for step-through debugging). Click **Install**
   if prompted, or find them in `.vscode/extensions.json`.
3. You can browse/edit `backend/api/*.php`, `frontend/js/app.js`, and
   `frontend/css/style.css` directly — just refresh your browser at
   `http://localhost/kitchen-pickleball-system/frontend/index.html`
   after saving changes (no build step required).

## How the pieces connect

- **frontend/js/app.js** calls `../backend/api/*.php` with `fetch()`,
  sending/receiving JSON. Login sessions are handled with native PHP
  sessions (a cookie), so `credentials: "same-origin"` is used on
  every request.
- **backend/api/*.php** each handle one job (register, login, list
  courts, check slot availability, create a booking, cancel a
  booking, list a user's schedule, list notifications) and talk to
   MongoDB through `backend/config.php`.
- **database/seed.php** creates indexes and six sample courts across
   three locations.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "MongoDB connection failed" | Check the Atlas URI, database user, and Network Access allowlist. |
| Blank page / PHP code shown as text | You opened the file directly instead of via `http://localhost/...` — Apache isn't serving it. |
| "Could not reach the server" | Apache isn't running, or the project isn't in `htdocs`. |
| Login says "no account found" | Make sure you're registering before logging in — accounts don't come pre-seeded, only courts do. |

## Security note

Passwords are hashed with PHP's `password_hash()` (bcrypt) — this is
real, reasonable security for a project like this. There's no email
verification, rate limiting, or HTTPS setup, so treat this as a
learning/demo project rather than a production deployment as-is.
