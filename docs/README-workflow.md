# GitHub Pages workflow (not enabled yet)

This file is stored at `docs/github-pages-workflow.yml.example` instead of
`.github/workflows/deploy-pages.yml` on purpose: GitHub refuses to accept
workflow files unless the push token carries the `workflow` scope, and that
blocked the initial push.

To enable auto-deploy to GitHub Pages, either:

1. Push it with a token that has the `workflow` scope:
   ```bash
   mkdir -p .github/workflows
   cp docs/github-pages-workflow.yml.example .github/workflows/deploy-pages.yml
   git add .github && git commit -m "ci: enable GitHub Pages deploy" && git push
   ```

2. Or create it in the GitHub UI: repo → **Actions** → **New workflow** →
   **set up a workflow yourself** → paste the file contents → commit.
