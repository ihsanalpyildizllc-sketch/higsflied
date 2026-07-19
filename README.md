# Higgsfield — Open Generative AI Studio

A free, open, self-hostable studio for creating AI-generated **images**, **video**, and
**lip-sync** content. Inspired by the open generative-AI studio pattern, rebuilt with a
Higgsfield-branded interface: a dark, glassmorphism UI with per-studio controls, a model
picker, reference uploads, and a browser-persisted generation history.

> Runs out of the box in **demo mode** — no API key required. Wire your own model gateway
> to go live.

## Features

- **Image Studio** — text-to-image & image-to-image (Soul 2, Soul Cast, Nano Banana Pro, Flux Pro, Z-Image)
- **Video Studio** — text-to-video & image-to-video (Kling 3.0 / Turbo, Seedance 2.0, Sora)
- **Lip Sync Studio** — animate a portrait or sync lips to a script
- **Cinema Studio** — camera-controlled cinematic shots
- **Workflow Studio** — node-pipeline templates (scaffold)
- Dynamic controls that adapt to each model (aspect ratios, durations)
- Up to 14 reference images per generation
- Generation history saved to `localStorage`
- Responsive dark glassmorphism interface

## Tech stack

- **Next.js 14** (App Router) + **React 18**
- **TypeScript**
- **Tailwind CSS v3**
- A provider-agnostic `/api/generate` route

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Production build:

```bash
npm run build && npm run start
```

## Demo vs. live mode

By default the app runs in **demo mode**: `/api/generate` returns deterministic placeholder
assets so the whole interface is usable with zero configuration.

To go live with real generation via [Muapi.ai](https://muapi.ai):

1. Sign up at muapi.ai and copy your API key.
2. In the project root: `cp .env.example .env.local`
3. Paste the key: `MUAPI_API_KEY=your-key-here`
4. Restart the dev server.

The Muapi integration (submit → poll `predictions/{id}/result`) lives in
[`app/api/generate/route.ts`](app/api/generate/route.ts). Model-to-endpoint slugs are in the
`MUAPI_ENDPOINTS` map there — tweak them to taste against the
[Muapi API reference](https://muapi.ai/docs/api-reference). The key stays server-side and
`.env.local` is gitignored, so it never reaches the browser or the repo.

## Project structure

```
higsflied/
├── app/
│   ├── api/generate/route.ts   # generation endpoint (demo + live)
│   ├── globals.css             # Tailwind + glass theme
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── Sidebar.tsx             # studio navigation
│   ├── Studio.tsx              # main client orchestrator
│   ├── Controls.tsx            # model picker + chip controls
│   └── Gallery.tsx             # results grid + history
├── lib/
│   ├── models.ts               # model catalog
│   ├── history.ts              # localStorage persistence
│   └── types.ts
└── tailwind.config.ts
```

## License

MIT
