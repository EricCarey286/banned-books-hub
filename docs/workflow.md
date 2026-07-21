# Development Workflow & Environment Promotion

This document defines how code moves from a feature branch through to production.

---

## Branching Model

```
feature/*  →  development  →  main
   (local)      (Railway dev)   (Railway prod)
```

| Branch | Purpose | Deploys to |
|---|---|---|
| `feature/*` | Active development work | Local only |
| `development` | Integration + staging | Railway development environment |
| `main` | Production-ready code | Railway production environment |

**Golden rule**: Code only moves forward (`feature` → `development` → `main`). Hotfixes that must bypass development are the only exception — see Hotfix Procedure below.

---

## Standard Development Flow

### 1. Start a Feature Branch

Branch from `development` (not `main`):

```bash
git checkout development
git pull origin development
git checkout -b feature/my-feature-name
```

### 2. Develop and Test Locally

Follow `docs/local-setup.md` to run the app locally. Verify your change passes the **Tier 1 checklist** in `specs/002-railway-cicd-pipeline/quickstart.md` before pushing.

### 3. Open a Pull Request to `development`

Push your branch and open a PR targeting `development`:

```bash
git push -u origin feature/my-feature-name
# Open PR on GitHub: feature/my-feature-name → development
```

PR checklist before requesting review:
- [ ] Tier 1 (local) validation passes
- [ ] No `console.log` debug statements left in code
- [ ] Any new environment variable is added to `docs/env-vars.md`, `backend/.env.example` or `frontend/.env.example`, and configured in Railway `development`
- [ ] TypeScript compiles without errors (`npm run build` in `frontend/`)
- [ ] HTTP status codes match the semantics in the project constitution (400 / 422 / 501)

### 4. Merge to `development`

After PR approval, merge to `development`. Railway automatically deploys the `development` environment within minutes.

### 5. Verify in Development Environment

After the Railway deployment completes, run the **Tier 2 checklist** from `quickstart.md`:
- [ ] Railway deployment shows green status
- [ ] Development frontend URL loads
- [ ] `GET https://<dev-backend>/health` returns `{"status":"healthy","cache":{"connected":true}}`
- [ ] Admin login works with **development** credentials
- [ ] Image uploads reach the development MinIO bucket (`bucket-development-d7ab.up.railway.app`)
- [ ] Production environment is unaffected

### 6. Promote to Production

Only after Tier 2 validation passes, open a PR from `development` to `main`:

```bash
# On GitHub: open PR development → main
```

PR checklist before merging to main:
- [ ] Tier 2 (development environment) validation passes
- [ ] Any new environment variable is also configured in Railway `production`
- [ ] CodeQL security check passes
- [ ] No direct push to `main` — PRs only

After merge, Railway automatically deploys the `production` environment. Verify using the **Tier 3 checklist** from `quickstart.md`.

---

## Hotfix Procedure

Use only for critical production bugs that cannot wait for the normal development cycle.

1. Branch from `main` (not `development`):
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-bug-name
   ```

2. Fix the bug and test locally.

3. Open a PR directly to `main`. Get at least one review. Merge.

4. Railway auto-deploys to production. Verify with Tier 3 checklist.

5. **Immediately back-merge to `development`** to keep branches in sync:
   ```bash
   git checkout development
   git pull origin development
   git merge main
   git push origin development
   ```

---

## Environment Variable Policy

> **Any new environment variable added to the codebase must be documented and configured before the code is merged to `development`.**

Steps:
1. Add the variable to `backend/.env.example` or `frontend/.env.example` with a comment
2. Add a row to `docs/env-vars.md`
3. Set the variable in Railway `development` environment
4. Set the variable in Railway `production` environment (can be done when promoting to prod, but document it in `docs/env-vars.md` first)
5. Update `CLAUDE.md` Environment Variables section

---

## Rollback Procedure

If a deployment introduces a regression:

**Quick rollback (Railway)**:
1. Railway dashboard → select the affected environment → Deployments tab
2. Find the last successful deployment → click **Redeploy**
3. Railway rolls back instantly without a code change

**Code rollback (GitHub)**:
1. Revert the offending commit on the branch (`git revert <sha>`)
2. Open a PR and merge normally through the standard flow
3. Verify with the appropriate tier checklist after deployment

---

## Branch Protection Summary

| Branch | PRs required | Status checks | Direct push |
|---|---|---|---|
| `main` | Yes | CodeQL must pass | Blocked |
| `development` | Yes | — | Blocked (maintainer override: allowed) |

Configure these rules in GitHub: **Settings → Branches → Add rule**.
