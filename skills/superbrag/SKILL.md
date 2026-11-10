---
name: superbrag
description: Turn any business website URL into a professional ~30s 1920x1080 promo video - search-box hook, dark "problem" scenes, a "Meet <person>" card, the real site in a browser with a working product panel, a #1 + AI-answer proof scene, a signed quote, a payoff and a clicked CTA - with TTS voiceover, word-synced animation, music and SFX. Use when someone says "/superbrag", "superbrag <url>", or wants a professional promo/ad video from a website or app page.
---

# /superbrag

Website URL in → finished promo video out: a short, polished video about a site, with a voiceover, word-synced animation, and a design language taken from the site itself. Colours, fonts, cards, background and avatar come from **the site being promoted**.
Every image and claim comes from the site. The "screens" are UI mock-ups rendered with Remotion, not AI-generated pixels.

`<skill-dir>` = the folder containing this file. `<ws>` = the user's current project folder.
**One-time setup** (skip if `<skill-dir>/.venv` and `<skill-dir>/template/node_modules` exist): needs Node.js 22+, FFmpeg, Python 3 and espeak-ng, then run `bash <skill-dir>/scripts/setup.sh`. It installs Remotion and Playwright, a Python env with Kokoro (free local voice) and faster-whisper (word timings), and writes their paths to `<skill-dir>/.env`.

## Invocation

```
/superbrag https://example.com
/superbrag https://example.com --focus "restaurants"        # which customer/service to tell the story about
/superbrag https://example.com --voice minimax|elevenlabs|kokoro --voice-id <id>
```
Defaults: the voice is Kokoro `af_heart` (free, local). If `MINIMAX_API_KEY` or `ELEVENLABS_API_KEY` is set in `<skill-dir>/.env`, that provider is used instead. Output goes to `<ws>/superbrag-output/<domain-slug>/`, with a `-2`, `-3` suffix if the folder already exists.

## Step 1: Capture the site

```bash
export PATH="/opt/homebrew/bin:$PATH"   # macOS Homebrew; harmless elsewhere
node <skill-dir>/scripts/capture.mjs <url> <run>
```
This writes `<run>/site.json` (title, meta, headings, CTAs, full text, fonts, Google Fonts links, colours, CSS variables, and the image list with alt text and surrounding context) and `<run>/public/site/*` (every image plus `screenshot-hero.png` and `screenshot-full.png`).

Then **look at the images** (Read them). Details printed inside screenshots (ratings, locations, delivery times) are some of the best proof, so read them, not just the HTML. If the homepage lacks a person photo or product screenshots, capture one or two linked pages (about, projects) into the same run.

**Gate:** you can name the person or business, where they are, the 2–4 services, the best proof (rating, client, numbers), the offer or guarantee, the CTA text, the URL, and which image is the person photo, the avatar or logo, the product screenshot and the proof image.

## Step 2: Write the story (`<run>/story.json`)

Pick **one customer type and one concrete scenario**. One clear story beats three half-stories, so leave the other services out. Choose the service with the strongest visuals and proof, unless `--focus` says otherwise. Then fill in the 9-beat formula. One short spoken sentence per beat, about 75–85 words in total, which comes out at roughly 30 s.

| # | type | Job | Example line (posflexgrowth.com) |
|---|---|---|---|
| 1 | `search` | Hook: the customer searching right now | "Your next patient is searching right now." |
| 2 | `results` | Problem: you're invisible (dark) | "But another clinic shows up first." |
| 3 | `cost` (`enter: slide`) | Cost of the problem (dark receipt, bar shrinks) | "And every missed call goes to whoever answers next." |
| 4 | `meet` | The person or brand: photo + avatar, name, role, place pill, tagline | "Meet Sajal Kumar, PosFlex founder in New Zealand." |
| 5 | `browser` | Show the real product (site screenshot) with a panel doing the job | "Every missed call gets texted back and booked. None of them missed." |
| 6 | `answer` (`enter: blur`) | Proof: ranks #1 + an AI answer recommends it | "Top three on Google Maps, and named when people ask AI." |
| 7 | `quote` | The offer or guarantee on paper, stamped and signed | "And our zero-risk promise, in writing, with a 12-week target." |
| 8 | `payoff` | Tagline + highlighted word; the opening search turns into the result | "Three jobs: get found, get recommended, get booked." |
| 9 | `end` | Name + CTA button clicked + URL | "Get your free growth plan from PosFlex Growth." |

