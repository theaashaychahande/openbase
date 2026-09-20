# openbase

A self-hosted, spreadsheet-style database builder — an open Airtable alternative. Build tables with rich field types, link records, switch between Grid and Kanban views, filter and sort, and let formulas calculate values for you.

## What is it?

openbase turns a database into something you can use like a spreadsheet. You create **Bases** (workbooks), fill them with **Tables**, define **Columns** (fields), and add **Rows** (records) — no SQL required.

## What is it used for?

Organising any kind of structured information: products, orders, customers, tasks, inventory, projects, contacts — anywhere you currently fight with messy spreadsheets or disconnected notes.

- Consistent data via typed fields (single-select, checkbox, date, …)
- Find anything with free-text search, filters, and multi-field sorts
- View data as a Grid or a drag-and-drop Kanban board
- Link records between tables instead of copy-pasting
- Automatic math and logic with formula columns (`{Price} * {Quantity}`, `IF(...)`, `CONCAT(...)`, `SUM(...)`)

## Why is it different (and useful)?

| Approach | Problem |
| --- | --- |
| Spreadsheets | No structure — typos and inconsistencies break filters, totals, and links |
| Notes / docs | Cannot be filtered, sorted, linked, or recalculated |
| Raw databases (SQL) | Powerful but requires code and database knowledge |

openbase gives you **spreadsheet ease with database structure** — controlled field types, real relationships, automatic formulas, and multiple views — without writing a line of SQL. Data lives in your own **Supabase** project, so there is no vendor lock-in.

## Feature status

Already working:

- Auth (email + password, JWT)
- Bases, tables, fields, records (CRUD)
- Field types: text, long text, number, checkbox, single/multi select, date, attachment, linked record, **formula**
- File attachments stored in Supabase Storage
- Grid (optimistic editing) + Record detail modal
- Kanban view (group by single-select, drag-and-drop updates values)
- Search, filters, and multi-field sorting, persisted per view
- Encrypted credentials vault + connection tests (settings)

In the works / possible next steps:

- Commenting on records, richer formula functions, more views (calendar, gallery), activity history

## Running it

Requires a **Supabase** project and two terminals.

1. **Database (once):** run the migrations in `server/src/migrations/` (`003_schema.sql` → `006_formula.sql`) in the Supabase SQL Editor.
2. **Server:** `cd server` → create `.env` from `.env.example` → `npm install` → `npm run dev` (port 4000).
3. **Client:** `cd client` → `npm install` → `npm run dev` → open http://localhost:5173.

See **USER-MANUAL.md** for a full step-by-step user guide.

> Tip: the README answers «what is it», the user manual answers «how do I use it».

## Project structure

```
openbase/
├─ server/                 # Express API (Node 18+, ESM)
│  ├─ src/
│  │  ├─ index.js          # App entry + route mounting
│  │  ├─ middleware/       # JWT auth
│  │  ├─ routes/           # auth, bases, tables, fields, records, files, credentials
│  │  ├─ lib/              # supabase client, encryption, ownership, formula engine
│  │  └─ migrations/       # SQL run once in Supabase (003 → 006)
│  └─ .env.example
├─ client/                 # React + Vite + Tailwind app
│  └─ src/
│     ├─ components/       # Sidebar, Grid, Kanban, Toolbar, RecordModal, TableTabs…
│     ├─ pages/            # Home, Settings, Workspace, login/signup
│     ├─ lib/              # api client, query engine, record utils
│     └─ context/          # auth context
└─ README.md
```

## Tech stack

- **Server:** Express 4, @supabase/supabase-js (service role), JSON Web Tokens, Multer (uploads), AES-256 encryption for stored credentials
- **Client:** React 19, Vite, Tailwind CSS 4, React Router 7, oxlint
- **Storage:** Supabase Postgres + Supabase Storage (public attachments bucket)