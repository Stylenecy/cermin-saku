# Cermin Saku — design notes

Design read: a family money product (a parent sends a child an allowance from their BNB) for Indonesian BNB holders.
Dials (energy / rhythm / motion): **2 / 3 / 2**: calm surfaces, strong contrast between sections, reveals and state
transitions but no scroll-jacking.

## Base: Cermin's design system, recoloured

The web app keeps Cermin's own design system (MIT): Fraunces for display with italic accents, Geist and Geist Mono for
text and numbers, warm paper, brown ink, soft cards, film grain and the watercolour illustrations. Cermin Saku changes
the accent story from Cermin's amber to **lake blue, leaf green and earth brown**:

- the amber scale is remapped to blue (`--color-amber-*` now holds blue values so every component follows);
- new `leaf` and `earth` scales for "safe / paid" and for paths and envelopes;
- the watercolours are recoloured by `scripts/recolor-art.py` (blue sky, green land, brown paths) into `public/saku-*.webp`.

Two Indonesian objects carry the Saku-specific parts of the UI:

| Object | What it gives the UI |
|---|---|
| *Buku tabungan* (bank passbook) | the on-chain ledger of every payment, hold and defend |
| *Amplop* (the envelope pocket money is handed in) | each scheduled allowance is an envelope; a payment the contract refuses is stamped **DITAHAN** (held) |

## Tokens (`frontend/src/app/globals.css`)

| Token | Value | Use |
|---|---|---|
| canvas | `#F8F6F1` | page background (paper) |
| surface | `#FCFBF8` | cards |
| ink | `#1F1B17` | primary text |
| muted | `#5C5448` | secondary text |
| line | `#E6E0D4` | borders, ledger rules |
| tinta / amber-500 | `#35648F` | accent: links, italic highlights, focus |
| daun / leaf-600 | `#3D6136` | "Dibayar" / safe state |
| stempel | `#A84A3A` | "Ditahan" stamp, danger |
| kunyit | `#8A5F22` | keeper defends, caution |
| amplop | `#E9DCC2` | envelope fill |

Semantic states are never colour-only: every state has a word (*Aman*, *Ditahan*, *Dibela keeper*, *Zona likuidasi*) and an icon.

## Structure

- **Landing** (`/`): Cermin's section rhythm, rewritten for the allowance story, plus a calculator (`#hitung`) and the
  gate visual (price falls below the safe line, the next envelope is held).
- **App** (behind "Buka aplikasi"): its own navigation (Ringkasan · Uang saku · Penerima, a tab bar on phones);
  sign-in with Google, email or a wallet (Privy) when `NEXT_PUBLIC_PRIVY_APP_ID` is set.
- **`/demo`**: a real testnet vault read without a wallet, for judges and first-time visitors.

## Motion

Reveals and state changes only (fade/slide ≤ 400 ms). `prefers-reduced-motion` turns them off. No parallax on numbers.
