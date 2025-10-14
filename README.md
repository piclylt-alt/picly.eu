# Picly v2
Landing + Cloudflare Pages Functions (email capture via Resend) + demo dropzone.

## Quick start (Cloudflare Pages)
1) **Create Project → Upload** (išarchyvuok ir įkelk visą repo turinį).
2) Skiltyje **Settings → Environment variables (Production & Preview)** pridėk:
   - `RESEND_API_KEY` — tavo Resend API raktas
   - `OWNER_EMAIL` — kur gauti pranešimus (pvz., hello@picly.eu)
   - `FROM_EMAIL` — siuntėjo adresas (pvz., Picly <noreply@picly.eu>)
   - *Svarbu:* `FROM_EMAIL` turi naudoti Resend’e patvirtintą domeną/adresą, kitaip laiškai nebus išsiųsti.

3) Deploy. Formos (`#earlyAccessForm`, `#betaForm`) POST'ina į `/api/subscribe`.

### Domenas
`domenai.lt` → pridėk CNAME į `picly.pages.dev` ir „Custom domains“ su `picly.eu` Cloudflare Pages projekte.

### Mailerlite alternatyva
Jei vietoj Resend nori Mailerlite, pakeisk `/functions/api/subscribe.js` vidų — POST į ML API su tavo list ID.

### Pastabos
- Demo dropzone nieko neįkelia į serverį — tik rodo peržiūras ir generuoja demo nuorodą.
- Pilnai funkcionaliam dalinimuisi rekomenduojama naudoti S3/R2, presigned upload ir DB (D1 ar supabase) — galim prisidėti v3.
"# picly" 
"# picly" 
