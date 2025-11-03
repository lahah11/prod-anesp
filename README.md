# ANESP Mission Order Management

This repository contains the rebuilt ANESP mission order workflow consisting of a Node.js/Express backend and a Next.js 14 frontend. It implements the official specification covering mission creation, hierarchical validation, logistics assignments, document generation, notifications, and HR management.

## Getting started

1. **Install dependencies**
   ```bash
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. **Configure environment**
   Create `backend/.env` (or set environment variables) to point the backend to your PostgreSQL instance and
   preferred SMTP provider (Gmail, Outlook/Hotmail, etc.). Example:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/anesp
   # or use DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME when DATABASE_URL is not provided
   EMAIL_FROM=workflow@anesp.gov
   SMTP_SERVICE=gmail            # or outlook, hotmail, etc.
   SMTP_USER=workflow.account@gmail.com
   SMTP_PASS=app-specific-password
   SMTP_SECURE=true              # set to true for TLS (Gmail/Hotmail)
   FRONTEND_URL=http://localhost:3000
   ```

3. **Seed the database**
   ```bash
   npm run seed --prefix backend
   ```
   The seed script creates the base schema, logistics resources, roles, permissions, and default accounts:
   - `engineer@anesp.gov`
   - `tech@anesp.gov`
   - `mg@anesp.gov`
   - `daf@anesp.gov`
   - `dg@anesp.gov`
   - `rh@anesp.gov`

   Each account uses the default password `Password123!`.

4. **Start the backend**
   ```bash
   npm run dev --prefix backend
   ```
   The API listens on `http://localhost:4000` and exposes:
   - `/api/auth` for authentication
   - `/api/missions` for mission workflow
   - `/api/mission-documents` for uploads
   - `/api/resources` for logistics resources
   - `/api/users` for HR operations
   - `/api/notifications` for inbox feeds

5. **Fonts for PDF generation**

   The DG-approved PDF templates expect the fonts `HeiseiKakuGo-W5` and `HYSMyeongJo-Medium` to be available.
   Place the corresponding `.ttf` files in `backend/src/assets/fonts/`. When the files are missing the generator
   falls back to system fonts, but the official typography will not be applied.

6. **Start the frontend**
   ```bash
   npm run dev --prefix frontend
   ```
   Access the UI at `http://localhost:3000` and log in with one of the seeded accounts. Use the language toggle in the sidebar or login screen to switch between French and Arabic (RTL/LTR).

7. **Run automated workflow tests**
   ```bash
   npm --prefix backend test
   ```
   The suite exercises mission creation, the full validation chain, rejection handling, and PDF generation end-to-end against a fresh PostgreSQL schema (in-memory `pg-mem` during tests). When `pg-mem` cannot be resolved (for example, in restricted network environments), the workflow suite is skipped automatically and the command still exits successfully.

## Key features

- **Mission creation** with automatic reference generation (`MIS-YYYY-XXXX`), multi-destination routing, internal/external participants, automatic fuel and per-diem estimates, and justificatif uploads.
- **Hierarchical workflow** (ingénieur → technique → moyens généraux → DAF → DG) with auditable history, role-based notifications/emails, and rejection handling that frees assigned resources.
- **Logistics management** verifying vehicle/driver availability, enforcing aerienne billet uploads, and capturing local transport, lodging, and notes while updating resource availability statuses.
- **Bilingual PDF generation** (FR/AR) for the seven mandatory documents, stored under `storage/documents/<missionId>` with recorded metadata and emailed to all internal participants after DG approval.
- **Notifications and audit** persisted in PostgreSQL, exposing mission links, notification types, and actor roles for timeline rendering.
- **HR module** with role-gated access, search and filters (direction, grade, statut) ensuring agents in mission are excluded from new assignments.
- **Role/permission model** covering `super_admin`, `dg`, `daf`, `moyens_generaux`, `technique`, `rh`, and `ingenieur`, seeded via `npm --prefix backend run seed`.

## Testing and verification

1. Seed a fresh database and launch both applications:

   ```bash
   npm run seed --prefix backend
   npm run dev --prefix backend
   npm run dev --prefix frontend
   ```

2. Connect as `engineer@anesp.gov` / `Password123!`, create a mission with destinations, participants, and justificatifs.
3. Successively validate with the seeded technique, moyens généraux, DAF, and DG accounts, ensuring notifications and emails announce each transition.
4. After DG approval, verify that the bilingual PDF suite is available for download in the mission view and that recipients receive document notifications.
5. Confirm that vehicles/drivers in use are no longer proposed for other missions and that rejected missions free the assigned resources and participant availability.

