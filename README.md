# PoC: make `pixelBasedPreset` convert border radius and max width to pixels

This branch (`personal/aporter/2611-rem-from-pixelbasedpreset-demo`) is a proof of concept, not an upstream-ready PR. It replaces the repository README so the demo is the first thing you see. The upstream README is on `canary`.

## The problem

`pixelBasedPreset` is documented as the fix for Tailwind's `rem` units, which many email clients handle inconsistently. It only overrides `fontSize` and `spacing`. Other utilities that Tailwind defines in `rem` still reach the inlined CSS unchanged:

| Class | Before | After (this branch) |
| --- | --- | --- |
| `rounded`, `rounded-sm` | `0.25rem` | `4px` |
| `rounded-md` | `0.375rem` | `6px` |
| `rounded-lg` | `0.5rem` | `8px` |
| `max-w-md` | `28rem` | `448px` |
| `max-w-7xl` | `80rem` | `1280px` |

## The fix

[`packages/react-email/src/components/tailwind/tailwind.tsx`](packages/react-email/src/components/tailwind/tailwind.tsx) adds two scales to `pixelBasedPreset`:

- `borderRadius`: `DEFAULT` and `xs` to `4xl`.
- `maxWidth`: `3xs` to `7xl`.

Each value is what the `rem` resolves to at a 16px root. `maxWidth` is Tailwind's container scale, so `w-md` and the other container-sized widths change too (`28rem` to `448px`).

Plus: regression tests in `tailwind.spec.tsx`.

## Walk through the demo

You need Node 20.19 or newer and pnpm (`npm install -g pnpm`).

1. Install the package's dependencies and build the render package it imports:

   ```sh
   pnpm install --filter react-email... --frozen-lockfile
   pnpm --filter @react-email/render build
   ```

2. Run the A/B demo, from `packages/react-email`:

   ```sh
   cd packages/react-email
   npx tsx demo/ab.tsx
   ```

   It renders the same receipt email twice, in place, and prints the `rem`/`em` values found in each:

   ```
   A (before) rem/em values: max-width:28rem, border-radius:0.5rem, border-radius:0.375rem, border-radius:0.25rem
   B (after)  rem/em values: none
   ```

   - **A (before)** is the preset with the new `borderRadius` and `maxWidth` scales removed, which is what shipped until now.
   - **B (after)** is the preset as it is on this branch.

3. Open `packages/react-email/demo/out/compare.html` in a browser for the two renders side by side. `before.html` and `after.html` in the same folder are the raw HTML. They look the same in a browser, since a modern browser resolves `rem` fine; the difference is in the CSS values, which is what clients with weak `rem` support see.

4. Change the demo email and rerun: edit the classes in `Email` in [`packages/react-email/demo/ab.tsx`](packages/react-email/demo/ab.tsx) (try `rounded-xl`, `max-w-2xl`, `rounded`) and run it again.

5. Run the tests, from `packages/react-email`:

   ```sh
   npx vitest run src/components/tailwind
   npx tsc --noEmit
   ```

   To see the tests catch the bug, remove the `borderRadius` block from the preset and rerun; the `converts ... to pixels` cases fail.

`demo/out/` is the generated and git-ignored output, `demo/poc_out/` is the same files but included as PoC evidence and is not ignored.

## Evidence for review

Captured output, each regenerated from a fresh run. Read in order; each file starts with how it was produced.

| File | What it shows |
| --- | --- |
| `evidence-02.txt` | Baseline on the published `react-email@6.11.6`: the preset only overrides `fontSize` and `spacing`, and the per-class output still has rem. |
| `evidence-03.txt` | The same classes on this branch, with the remaining rem/em output listed. |
| `evidence-04.txt` | Scope: every rem/em scale in Tailwind's theme, marked covered or not covered. |
| `evidence-05.txt` | The new tests fail 8 of 8 with the fix removed and pass with it; full Tailwind suite, `tsc` and `biome` results. |
| `evidence-06.txt` | Demo output and the exact CSS declarations that differ between A and B. |
| `evidence-07.txt` | Provenance, public discussion found, what was and was not verified, and points to check by hand. |
| `evidence-08-issue-draft.md` | The drafted, unfiled upstream issue. |

## What this does not fix

- Other `rem` or `em` output is untouched, for example `max-w-screen-*` (`48rem`) and `tracking-*` (`0.025em`). They are outside the scales above.
- Outlook on Windows ignores `border-radius` whatever the unit, so a pixel radius does not make rounded corners appear there.
- Users who set their own `theme.borderRadius` or `theme.maxWidth` override these values, as before.
- Only `packages/react-email` was tested. Other packages that use the preset (for example `packages/ui`) were not run.

## Open points for upstream

- Whether pinning these scales belongs in the preset, or the docs should say the preset is partial and show how to extend it.
- Whether to cover more scales; a scan of Tailwind's `rem` theme values would settle it.
