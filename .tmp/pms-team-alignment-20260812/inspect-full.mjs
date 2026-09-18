import fs from 'node:fs/promises';
import { FileBlob, PresentationFile } from '@oai/artifact-tool';

const p = await PresentationFile.importPptx(await FileBlob.load('./reference.pptx'));
const snapshot = await p.inspect({
  kind: 'slide,textbox,shape,image,table,chart',
  include: 'id,slide,name,title,text,textPreview,textChars,textLines,bbox,bboxUnit,rows,cols,chartType,isPlaceholder,placeholders',
  maxChars: 2000000,
});
await fs.writeFile('./template-inspect/template-inspect.ndjson', snapshot.ndjson, 'utf8');
console.log(snapshot.ndjson.length);
