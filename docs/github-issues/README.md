# GitHub issues — bulk create

This folder defines **35 issues**, **12 labels**, and **3 milestones** for the My Govt Jobs roadmap.

## Prerequisites

1. Install [GitHub CLI](https://cli.github.com/) **or** use the PowerShell script with a PAT.
2. Create a token with **Issues: Read and write** on repo `Anilkumar-Nallapaneni/gov-job-alert-Govt-Jobs`.

## Option A — PowerShell (no `gh` required)

```powershell
cd "d:\My Ideas\gov-job-alert-Govt-Jobs"
$env:GITHUB_TOKEN = "ghp_your_token_here"
.\scripts\create-github-issues.ps1
```

Dry run (no API calls):

```powershell
.\scripts\create-github-issues.ps1 -DryRun
```

Custom repo:

```powershell
.\scripts\create-github-issues.ps1 -Repo "Anilkumar-Nallapaneni/gov-job-alert-Govt-Jobs"
```

## Option B — GitHub CLI

After installing `gh` and `gh auth login`:

```powershell
# Labels and milestones still use the PowerShell script once, or create manually.
.\scripts\create-github-issues.ps1
```

## After creation

1. Open [Issues](https://github.com/Anilkumar-Nallapaneni/gov-job-alert-Govt-Jobs/issues).
2. Filter by label: `P0`, `P1`, …
3. Use milestone **Week 1 — Live data MVP** for the current sprint.
4. Add repository secrets for ingest workflow:
   - `MYGOVTJOBS_API_URL` — e.g. `https://your-api.railway.app`
   - `ADMIN_API_KEY` — same as backend `ADMIN_API_KEY`

## Edit issues

Edit `issues.json`, then re-run the script. GitHub does not dedupe by title — delete duplicates manually if you run twice.

## Related

- [docs/ROADMAP.md](../ROADMAP.md) — human-readable roadmap
