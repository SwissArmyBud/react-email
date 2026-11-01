// A/B demo for the pixelBasedPreset rem fix.
//   A ("before"): the preset without its borderRadius and maxWidth scales, i.e. what shipped until now.
//   B ("after"):  the preset as it is in this branch.
// Run from packages/react-email:  npx tsx demo/ab.tsx   (see the README at the repo root)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '@react-email/render';
// biome-ignore lint/correctness/noUnusedImports: tsx compiles JSX to React.createElement here
import React from 'react';
import { Body } from '../src/components/body/index.js';
import { Button } from '../src/components/button/index.js';
import { Container } from '../src/components/container/index.js';
import { Html } from '../src/components/html/index.js';
import {
  pixelBasedPreset,
  Tailwind,
  type TailwindConfig,
} from '../src/components/tailwind/tailwind.js';
import { Text } from '../src/components/text/index.js';

const {
  borderRadius: _r,
  maxWidth: _m,
  ...legacyExtend
} = pixelBasedPreset.theme?.extend as Record<string, unknown>;
const before: TailwindConfig = {
  presets: [{ theme: { extend: legacyExtend } }],
};
const after: TailwindConfig = { presets: [pixelBasedPreset] };

const Email = ({ config }: { config: TailwindConfig }) => (
  <Tailwind config={config}>
    <Html>
      <Body className="bg-gray-100 font-sans">
        <Container className="max-w-md rounded-lg bg-white p-6">
          <Text className="text-lg font-bold">Your receipt</Text>
          <Text className="rounded-md bg-gray-100 p-3 text-sm">
            Total: $42.00
          </Text>
          <Button
            href="https://example.com"
            className="rounded-sm bg-black px-4 py-2 text-white"
          >
            View order
          </Button>
        </Container>
      </Body>
    </Html>
  </Tailwind>
);

const [htmlBefore, htmlAfter] = await Promise.all([
  render(<Email config={before} />),
  render(<Email config={after} />),
]);

const remIn = (html: string) =>
  [...html.matchAll(/([a-z-]+):(-?[\d.]+r?em)/g)].map((m) => `${m[1]}:${m[2]}`);
const unique = (xs: string[]) => [...new Set(xs)];

console.log(
  'A (before) rem/em values:',
  unique(remIn(htmlBefore)).join(', ') || 'none',
);
console.log(
  'B (after)  rem/em values:',
  unique(remIn(htmlAfter)).join(', ') || 'none',
);

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'before.html'), htmlBefore);
writeFileSync(join(out, 'after.html'), htmlAfter);

const esc = (h: string) => h.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const pane = (
  title: string,
  h: string,
  rems: string[],
) => `<section><h2>${title}</h2>
<p><code>${unique(rems).join(' ') || 'no rem or em values'}</code></p>
<iframe srcdoc="${esc(h)}"></iframe></section>`;
writeFileSync(
  join(out, 'compare.html'),
  `<!doctype html><meta charset="utf-8"><title>pixelBasedPreset A/B</title>
<style>body{font:14px system-ui;margin:16px}main{display:flex;gap:16px}section{flex:1}
iframe{width:100%;height:380px;border:1px solid #ccc}code{word-break:break-all}</style>
<main>${pane('A: before', htmlBefore, remIn(htmlBefore))}${pane('B: after', htmlAfter, remIn(htmlAfter))}</main>`,
);
console.log(`Wrote ${join(out, 'compare.html')}`);