Rules:
- **Copy comes from the site.** Reuse its own phrases (meta description, service lines, how-it-works, FAQ). Invent only scenario details that make it concrete: the search query, dishes and prices, a booking time. Keep invented details plausible for the place: local currency, local names.
- **Repeat the query.** The same search query appears in beats 1, 2, 6 and 8. The story loops back on itself, and that is what makes it feel designed.
- **Say the cue words.** Reveals fire when their word is spoken, so `place`, the first word of `name`/`role`/`tagline`, each `chips` entry, `highlight.cue`, `price` and `highlight` (payoff) must appear in that scene's `say`.
- **The design language comes from the site.** Never reuse another brand's look: every video must look like the site that was fed in. Read `site.json → design` (page colour, card radius, border and shadow, buttons, h1 font, size, weight and tracking, headline emphasis colour, markers) and Read the `public/site/section-*.png` screenshots, then set:
  - `primary` = the main brand colour (buttons and links); `ink` = the site's text colour; `paper` = `design.pageBackground`; `dark` = the site's darkest tone (its ink or dark-mode background) for the problem scenes.
  - `highlight` = a pastel the site actually uses (a marker colour or a CSS var such as `--bg: #DFFAAA`); `accent` = a second brand colour used for pills and numbers.
  - `style`: `radius` = the most common card radius in px; `border` = the card border colour (omit if cards are borderless); `shadow` = `flat` (none), `soft` (faint tinted) or `lifted` (deep); `tracking` = h1 letter-spacing ÷ font-size (e.g. -1.2px/60px = -0.02); `headWeight` = h1 weight; `emphasis` = `design.headlineEmphasisColors[0]`.
  - Fonts: `head` = h1 font, `ui` = body font, `script` = the site's handwriting font, or `Caveat`. All must be Google Fonts.
  - If the site writes headlines in two tones ("Fill your **calendar**"), mark the same words with `*stars*` in `title`, `headline` and `name` (e.g. `"PosFlex*.*"` for a logo dot). They render in the emphasis colour.
