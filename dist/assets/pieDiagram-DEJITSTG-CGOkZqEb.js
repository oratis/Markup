import"./milkdown-CEek6Ucv.js";import{t as Z}from"./ordinal-BWIqZ7B5.js";import{t as F}from"./arc-DRckBrQ5.js";import{t as j}from"./pie-B5vuphGE.js";import{t as q}from"./mermaid-parser.core-BJJXvYC7.js";import{n as r,r as v}from"./chunk-AGHRB4JF-CAZMR7zq.js";import{B as H,C as J,V as K,W as Q,_ as Y,a as tt,b as et,c as at,d as it,v as rt}from"./chunk-ICPOFSXX-DopV1dwE.js";import{t as st}from"./chunk-426QAEUC-Dq1fspzx.js";import{f as ot,r as nt}from"./chunk-5PVQY5BW-I8kJyHeI.js";import{t as lt}from"./chunk-4BX2VUAB-Bh-gg1C9.js";var M=it.pie,C={sections:new Map,showData:!1,config:M},p=C.sections,w=C.showData,ct=structuredClone(M),R={getConfig:r(()=>structuredClone(ct),"getConfig"),clear:r(()=>{p=new Map,w=C.showData,tt()},"clear"),setDiagramTitle:Q,getDiagramTitle:J,setAccTitle:K,getAccTitle:rt,setAccDescription:H,getAccDescription:Y,addSection:r(({label:t,value:a})=>{if(a<0)throw new Error(`"${t}" has invalid value: ${a}. Negative values are not allowed in pie charts. All slice values must be >= 0.`);p.has(t)||(p.set(t,a),v.debug(`added new section: ${t}, with value: ${a}`))},"addSection"),getSections:r(()=>p,"getSections"),setShowData:r(t=>{w=t},"setShowData"),getShowData:r(()=>w,"getShowData")},dt=r((t,a)=>{lt(t,a),a.setShowData(t.showData),t.sections.map(a.addSection)},"populateDb"),pt={parse:r(async t=>{const a=await q("pie",t);v.debug(a),dt(a,R)},"parse")},gt=r(t=>`
  .pieCircle{
    stroke: ${t.pieStrokeColor};
    stroke-width : ${t.pieStrokeWidth};
    opacity : ${t.pieOpacity};
  }
  .pieOuterCircle{
    stroke: ${t.pieOuterStrokeColor};
    stroke-width: ${t.pieOuterStrokeWidth};
    fill: none;
  }
  .pieTitleText {
    text-anchor: middle;
    font-size: ${t.pieTitleTextSize};
    fill: ${t.pieTitleTextColor};
    font-family: ${t.fontFamily};
  }
  .slice {
    font-family: ${t.fontFamily};
    fill: ${t.pieSectionTextColor};
    font-size:${t.pieSectionTextSize};
    // fill: white;
  }
  .legend text {
    fill: ${t.pieLegendTextColor};
    font-family: ${t.fontFamily};
    font-size: ${t.pieLegendTextSize};
  }
`,"getStyles"),ft=r(t=>{const a=[...t.values()].reduce((s,o)=>s+o,0),D=[...t.entries()].map(([s,o])=>({label:s,value:o})).filter(s=>s.value/a*100>=1);return j().value(s=>s.value).sort(null)(D)},"createPieArcs"),Tt={parser:pt,db:R,renderer:{draw:r((t,a,D,s)=>{v.debug(`rendering pie chart
`+t);const o=s.db,$=et(),y=nt(o.getConfig(),$.pie),z=40,g=18,G=4,l=450,f=l,m=st(a),n=m.append("g");n.attr("transform","translate(225,225)");const{themeVariables:i}=$;let[T]=ot(i.pieOuterStrokeWidth);T??=2;const A=y.textPosition,c=Math.min(f,l)/2-z,L=F().innerRadius(0).outerRadius(c),O=F().innerRadius(c*A).outerRadius(c*A);n.append("circle").attr("cx",0).attr("cy",0).attr("r",c+T/2).attr("class","pieOuterCircle");const d=o.getSections(),P=ft(d),B=[i.pie1,i.pie2,i.pie3,i.pie4,i.pie5,i.pie6,i.pie7,i.pie8,i.pie9,i.pie10,i.pie11,i.pie12];let h=0;d.forEach(e=>{h+=e});const _=P.filter(e=>(e.data.value/h*100).toFixed(0)!=="0"),u=Z(B).domain([...d.keys()]);n.selectAll("mySlices").data(_).enter().append("path").attr("d",L).attr("fill",e=>u(e.data.label)).attr("class","pieCircle"),n.selectAll("mySlices").data(_).enter().append("text").text(e=>(e.data.value/h*100).toFixed(0)+"%").attr("transform",e=>"translate("+O.centroid(e)+")").style("text-anchor","middle").attr("class","slice");const I=n.append("text").text(o.getDiagramTitle()).attr("x",0).attr("y",-400/2).attr("class","pieTitleText"),b=[...d.entries()].map(([e,x])=>({label:e,value:x})),S=n.selectAll(".legend").data(b).enter().append("g").attr("class","legend").attr("transform",(e,x)=>{const X=22*b.length/2;return"translate(216,"+(x*22-X)+")"});S.append("rect").attr("width",g).attr("height",g).style("fill",e=>u(e.label)).style("stroke",e=>u(e.label)),S.append("text").attr("x",22).attr("y",g-G).text(e=>o.getShowData()?`${e.label} [${e.value}]`:e.label);const N=512+Math.max(...S.selectAll("text").nodes().map(e=>e?.getBoundingClientRect().width??0)),E=I.node()?.getBoundingClientRect().width??0,U=f/2-E/2,V=f/2+E/2,k=Math.min(0,U),W=Math.max(N,V)-k;m.attr("viewBox",`${k} 0 ${W} ${l}`),at(m,l,W,y.useMaxWidth)},"draw")},styles:gt};export{Tt as diagram};
