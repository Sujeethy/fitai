---
name: add-llm-provider
description: Add a new LLM provider (Gemini, Groq, OpenRouter, Ollama, or another) to the provider registry. Use when adding or swapping which models the coach can use.
---

# Adding an LLM provider

The registry exists so this is a single file plus one line. If you find yourself
changing anything else, something has leaked.

## 1. Check it fits

- **Streaming?** The side-by-side view needs incremental output to feel right.
- **Tool/function calling?** Without it, the provider can answer questions but
  cannot log sets or swap exercises. That's acceptable — mark it read-only in the
  registry so the UI doesn't offer it for actions.
- **Free tier?** The project's ₹0 promise depends on it. Note the rate limits.

There is **no CORS constraint** — this is a native app, so any HTTP API works. That
was a browser-only limitation from an earlier design.

## 2. Write the adapter

One file in `packages/llm/src/providers/`, implementing `LLMProvider`:

```ts
interface LLMProvider {
  id: string;
  label: string;
  models: string[];
  supportsTools: boolean;
  stream(req: ChatRequest): AsyncIterable<Chunk>;
}
```

- Read the API key from `expo-secure-store` — **never** from the database, a
  constant, or `.env`. See AGENTS.md invariant 10.
- Translate the provider's tool-call format to ours at this boundary. Nothing
  outside this file should know the provider's wire format.
- Map failures onto `AppError`. Never throw — one provider failing must not disturb
  the others in a side-by-side comparison.
- Respect the `AbortSignal`, so cancelling a question actually stops the request.

## 3. Register it

Add to `packages/llm/src/registry.ts`.

## 4. Settings UI

The provider appears automatically. Confirm the key entry field works and that a
missing key produces a clear message rather than a silent failure.

## 5. Test

- Streams incrementally, not one block at the end
- A missing key gives a useful error
- Failure mid-stream leaves other columns running (`Promise.allSettled`, never `all`)
- Tool calls round-trip, if `supportsTools`

## 6. Update the docs

The provider table in `PLAN.md` §10, including the free-tier caveat.
