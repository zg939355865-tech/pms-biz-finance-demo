import { FileBlob, PresentationFile } from '@oai/artifact-tool';
const p=await PresentationFile.importPptx(await FileBlob.load('./reference.pptx'));
const s=p.slides.getItem(1);
console.log('slides methods',Object.getOwnPropertyNames(Object.getPrototypeOf(p.slides)).sort());
console.log('shapes methods',Object.getOwnPropertyNames(Object.getPrototypeOf(s.shapes)).sort());
console.log('table methods',Object.getOwnPropertyNames(Object.getPrototypeOf(s.tables)).sort());
console.log('shape methods',Object.getOwnPropertyNames(Object.getPrototypeOf(s.shapes.items[0])).sort());
console.log('text methods',Object.getOwnPropertyNames(Object.getPrototypeOf(s.shapes.items[0].text ?? {})).sort());
