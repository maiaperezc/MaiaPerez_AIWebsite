# The AI Line

A single-page explainer on artificial intelligence, drawn as a metro map. Plain HTML, CSS and vanilla JavaScript, with no build step and no frameworks.

## The map

Three long lines run the full width, plus a dashed fourth that is still being built:

- **How it works** (blue): Data, Patterns, Compute, Answer, Check
- **What it gives us** (green): Range, Study, Reach, Work, Health
- **What goes wrong** (orange): Bias, Over-trust, Outages, Power, Fakes, Jobs
- **Under construction** (dashed purple): Agents, Warning

A white link joins the three stations in one column because they share one cause (for example Patterns, Study and Over-trust: the model predicts likely text, which makes it a fast tutor and an over-trusted one).

## Files

```
ai-project/
├── index.html     all text and the inline SVG map
├── styles.css     tokens, layout, map poster, station tickets, responsive rules
├── script.js      map interactions (commented)
└── assets/
    └── favicon.svg
```

## What is interactive

- Click or press Enter on a station to open its ticket. Arrow keys move along a line, Escape closes it.
- Hover a station for a one-line preview; hover a white link to see which stations share its cause.
- Click a line name on the map to show only that line; click it again to show all.
- "Take a trip" runs a train along a whole line (or the Studying route) and opens each stop in turn.
- Each ticket has a small line diagram; click a dot to jump to that stop.
- On phones the map swipes sideways and the stations become a vertical line diagram.

## Before you submit

1. In `index.html`, find `[describe one real change you made]` and replace it with a real change you made after testing.
2. The "Study" station says "I use AI as a tutor, never a source." Edit it so it matches what you really do.
3. Check the AI acknowledgement (here and on the site) matches exactly what you used.
4. Read each source and confirm every claim next to its `[n]` reference.
5. Keep the total visible text at 1,000 words or fewer (it is about 977 now, counting every label).

## Local preview

Open `index.html` in a browser, or run this from the project folder:

```sh
python3 -m http.server
```

## Publish with GitHub Pages

1. Create a new **public** repository named `ai-project`.
2. Put `index.html`, `styles.css`, `script.js` and `assets/` directly in the repository root.
3. Commit and push to the `main` branch.
4. On GitHub: Settings, Pages, Build and deployment, Deploy from a branch, choose `main` and `/ (root)`, Save.
5. After a few minutes open `https://USERNAME.github.io/ai-project/` and check the layout, links, fonts and mobile view.
6. Submit two links: the Pages URL and `https://github.com/USERNAME/ai-project`.

## AI-use acknowledgement

I acknowledge the use of Claude (Anthropic) to brainstorm, research sources and redesign the layout, and ChatGPT (OpenAI) to draft the first code. I checked each fact against the sources, edited the writing and tested the site. The final work is my responsibility.
