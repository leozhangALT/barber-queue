---
description: Commit and push current changes to main on GitHub
triggers:
  - "push up"
  - "push the code"
  - "push changes"
  - "commit and push"
  - /push
---

# Push: commit and push to main

1. Run `git status` to see what's changed. If the working tree is clean, tell the user there's nothing to commit.

2. Show the user a summary of what will be committed and ask for a commit message — or if they already provided one, use that.

3. Stage, commit, and push:

```bash
cd C:/personal/barber-queue
git add -p   # review hunks interactively, or use specific file paths
git status   # confirm what's staged before committing
git commit -m "<message>"
git push origin main
```

**Safety rules:**
- Never use `git add .` or `git add -A` without first reviewing `git status` for unexpected files (env files, secrets, large binaries).
- Never force-push (`--force`) to main without explicit user confirmation.
- If there are merge conflicts or the push is rejected, diagnose the cause and report back — do not rebase or reset without asking.

After a successful push, report the commit hash and confirm the push landed on `origin/main`.
