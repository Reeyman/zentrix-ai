---
description: Verify the application is using live OpenAI recommendations after billing or quota is fixed
---
1. Make sure `.env.local` contains the intended `OPENAI_API_KEY` and that the key has active billing or available quota.
2. Make sure the local app is running on `http://localhost:3000`.
3. Run the live AI smoke test:
// turbo
npm run verify:live-ai
4. Confirm the script reports all of the following:
- workspace mode is `connected`
- `analysisMode` is `live`
- `usingRealAI` is `true`
- `model` is not `heuristic-fallback`
5. If the script fails, inspect the reported `fallbackReason` and fix the upstream issue before retrying.
6. After the script passes, refresh the AI Center page and verify the live AI status is reflected in the UI.
