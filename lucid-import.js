// Import the Lucidchart JSON export format (pages[].items).
function importLucidchart(data) {
  if(data?.product!=='lucidchart'||!Array.isArray(data.pages)||!data.pages.length)throw Error('Not a Lucidchart JSON export');
  const nodes=[],edges=[],warnings=[];
  const text=item=>(item.textAreas||[]).map(area=>typeof area.text==='string'?area.text:'').filter(Boolean).join('\n');
  for(const [pageIndex,page] of data.pages.entries()){
    const shapes=page.items?.shapes;
    if(!Array.isArray(shapes))throw Error('Lucidchart page has no shape list');
    const ids=new Map();
    for(const [index,shape] of shapes.entries()){
      if(typeof shape.id!=='string'||ids.has(shape.id))throw Error('Invalid or duplicate Lucidchart shape ID');
      const id=`lucid${pageIndex}s${index}`;ids.set(shape.id,id);
      const cls=(shape.class||'').toLowerCase();
      const type=/decision|diamond/.test(cls)?'decision':/terminator|terminal|startend/.test(cls)?'terminal':/database|cylinder/.test(cls)?'database':/document/.test(cls)?'document':/parallelogram|inputoutput|datablock/.test(cls)?'data':/ellipse|circle/.test(cls)?'circle':/text/.test(cls)?'text':'process';
      const label=text(shape),lines=label.split('\n');
      nodes.push({id,type,text:label,x:0,y:0,w:Math.max(210,...lines.map(line=>line.length*8+32)),h:Math.max(type==='decision'?115:72,lines.length*19+26),font:14,sw:2,fill:type==='decision'?'#fcf2d9':'#ffffff',stroke:'#8ba593'});
    }
    for(const [index,line] of (page.items.lines||[]).entries()){
      let from=ids.get(line.endpoint1?.connectedTo),to=ids.get(line.endpoint2?.connectedTo);
      if(!from||!to){warnings.push('A connection with a missing endpoint was skipped.');continue}
      if(line.endpoint1?.style==='Arrow'&&line.endpoint2?.style==='None')[from,to]=[to,from];
      edges.push({id:`lucid${pageIndex}e${index}`,from,to,label:text(line)});
    }
  }
  // Collapse cycles into strongly connected components before assigning ranks.
  const outgoing=new Map(nodes.map(n=>[n.id,[]]));
  edges.forEach(e=>outgoing.get(e.from).push(e.to));
  let nextIndex=0;const indexes=new Map(),low=new Map(),stack=[],active=new Set(),components=[];
  function visit(id){indexes.set(id,nextIndex);low.set(id,nextIndex++);stack.push(id);active.add(id);
    for(const to of outgoing.get(id)){if(!indexes.has(to)){visit(to);low.set(id,Math.min(low.get(id),low.get(to)))}else if(active.has(to))low.set(id,Math.min(low.get(id),indexes.get(to)))}
    if(low.get(id)===indexes.get(id)){const group=[];let current;do{current=stack.pop();active.delete(current);group.push(current)}while(current!==id);components.push(group)}
  }
  nodes.forEach(n=>{if(!indexes.has(n.id))visit(n.id)});
  const componentOf=new Map();components.forEach((group,i)=>group.forEach(id=>componentOf.set(id,i)));
  const links=components.map(()=>new Set()),indegree=components.map(()=>0),ranks=components.map(()=>0);
  edges.forEach(e=>{const a=componentOf.get(e.from),b=componentOf.get(e.to);if(a!==b&&!links[a].has(b)){links[a].add(b);indegree[b]++}});
  const queue=indegree.flatMap((n,i)=>n===0?[i]:[]);
  for(let i=0;i<queue.length;i++){const a=queue[i];for(const b of links[a]){ranks[b]=Math.max(ranks[b],ranks[a]+1);if(--indegree[b]===0)queue.push(b)}}
  const columns=new Map();nodes.forEach(n=>{const rank=ranks[componentOf.get(n.id)];if(!columns.has(rank))columns.set(rank,[]);columns.get(rank).push(n)});
  const tallest=Math.max(0,...[...columns.values()].map(col=>col.reduce((sum,n)=>sum+n.h+45,0)));
  const columnWidth=Math.max(210,...nodes.map(n=>n.w))+90;
  for(const [rank,col] of columns){let y=70+(tallest-col.reduce((sum,n)=>sum+n.h+45,0))/2;for(const n of col){n.x=70+rank*columnWidth;n.y=y;y+=n.h+45}}
  return {title:typeof data.title==='string'?data.title:'Imported Lucidchart diagram',nodes,edges,warnings:[...new Set(warnings)],layoutGenerated:true};
}
if(typeof module!=='undefined')module.exports={importLucidchart};
