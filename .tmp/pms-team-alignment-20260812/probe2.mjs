import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('./reference.pptx'));
for (const n of [1,2,8,9,10,11,13,14,15,19,23,24]) {
 const s=p.slides.getItem(n-1); console.log('\nSLIDE',n,'shapeCount',s.shapes.items.length,'tableCount',s.tables.items.length,'chartCount',s.charts.items.length,'imageCount',s.images.items.length);
 for(const x of s.shapes.items){console.log('shape',x.id,JSON.stringify(x.text?.toString?.()||''),x.placeholderType||'',x.position)}
 for(const x of s.tables.items){console.log('table',x.id,x.rows?.count,x.columns?.count,x.toProto?.().table?.rows?.length)}
 for(const x of s.charts.items){console.log('chart',x.id,x.chartType)}
}
