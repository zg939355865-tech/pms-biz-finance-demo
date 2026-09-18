const fs=require('fs'),path=require('path');
function scan(d){
  for(const f of fs.readdirSync(d)){
    const p=path.join(d,f);
    const st=fs.statSync(p);
    if(st.isDirectory()){scan(p);continue;}
    if(!f.endsWith('.json'))continue;
    let s;
    try{s=JSON.parse(fs.readFileSync(p,'utf8'));}catch(e){continue;}
    for(const a of (s.pageActions||[])){
      if(a.code==='audit'||a.code==='reverse-audit'){
        console.log(p,'|',a.code,'| modal:',a.target||'NONE','| next:',a.nextStatus||'-');
      }
    }
  }
}
scan('schemas/pages');
