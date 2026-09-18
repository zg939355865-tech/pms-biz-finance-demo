import fs from 'node:fs/promises';
import path from 'node:path';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const input = 'D:/项目AI协作/4、PMS业财一体化/docs/测试/PMS业财一体化功能介绍_团队对齐版_20260812.pptx';
const out = './exported-final-preview';
const p = await PresentationFile.importPptx(await FileBlob.load(input));
await fs.mkdir(out, { recursive: true });
for (const [index, slide] of p.slides.items.entries()) {
  const png = await p.export({ slide, format: 'png', scale: 1.5 });
  await fs.writeFile(path.join(out, `slide-${String(index + 1).padStart(2, '0')}.png`), new Uint8Array(await png.arrayBuffer()));
}
const snapshot = await p.inspect({ kind: 'slide,textbox,shape,table,notes,layout', maxChars: 200000 });
await fs.writeFile('./exported-final-inspect.ndjson', snapshot.ndjson, 'utf8');
console.log(p.slides.items.length);
