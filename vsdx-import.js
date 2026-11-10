// VSDX is a ZIP package of Visio XML. No document content is executed.
async function importVsdx(buffer, filename='Imported Visio diagram.vsdx') {
  const bytes=new Uint8Array(buffer),view=new DataView(buffer),decoder=new TextDecoder();
  const fail=message=>{throw Error(message)};
  if(bytes.length<22||bytes.length>50*1024*1024)fail('Choose a VSDX file smaller than 50 MB.');
  let end=bytes.length-22;
  while(end>=Math.max(0,bytes.length-65557)&&(view.getUint32(end,true)!==0x06054b50||end+22+view.getUint16(end+20,true)!==bytes.length))end--;
  if(end<Math.max(0,bytes.length-65557))fail('Invalid VSDX ZIP archive.');
  if(view.getUint16(end+4,true)||view.getUint16(end+6,true))fail('Multi-volume ZIP files are not supported.');
  const count=view.getUint16(end+10,true),files=new Map();let offset=view.getUint32(end+16,true),total=0;
  for(let i=0;i<count;i++){
    if(offset+46>end||view.getUint32(offset,true)!==0x02014b50)fail('Invalid VSDX ZIP directory.');
    const flags=view.getUint16(offset+8,true),method=view.getUint16(offset+10,true),size=view.getUint32(offset+20,true),expanded=view.getUint32(offset+24,true),length=view.getUint16(offset+28,true),extra=view.getUint16(offset+30,true),comment=view.getUint16(offset+32,true),local=view.getUint32(offset+42,true);
    if(offset+46+length+extra+comment>end)fail('Invalid VSDX ZIP entry.');
    const name=decoder.decode(bytes.subarray(offset+46,offset+46+length));
    total+=expanded;if(expanded>20*1024*1024||total>100*1024*1024)fail('VSDX contents are too large.');
    if(files.has(name))fail('Duplicate VSDX ZIP entry.');
    files.set(name,{flags,method,size,expanded,local});offset+=46+length+extra+comment;
  }
  async function xml(name){
    const entry=files.get(name);if(!entry)fail(`Missing VSDX part: ${name}`);
    const {flags,method,size,expanded,local}=entry;
    if(flags&1)fail('Encrypted VSDX files are not supported.');
    if(local+30>bytes.length||view.getUint32(local,true)!==0x04034b50)fail('Invalid VSDX ZIP data.');
    const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    if(start+size>bytes.length)fail('Truncated VSDX file.');
    let data=bytes.subarray(start,start+size);
    if(method===8){
      if(typeof DecompressionStream==='undefined')fail('VSDX import needs a browser with DecompressionStream support.');
      const reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),chunks=[];let length=0;
      try{while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>expanded){await reader.cancel();fail('Invalid VSDX expanded size.')}chunks.push(value)}}finally{reader.releaseLock()}
      data=new Uint8Array(length);let at=0;for(const chunk of chunks){data.set(chunk,at);at+=chunk.length}
    }else if(method!==0)fail('Unsupported VSDX ZIP compression.');
    if(data.length!==expanded)fail('Invalid VSDX expanded size.');
    const source=decoder.decode(data);if(/<!DOCTYPE|<!ENTITY/i.test(source))fail('XML entity declarations are not supported.');
    const doc=new DOMParser().parseFromString(source,'application/xml');
    if(doc.getElementsByTagName('parsererror').length)fail('Invalid VSDX XML.');
    return doc;
  }
  const children=(el,name)=>Array.from(el?.children||[]).filter(c=>c.localName===name);
  const child=(el,name)=>children(el,name)[0];
  const cells=el=>Object.fromEntries(children(el,'Cell').map(c=>[c.getAttribute('N'),c.getAttribute('V')]));
  const text=el=>child(el,'Text')?.textContent||'';
  const color=(value,fallback)=>/^#[0-9a-f]{6}$/i.test(value||'')?value:fallback;
  function target(base,path){
    const parts=(path.startsWith('/')?path.slice(1):base+path).split('/'),out=[];
    for(const part of parts){if(part==='..')out.pop();else if(part&&part!=='.')out.push(part)}return out.join('/');
  }
  async function relationships(path){
    const doc=await xml(path);return new Map(Array.from(doc.documentElement.children).filter(r=>r.getAttribute('TargetMode')!=='External').map(r=>[r.getAttribute('Id'),r.getAttribute('Target')]));
  }
  const pages=await xml('visio/pages/pages.xml'),rels=await relationships('visio/pages/_rels/pages.xml.rels');
  const masters=new Map();
  if(files.has('visio/masters/masters.xml')){
    const doc=await xml('visio/masters/masters.xml'),links=await relationships('visio/masters/_rels/masters.xml.rels');
    for(const master of children(doc.documentElement,'Master')){
      const rel=child(master,'Rel'),path=links.get(rel?.getAttribute('r:id'));
      if(path){const m=await xml(target('visio/masters/',path));masters.set(master.getAttribute('ID'),child(child(m.documentElement,'Shapes'),'Shape'))}
    }
  }
  const nodes=[],edges=[],warnings=new Set();let nextPageX=70,pageCount=0;
  for(const [pageIndex,page] of children(pages.documentElement,'Page').entries()){
    const path=rels.get(child(page,'Rel')?.getAttribute('r:id'));if(!path)fail('Missing VSDX page relationship.');
    const doc=await xml(target('visio/pages/',path)),shapes=children(child(doc.documentElement,'Shapes'),'Shape'),pageNodes=[],ids=new Map(),lines=new Map(),connections=new Map();pageCount++;
    for(const [index,s] of shapes.entries()){
      const sid=s.getAttribute('ID');if(!sid||ids.has(sid)||lines.has(sid))fail('Invalid or duplicate VSDX shape ID.');
      const master=masters.get(s.getAttribute('Master')),c={...cells(master),...cells(s)},name=(s.getAttribute('NameU')||s.getAttribute('Name')||master?.getAttribute('NameU')||'').toLowerCase();
      if('BeginX' in c||/\.line(?:\.|$)|dynamic connector/.test(name)){lines.set(sid,{s,c,index});continue}
      const w=Number(c.Width),h=Number(c.Height),pinX=Number(c.PinX),pinY=Number(c.PinY),localX=c.LocPinX===undefined?w/2:Number(c.LocPinX),localY=c.LocPinY===undefined?h/2:Number(c.LocPinY);
      if(![w,h,pinX,pinY,localX,localY].every(Number.isFinite)||!('PinX' in c)||!('PinY' in c)||w<=0||h<=0){warnings.add('Shapes without usable dimensions or positions were skipped.');continue}
      const type=/decision|diamond/.test(name)?'decision':/terminator|terminal|startend/.test(name)?'terminal':/database|cylinder/.test(name)?'database':/document/.test(name)?'document':/parallelogram|inputoutput|datablock/.test(name)?'data':/ellipse|circle/.test(name)?'circle':/text/.test(name)?'text':'process';
      const character=children(s,'Section').find(sec=>sec.getAttribute('N')==='Character')||children(master,'Section').find(sec=>sec.getAttribute('N')==='Character'),font=Number(cells(child(character,'Row')).Size)*96;
      let label=text(s);
      if(!child(s,'Text'))label=children(child(s,'Shapes'),'Shape').map(text).filter(Boolean).join('\n')||text(master);
      if(Number(c.Angle)||Number(c.FlipX)||Number(c.FlipY))warnings.add('Rotated or flipped shapes were imported without rotation or flipping.');
      if(child(s,'Shapes')&&children(child(s,'Shapes'),'Shape').some(n=>child(n,'Text')))warnings.add('Groups were flattened into single editable shapes.');
      const id=`vs${pageIndex}s${index}`;ids.set(sid,id);
      pageNodes.push({id,type,text:label,x:(pinX-localX)*96,y:-(pinY+h-localY)*96,w:w*96,h:h*96,font:Number.isFinite(font)&&font>0?font:14,sw:Number.isFinite(Number(c.LineWeight))?Number(c.LineWeight)*96:2,fill:color(c.FillForegnd,'#ffffff'),stroke:color(c.LineColor,'#8ba593')});
    }
    for(const conn of children(child(doc.documentElement,'Connects'),'Connect')){
      const sid=conn.getAttribute('FromSheet'),cell=conn.getAttribute('FromCell'),part=conn.getAttribute('FromPart'),key=cell==='BeginX'||part==='9'?'from':cell==='EndX'||part==='12'?'to':null;
      if(key){if(!connections.has(sid))connections.set(sid,{});connections.get(sid)[key]=ids.get(conn.getAttribute('ToSheet'))}
    }
    for(const [sid,{s,c,index}] of lines){
      let {from,to}=connections.get(sid)||{};
      if(!from||!to){warnings.add('Connections without two supported shapes were skipped.');continue}
      if(Number(c.BeginArrow)>0&&!(Number(c.EndArrow)>0))[from,to]=[to,from];
      edges.push({id:`vs${pageIndex}e${index}`,from,to,label:text(s)});
    }
    if(pageNodes.length){
      const left=Math.min(...pageNodes.map(n=>n.x)),top=Math.min(...pageNodes.map(n=>n.y));
      for(const n of pageNodes){n.x+=nextPageX-left;n.y+=70-top}
      nextPageX=Math.max(...pageNodes.map(n=>n.x+n.w))+140;nodes.push(...pageNodes);
    }
  }
  if(!nodes.length)fail('No supported shapes were found in this VSDX file.');
  return {title:filename.replace(/\.vsdx$/i,''),nodes,edges,warnings:[...warnings],pageCount,layoutGenerated:false};
}
if(typeof module!=='undefined')module.exports={importVsdx};
