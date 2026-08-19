# Jeevan Mitra — Backend

Node.js / Express / MongoDB / Socket.IO backend for the Jeevan Mitra blood donation platform.

## Setup

```bash
npm install
cp .env.example .env
# fill in MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD in .env
npm run dev
```

On first boot with an empty database, the server auto-creates one admin
account from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` — use that to log
into the Admin portal for the first time.

## Structure

- `server.js` — app entry point, mounts all routes
- `config/` — MongoDB connection, Socket.IO init
- `models/` — Donor, Hospital, Admin, Request (Mongoose schemas)
- `controllers/` — request handlers, grouped by resource
- `routes/` — Express routers, grouped by resource
- `middleware/` — JWT auth guard, rate limiting, error handling
- `services/` — cooldown (90-day rule), blood-group matching, QR payload, rewards, socket notifications
- `sockets/` — Socket.IO connection/room handling
- `uploads/` — donor profile photos (multer disk storage)

## Notes

- **OTP is mocked.** Fast2SMS is blocked by DLT for this route, so `sendSMS()`
  in `controllers/authController.js` just logs the code and (outside
  production) returns it in the response as `devOtp` so the flow is testable
  end-to-end. Swap in a real SMS provider there when one is available.
- **Password reset** uses the same mock-code pattern, for hospital and admin
  accounts (donors log in via OTP, not password).
- **Hospital accounts** are created by an admin with `isVerified: false` and
  must be toggled on before that hospital can log in.
- **QR verification**: the frontend renders the donor's QR client-side
  (`donorId` + `name` + `bloodGroup` as JSON). `GET /api/donors/:donorId/verify`
  is the hospital-side lookup after a scan; `PATCH /api/hospital/complete/:id`
  (aliased in `server.js`, body `{ donorId }`) records the donation, enforces
  the 90-day cooldown, and awards points.
