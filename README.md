# Jeevan Mitra

A blood donor coordination platform for hospitals, blood banks and donors. This repository contains a working prototype.

## Purpose

Jeevan Mitra focuses on the coordination gap that can occur when a hospital or patient needs to connect with suitable blood donors. It is intended to support coordination between hospitals, blood banks and donors; it does not replace blood banks or qualified medical professionals.

## Prototype features

The current codebase includes:

- Donor registration and donor profile records.
- Hospital and administrator account workflows.
- Blood-group compatibility matching for donor discovery.
- A 90-day donation cooldown calculation based on the recorded last donation date.
- Blood request and hospital-side workflows.
- JWT-based authenticated routes with role checks.
- QR identifiers for donor lookup workflows.
- Socket.IO setup for real-time application events.
- A browser-based frontend with registration, donor, hospital and administrator views.

The repository is an evolving prototype. The presence of a feature in source code does not mean it has been independently audited or is ready for real-world medical use.

## Technology stack

- **Frontend:** HTML, CSS and JavaScript (browser-based PWA structure).
- **Backend:** Node.js and Express.
- **Database:** MongoDB with Mongoose.
- **Other backend libraries:** Socket.IO, JSON Web Tokens, bcryptjs, express-rate-limit and QR code generation.

The frontend currently uses plain HTML/CSS/JavaScript. It does not use React in the checked-in implementation.

## Architecture

The browser frontend sends API requests to the Node.js/Express backend. Express routes and controllers handle donor, hospital, administrator and blood-request workflows. Mongoose models persist records in MongoDB. Socket.IO is initialized by the backend for application events. Authentication middleware verifies JWTs and applies role checks to protected routes.

## Live link

Provided deployment URL: [https://jeevan-mitra-htx3.vercel.app](https://jeevan-mitra-htx3.vercel.app)

**Availability check:** This URL returned HTTP 404 when checked on 25 November 2026. It is included here as the supplied deployment address, but it should not be treated as a working live demo until the deployment is restored and verified.

## Screenshots

Screenshots have not yet been added. Add current, genuine application screenshots to a folder such as `docs/screenshots/` and link them here.

## Installation and local setup

### Backend

Requirements:

- Node.js 18 or later
- A MongoDB database
- Environment variables configured for the backend

```bash
cd backend
npm install
```

Create a `.env` file in the backend directory. At minimum, configure:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters
CORS_ORIGINS=http://localhost:5500
NODE_ENV=development
```

Use your actual MongoDB connection variable name from `backend/config/database.js` if it differs. Never commit real secrets or production credentials.

Start the backend:

```bash
npm start
```

### Frontend

Serve the `frontend/` directory using a local static web server and configure the API base URL in `frontend/assets/js/config.js` to point to your backend. Open the frontend through the local server rather than relying on direct file access.

## Security considerations in the current code

- Protected routes use JWT verification and role checks in authentication middleware.
- Hospital and administrator password verification uses bcryptjs.
- Express rate limiters are configured for general API requests, login attempts and OTP requests.
- Production startup requires a JWT secret of at least 32 characters and an explicit CORS origin list.
- Donor QR codes are designed to contain an opaque token rather than personal profile details.
- These are code-level safeguards, not a security audit or proof that the application is production-ready.
- The donor OTP flow currently uses a mock SMS function. The generated OTP is returned by the API response for testing; a real SMS provider and production-safe OTP handling are not yet implemented. Do not use this flow for real donor authentication.

## Medical and operational safety

Jeevan Mitra does not replace blood banks or medical professionals. Donor eligibility screening, blood grouping and compatibility testing, collection, storage, cross-matching and transfusion decisions must remain with authorized blood banks and qualified healthcare professionals. The prototype is for coordination and educational demonstration only.

## Limitations

- The application is a working prototype and requires further testing, review and operational hardening.
- The OTP delivery flow is mocked for development/testing.
- A deployment URL currently returns 404 and needs to be restored before it can be presented as a live demo.
- No medical screening, compatibility test or transfusion decision is performed by this software.
- Screenshots and verified deployment evidence have not yet been added to this repository.

## What I learned

- Organizing a browser frontend and a Node.js/Express backend.
- Defining MongoDB models with Mongoose.
- Building API routes and controller-based workflows.
- Applying JWT authentication, role checks and request rate limits.
- Thinking about donor matching, cooldown rules and the boundaries of a healthcare coordination tool.
