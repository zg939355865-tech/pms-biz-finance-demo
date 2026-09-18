import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('./reference.pptx'));
for (const n of [4,9,24]) { const s=p.slides.getItem(n-1); console.log('SLIDE',n); for(const x of s.shapes.items) console.log(x.id,JSON.stringify(x.text?.toString?.()||''),x.placeholderType||'',x.position); for(const x of s.tables.items) console.log('table',x.id); }
