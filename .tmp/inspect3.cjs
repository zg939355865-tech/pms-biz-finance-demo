const P=__dirname+'/../schemas/pages/procurement/purchase-order.json';
const s=require(P);
console.log(JSON.stringify(s.pageActions.filter(a=>['audit','reverse-audit'].includes(a.code)),null,1));