- **`background`:** `light` (the site's page colour, flat) for light sites, which covers most of them. `sky` (drifting cartoon clouds on a flat brand colour) **only** if the site itself has a sky or cloud motif. `soft` (flat brand colour with white text) for bold, saturated brands. **No gradients anywhere:** flat colours only.
- **Avatar:** `build.py` automatically uses the site's Apple touch icon for the Meet badge and the end card when one was captured. Only set `avatar` yourself when the site has none, or when that scene is about someone else (e.g. a case study ending on the maker): then add `"keepAvatar": true`.
- **Photo:** for `meet`, use a real person: the founder or owner, from the about or team page if the homepage has none (capture that page into a scratch folder and copy the image over). Crop out any name or caption printed on the image (`ffmpeg -vf crop=...`).
- **Not a person?** In `meet`, use the logo or storefront as `photo` and the mascot or logo as `avatar`, with `kicker: "Meet"` and the brand name.
- **Adapting to other businesses:** a trades site might be `search` "emergency plumber near me" → `results` competitors/ads → `cost` "missed calls this week" → `browser` quote form + click-to-call → `answer` → `quote` "fixed price" → `payoff` "Job booked". SaaS: the search becomes the job-to-be-done, the cost is hours lost, and the browser shows the app.
- **Pronunciation:** check brand and person names. TTS one line per candidate spelling, transcribe each with `$WHISPER_PYTHON`, and keep the spelling that comes back as the real name. For PosFlex, "Pos Flex" was heard as "Poe's Flex", and "Poss Flex" was heard as "POSFLEX". Put the winner in `voice.pronounce`, e.g. `{"PosFlex": "Poss Flex"}`. On-screen text stays correct.

Schema: copy `<skill-dir>/examples/posflexgrowth.story.json` (a light site with full `style` tokens) or `snapshare.story.json` (an app, sky-themed, with phone scenes) and change the values. These props exist per scene type (all optional unless marked *):
- `search`: query*, title, suggestions[]
- `results`: query*, results[{title, sub}]*, title*, pill
- `cost`: title*, label, items[{name, price}]*, totalLabel*, total*, keep*, cut*, cutCue (the word that starts the bar shrinking, default "commission")
- `meet`: photo*, avatar, kicker, name*, role, place, tagline
- `browser`: screenshot*, tab, panel{title*, items[{name, price}], chips[], extra{image, title, sub}, highlight{label, value, cue}, button}
- `answer`: query*, result{image*, rank, name*, meta, rating, ratingLabel}*, below, aiLabel, answer*, source{icon, label}
- `quote`: title*, forLabel, checks[]*, priceLabel, price*, stamp, signature, signNote, signCue (default "writing")
- `payoff`: headline*, highlight, query*, toast{title*, sub, meta}*
- `end`: name*, button*, avatar, url
- `phone` (apps and mobile products): phone* (a framed phone PNG with transparent background, e.g. from the site or App Store screenshots), title*, kicker, big (a large stat like `"*0*"`), points[] (chips that pop when their first word is spoken), icon (app icon), side (`left` | `right`), bg (`brand` | `paper` | `dark`). For an app ad, replace beats 4–6 with 3–5 phone scenes, one feature each. See `examples/snapshare.story.json`.

Every scene can also take `say`, `enter` (`cut` | `slide` | `blur`, default `cut`) and `hold` (extra seconds). Image paths are relative to `<run>/public` (`site/...`).

**Gate:** `story.json` has 9 beats in this order. Every cue word appears in its `say`. All copy traces back to `site.json` or the images, apart from the scenario details.

## Step 3: Build voice + timeline

```bash
python3 <skill-dir>/scripts/build.py <run>
```
This runs TTS for each line (cached by text), trims silence, places each line 0.18 s after its scene's cut, gets word timings with faster-whisper, and writes `<run>/props.json` and `<run>/public/voice.wav`. It prints the timeline, which should total 28–34 s. If it's long, shorten lines; don't speed up the voice. Re-run it after any story edit; visual-only edits don't call TTS again.

## Step 4: Preview, then render

```bash
bash <skill-dir>/scripts/render.sh <run> stills "40,120,200,300,450,560,680,780,880"   # pick frames inside each scene from the build output
bash <skill-dir>/scripts/render.sh <run>                                                # full render, about 30 s
```
Read `stills/sheet.jpg` before the full render. Check that text doesn't overflow cards, that long names fit (shorten copy rather than shrinking fonts), that images show the right subject, and that colours are readable on the background. After the full render, read `qa-sheet.jpg` (one frame per second).

**Gate:** `<run>/superbrag.mp4` exists at about -14 LUFS (printed). The QA sheet shows all 9 beats with nothing cut off.

## Step 5: Deliver

Tell the user the path to `superbrag.mp4`, its length, which customer story you chose and why, and which details were invented (the query, prices). Offer a voice swap (MiniMax or ElevenLabs) if the Kokoro read sounds flat.
Credit line for posting: "Music: Sascha Ende, ende.app (CC BY 4.0)".

## Notes

- Remotion is free for individuals and companies of up to 3 people; larger companies need a licence (remotion.dev/license).
- To change the look for every video, edit `template/src/scenes.tsx` (layouts) and `template/src/ui.tsx` (motion, background, fonts). Preview with `cd template && npx remotion studio src/index.ts --props=<run>/props.json --public-dir=<run>/public`.
- Landscape 1920x1080 only for now. Vertical needs its own layouts in `scenes.tsx`.
