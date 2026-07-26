# Canvas

Search anything. We organize it.

An AI-native **search canvas** — not a chatbot.

You type naturally. The app builds the best workspace:
- Company overview
- Comparison table
- Spreadsheet
- Timeline
- Knowledge cards

Plus a small **AI Notes** panel for insights.

## Run

```bash
cd ~/Desktop/search-canvas
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Try these

- Cursor
- Complaints about Cursor
- then refine: `compare with Windsurf`
- Best AI accelerators
- Stanford MS&E
- Compare Lovable vs Bolt vs Cursor
- MCP
- Tesla stock
- YC S25 companies

## Architecture (simple)

```
src/
  components/
    landing/          # homepage search
    search/           # input + loading
    workspace/        # all workspace layouts + AI notes
  lib/
    types.ts          # shared types
    query-router.ts   # query → workspace (swap for Exa later)
    mock/             # mock JSON payloads
```

Later: replace `resolveQuery()` with Exa + Firecrawl. UI stays the same.
