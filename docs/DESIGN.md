# Cermin Saku — design notes

Design read: a family money product (a parent sends a child an allowance from their BNB) for Indonesian BNB holders.
Dials (energy / rhythm / motion): **2 / 3 / 2**: calm surfaces, strong contrast between sections, reveals and state
transitions but no scroll-jacking.

## Why it looks different from Cermin

Cermin (Kiel) speaks in warm cream paper, amber and a Fraunces serif: "a calm private bank". Cermin Saku inherits the
engine but tells a different story, **money handed to someone else on a schedule**, so it borrows from two Indonesian
objects everyone knows:

| Object | What it gives the UI |
|---|---|
| *Buku tabungan* (bank passbook) | Cool blue-white paper, dark "passbook ink" text, ruled rows for the payment ledger |
| *Amplop* (the envelope you hand pocket money in) | Each scheduled allowance is an envelope; a payment the contract refuses is stamped **DITAHAN** (held) |

## Tokens (`frontend/src/app/globals.css`)

| Token | Value | Use | Contrast (computed with `kontras.mjs`, 5 Oct 2026) |
|---|---|---|---|
| canvas | `#F3F6FA` | page background ("passbook paper") | — |
| surface | `#FFFFFF` | cards | — |
| ink | `#0E1F38` | primary text | 15.23:1 on canvas |
| muted | `#4A5A72` | secondary text | 6.46:1 on canvas · 7.00:1 on white |
| line | `#D5DEEA` | borders, ledger rules | fill only |
| tinta (accent) | `#1E4A8F` | the one accent: links, primary button, focus ring (passbook ink, deliberately not a default bright blue) | 7.96:1 on canvas · white on tinta 8.63:1 |
| daun (paid) | `#17663E` | "Dibayar" state, always with a word + icon | 6.98:1 on white |
| stempel (held) | `#B42318` | "Ditahan" stamp, danger | 6.57:1 on white · 4.56:1 on amplop |
| kunyit (warning) | `#9A5B00` | Saku floor / caution text | 5.42:1 on white |
| amplop | `#E8D5B0` | envelope illustration fill | ink on amplop 11.46:1 |

Semantic states are never colour-only: every state has a word (*Aman*, *Ditahan*, *Dibela keeper*, *Zona likuidasi*) and an icon.

## Type

- **Plus Jakarta Sans** (OFL), designed by the Indonesian foundry Tokotype for Jakarta's city identity. Display weight 800,
  tracking −0.02em; body 400/500.
- **Geist Mono** (already in Cermin) for addresses, hashes and amounts in the ledger, `tabular-nums`.

## Logo

No new pictorial logo. The mark is a typographic wordmark "Cermin **Saku**"; Kiel's Cermin icon stays as the favicon as a
sign of where the engine comes from.

## Motion

Envelope reveals and state changes only (fade/slide ≤ 400 ms). `prefers-reduced-motion` turns them off. No parallax on
numbers.
