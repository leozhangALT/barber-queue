---
description: Start the barber-queue Vite dev server on localhost:5173
triggers:
  - "start the app"
  - "run the app"
  - "launch the app"
  - /run
---

# Run: barber-queue dev server

Start the Vite dev server in the background and verify it's responding.

```bash
cd C:/personal/barber-queue && npm run dev -- --port 5173 &
sleep 4
curl -s http://localhost:5173 | head -5
```

If curl returns HTML, the server is up. Tell the user the app is running at **http://localhost:5173**.

If port 5173 is already in use, the server will fail — check with `netstat -an | grep 5173` and either kill the existing process or let the user know it's already running.
