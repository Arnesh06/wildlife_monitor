# Wildlife Guardian Dashboard (v3)

React + Vite dashboard for the Smart Wildlife Monitor. Same architecture as before, no backend needed:

Raspberry Pi / PC detector → Supabase (PostgreSQL + Storage + Realtime) → this dashboard → Vercel

## Quick start

```bash
npm install
copy .env.example .env.local     # (macOS/Linux: cp)
# put your Supabase URL + publishable key in .env.local
npm run dev
```

Before running, check the folder contains `src/main.jsx`, `src/App.jsx`, and the `src/components`, `src/views`, `src/hooks`, `src/lib` folders.

**Try it without a database:** open `http://localhost:5173/?demo=1` for simulated live data.

## What's inside

| View | Highlights |
|---|---|
| Overview | Corridor status banner, animated stats + sparklines, live snapshot with viewfinder, radar range view, timeline, species mix, live feed |
| Analytics | Interactive timeline, 7x24 activity heatmap, generated insights, crossing hours, risk split, deterrent rate, confidence histogram |
| Detections | Table or gallery, search, species/risk/radar filters, sorting, pagination, CSV + JSON export, event modal with arrow-key navigation |
| Incidents | Medium/high-risk desk with acknowledge (stored in your browser only) |
| Node Health | Last-seen, events/hour, actuator usage, realtime status + connection log, setup checklist |
| Settings | Light/dark/auto theme, habitat accents, toasts, alert sound, desktop notifications, density, default range |

Extras: `Ctrl/Cmd + K` command palette, time-range selector (1H/24H/7D/ALL, queried server-side), high-risk alert sound, mobile bottom navigation, reduced-motion support.

## Supabase expectations (unchanged)

- table `detections` (`node_id, created_at, animal, confidence, radar_detected, radar_distance, track_id, risk_level, laser_active, led_active, buzzer_active, snapshot_path`)
- storage bucket `wildlife-snapshots`
- Realtime enabled on `detections`

The dashboard is read-only and never writes to Supabase.

## Deploy (Vercel)

Import the repo, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (optionally `VITE_NODE_ID`). Build command `npm run build`, output `dist`.

## Security note

Use only the public/publishable Supabase key here, never a service-role key. Tighten RLS policies before a real field installation.
