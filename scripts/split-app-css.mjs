import fs from 'node:fs';
import path from 'node:path';

const src = path.join('frontend/src/styles/app.css');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const dir = path.join('frontend/src/styles');

const markers = [
  { file: 'tokens.css', ranges: [[0, 118]] },
  { file: 'global.css', ranges: [[119, 191], [444, 517]] },
  {
    file: 'layout.css',
    ranges: [
      [192, 443],
      [518, 875],
      [876, 1023],
      [3122, 3187],
      [3717, 3824],
    ],
  },
  {
    file: 'home.css',
    ranges: [[1023, 1993], [3187, 3716], [3825, lines.length]],
  },
  { file: 'jobs.css', ranges: [[1993, 3045]] },
  { file: 'map.css', ranges: [[3045, 3122], [3457, 3519]] },
];

for (const m of markers) {
  const chunk = m.ranges.flatMap(([a, b]) => lines.slice(a, b));
  fs.writeFileSync(path.join(dir, m.file), `${chunk.join('\n')}\n`);
}

const imports = ['tokens.css', 'global.css', 'layout.css', 'home.css', 'jobs.css', 'map.css']
  .map((f) => `@import './${f}';`)
  .join('\n');

fs.writeFileSync(
  src,
  `/* My Govt Jobs — domain stylesheets (split for maintainability) */\n${imports}\n`,
);

console.log(`Split ${lines.length} lines into ${markers.length} files`);
