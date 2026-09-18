import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('./reference.pptx'));
const t=p.slides.getItem(1).tables.items[0];
console.log('table methods',Object.getOwnPropertyNames(Object.getPrototypeOf(t)).sort());
console.log('cells methods',Object.getOwnPropertyNames(Object.getPrototypeOf(t.cells)).sort());
console.log('row',JSON.stringify(t.toProto()).slice(0,6000));
