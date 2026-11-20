// dev helper: split a "@@@ path" bundle into catalog files. node tools/unbundle.mjs <bundle.txt>
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const text = fs.readFileSync(process.argv[2], 'utf8');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'catalog');
let n = 0;
for (const part of text.split(/^@@@ /m).slice(1)) {
  const nl = part.indexOf('\n');
  const rel = part.slice(0, nl).trim(), body = part.slice(nl + 1).replace(/\s+$/, '') + '\n';
  const f = path.join(root, rel);
  fs.mkdirSync(path.dirname(f), {recursive: true});
  if (rel.endsWith('.json') && !rel.endsWith('anim.json')) JSON.parse(body);
  fs.writeFileSync(f, rel.endsWith('meta.json') ? JSON.stringify(JSON.parse(body), null, 2) + '\n' : body);
  n++;
}
console.log(`${n} files`);
