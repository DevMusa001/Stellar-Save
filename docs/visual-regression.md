# Visual Regression Testing

Stellar-Save uses [Percy](https://percy.io) + [Playwright](https://playwright.dev) to catch unintended UI changes before they reach production.

## How it works

1. Playwright navigates to key UI surfaces and calls `percySnapshot()`.
2. Percy uploads the screenshots to its cloud service and diffs them against the approved baseline.
3. If visual changes are detected, the Percy check on the PR is marked as **needs review**.
4. A team member reviews the diff in the Percy dashboard and either **approves** (new baseline) or **rejects** (fix the regression).

## Setup

### Local development

1. Get a Percy token from [percy.io](https://percy.io) (project → Settings → Token).
2. Export it in your shell:
   ```bash
   export PERCY_TOKEN=<your-token>
   ```
3. Build the frontend and run the visual tests:
   ```bash
   cd frontend
   npm run build
   npm run test:visual
   ```

### CI (GitHub Actions)

Add `PERCY_TOKEN` as a repository secret:  
**Settings → Secrets and variables → Actions → New repository secret**

The workflow (`.github/workflows/visual-regression.yml`) runs automatically on every PR targeting `main` or `develop`.

## Running tests

| Command | Description |
|---|---|
| `npm run test:visual` | Run visual snapshots locally (list reporter) |
| `npm run test:visual:ci` | Run visual snapshots in CI (GitHub reporter) |

## Adding new snapshots

Edit `frontend/src/test/visual/visual.spec.ts`:

```ts
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('My new component', async ({ page }) => {
  await page.goto('/my-route');
  await page.waitForLoadState('networkidle');
  await percySnapshot(page, 'My new component');
});
```

## Approving baseline changes

When intentional UI changes are made:

1. Open the Percy build from the PR checks.
2. Review each changed snapshot.
3. Click **Approve** for expected changes.
4. The PR check turns green and the new screenshots become the baseline.

## Member badge gallery baseline

The member badge gallery is covered by three snapshot pairs (light + dark):

| Snapshot | Route | Spec |
|---|---|---|
| `Member badge gallery - directory` | `/groups/1/members` | `visual.spec.ts` |
| `Member badge gallery - profile badges` | `/members/:address` | `visual.spec.ts` |
| `Mobile: Member badge gallery - directory` | `/groups/1/members` | `mobile.spec.ts` |

Both routes render from fixture data, so the snapshots are deterministic across
runs. `freezeAnimations()` is applied before every capture because badge chips
animate on mount.

### Updating the badge gallery baseline

Follow this when a badge style change is intentional:

1. Push the branch and wait for the Percy check to report **needs review**.
2. Open the Percy build and confirm every diff is limited to the badge surfaces
   you touched. Diffs on unrelated snapshots mean the change leaked into shared
   theme tokens and should be narrowed first.
3. Check both the light and dark variant of each pair. Approving only one leaves
   the other pair member as a stale baseline.
4. Click **Approve** on the build. The approved screenshots become the new
   baseline for `main`.
5. If a diff appears without any intended change, re-run
   `npm run test:visual` twice before approving; a diff that does not reproduce
   is flake, not drift, and should be reported rather than approved.

## Mobile visual regression

Mobile baselines are captured in `frontend/src/test/visual/mobile.spec.ts`.
Each screen is snapshotted in both light and dark mode across six device profiles:

| Project name | Device |
|---|---|
| `desktop-1280` | Desktop Chrome 1280x720 |
| `mobile-pixel5` | Pixel 5 (393x851) |
| `mobile-pixel7` | Pixel 7 (412x915) |
| `mobile-iphone14` | iPhone 14 (390x844) |
| `mobile-iphone14-pro-max` | iPhone 14 Pro Max (430x932) |
| `tablet-ipad-pro` | iPad Pro 11 (834x1194) |

Percy groups all device snapshots under the same snapshot name so you can
compare layouts side by side in the review UI.

### Updating mobile baselines

1. Make your intentional UI change and open a PR.
2. The Percy check will show diffs for every affected device/mode combination.
3. Open the Percy build link from the PR checks.
4. Review each diff image - Percy shows a before/after overlay.
5. Click **Approve** for each expected change. The check turns green and the
   new screenshots become the baseline.

Only reviewers with write access to the Percy project can approve baselines.
Approvals are tracked per-build in the Percy audit log.

### Adding new mobile snapshots

Add a `test()` block in `frontend/src/test/visual/mobile.spec.ts` and use
`snapshotBothModes(page, 'Unique snapshot name')` to capture light and dark
variants automatically. The name must be globally unique across both spec files.

## Configuration

| File | Purpose |
|---|---|
| `frontend/playwright.visual.config.ts` | Playwright config; defines device project matrix |
| `frontend/src/test/visual/visual.spec.ts` | Desktop Percy snapshot suite |
| `frontend/src/test/visual/mobile.spec.ts` | Mobile/tablet Percy snapshot suite |
| `.github/workflows/visual-regression.yml` | CI workflow |

## Diff thresholds

Percy's default diff threshold is **0%** (any pixel change triggers a review). To adjust sensitivity, configure it in the Percy dashboard under **Project → Settings → Diff sensitivity**.

## Troubleshooting

**Percy check is skipped in CI**  
The workflow only runs when `PERCY_TOKEN` is set. Forks without the secret will skip the job gracefully.

**Flaky snapshots due to animations**  
The test helper `freezeAnimations()` in `visual.spec.ts` disables CSS transitions and animations. Apply it before taking snapshots on pages with motion.

**`npm run test:visual` fails locally**  
Make sure you ran `npm run build` first — the visual tests use `vite preview` (the production build), not the dev server.
