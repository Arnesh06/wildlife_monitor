# Wildlife Monitor Dashboard

Modern React + Vite dashboard for the Smart Wildlife Monitor project.

## Architecture

Raspberry Pi / PC detector
→ Supabase PostgreSQL + Storage
→ this dashboard
→ Vercel

No custom Node.js backend is required.

## 1. Install

```bash
npm install
```

## 2. Configure Supabase

Copy:

```bash
copy .env.example .env.local
```

(or manually create `.env.local`)

Put your Supabase publishable key in:

```env
VITE_SUPABASE_URL=https://dbsqmbhnconjbfslrhp.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_KEY
```

Do not put a Supabase secret/service-role key in this frontend.

## 3. Run locally

```bash
npm run dev
```

Open the URL Vite prints, usually:

```text
http://localhost:5173
```

The dashboard expects:

- table: `detections`
- storage bucket: `wildlife-snapshots`
- `snapshot_path` to contain the storage object path

## 4. Realtime

The dashboard listens for new rows inserted into `public.detections`.

If new rows do not appear live, enable Realtime for the `detections` table in Supabase Database → Publications/Realtime settings.

## 5. Deploy to Vercel

Push this project to GitHub, import the repository into Vercel, and add:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

as Vercel environment variables.

Build command:

```text
npm run build
```

Output directory:

```text
dist
```

Vercel can detect the Vite project automatically.

## Important security note

The frontend uses the public/publishable Supabase key. Never expose a secret/service-role key in this project.

For the college prototype, use Row Level Security policies that allow only the reads the dashboard needs. Tighten write/storage policies before deploying a real field installation.
