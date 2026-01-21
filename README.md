# Pogo Baby Log (MVP)

Next.js + TypeScript + Tailwind + Supabase.

## 1) Local run
1. `cp .env.example .env.local` and fill:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. `npm install`
3. `npm run dev`

## 2) Deploy (Vercel)
- Import repo from GitHub
- Add the same env vars in Vercel Project Settings → Environment Variables
- Deploy

## Notes
- UI is in Serbian (sr-RS).
- Family is created automatically on signup (per your Supabase trigger).
- Invite flow: Settings → Porodica i bebe → "Dodaj roditelja" (creates invite record + shows link token you can send). The actual email sending is intentionally left out; you can wire it later with an Edge Function + Resend/SendGrid.
