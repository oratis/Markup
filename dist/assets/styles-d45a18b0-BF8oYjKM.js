import{A as y,Ct as C,H as q,O as $,P as D,Qt as M,S as m,T as A,U as R,Xt as I,Yn as F,Yt as _,Zt as U,et as H,f as z,v as X,wn as Y}from"./milkdown-CEek6Ucv.js";import{t as j}from"./channel-EfZX-Li1.js";import{t as K}from"./graphlib-Bj0buIcO.js";import{t as Q}from"./index-5325376f-CG4JjC7k.js";function W(e){return typeof e=="string"?new I([document.querySelectorAll(e)],[document.documentElement]):new I([M(e)],U)}function ce(e,l){return!!e.children(l).length}function de(e){return E(e.v)+":"+E(e.w)+":"+E(e.name)}var Z=/:/g;function E(e){return e?String(e).replace(Z,"\\:"):""}function J(e,l){l&&e.attr("style",l)}function pe(e,l,c){l&&e.attr("class",l).attr("class",c+" "+e.attr("class"))}function be(e,l){var c=l.graph();if(Y(c)){var a=c.transition;if(F(a))return a(e)}return e}function O(e,l){var c=e.append("foreignObject").attr("width","100000"),a=c.append("xhtml:div");a.attr("xmlns","http://www.w3.org/1999/xhtml");var i=l.label;switch(typeof i){case"function":a.insert(i);break;case"object":a.insert(function(){return i});break;default:a.html(i)}J(a,l.labelStyle),a.style("display","inline-block"),a.style("white-space","nowrap");var d=a.node().getBoundingClientRect();return c.attr("width",d.width).attr("height",d.height),c}var G={},ee=function(e){const l=Object.keys(e);for(const c of l)G[c]=e[c]},P=async function(e,l,c,a,i,d){const w=a.select(`[id="${c}"]`),n=Object.keys(e);for(const p of n){const r=e[p];let k="default";r.classes.length>0&&(k=r.classes.join(" ")),k=k+" flowchart-label";const h=A(r.styles);let t=r.text!==void 0?r.text:r.id,s;if(y.info("vertex",r,r.labelType),r.labelType==="markdown")y.info("vertex",r,r.labelType);else if(X(m().flowchart.htmlLabels))s=O(w,{label:t}).node(),s.parentNode.removeChild(s);else{const x=i.createElementNS("http://www.w3.org/2000/svg","text");x.setAttribute("style",h.labelStyle.replace("color:","fill:"));const T=t.split(z.lineBreakRegex);for(const f of T){const u=i.createElementNS("http://www.w3.org/2000/svg","tspan");u.setAttributeNS("http://www.w3.org/XML/1998/namespace","xml:space","preserve"),u.setAttribute("dy","1em"),u.setAttribute("x","1"),u.textContent=f,x.appendChild(u)}s=x}let b=0,o="";switch(r.type){case"round":b=5,o="rect";break;case"square":o="rect";break;case"diamond":o="question";break;case"hexagon":o="hexagon";break;case"odd":o="rect_left_inv_arrow";break;case"lean_right":o="lean_right";break;case"lean_left":o="lean_left";break;case"trapezoid":o="trapezoid";break;case"inv_trapezoid":o="inv_trapezoid";break;case"odd_right":o="rect_left_inv_arrow";break;case"circle":o="circle";break;case"ellipse":o="ellipse";break;case"stadium":o="stadium";break;case"subroutine":o="subroutine";break;case"cylinder":o="cylinder";break;case"group":o="rect";break;case"doublecircle":o="doublecircle";break;default:o="rect"}const S=await D(t,m());l.setNode(r.id,{labelStyle:h.labelStyle,shape:o,labelText:S,labelType:r.labelType,rx:b,ry:b,class:k,style:h.style,id:r.id,link:r.link,linkTarget:r.linkTarget,tooltip:d.db.getTooltip(r.id)||"",domId:d.db.lookUpDomId(r.id),haveCallback:r.haveCallback,width:r.type==="group"?500:void 0,dir:r.dir,type:r.type,props:r.props,padding:m().flowchart.padding}),y.info("setNode",{labelStyle:h.labelStyle,labelType:r.labelType,shape:o,labelText:S,rx:b,ry:b,class:k,style:h.style,id:r.id,domId:d.db.lookUpDomId(r.id),width:r.type==="group"?500:void 0,type:r.type,dir:r.dir,props:r.props,padding:m().flowchart.padding})}},V=async function(e,l,c){y.info("abc78 edges = ",e);let a=0,i={},d,w;if(e.defaultStyle!==void 0){const n=A(e.defaultStyle);d=n.style,w=n.labelStyle}for(const n of e){a++;const p="L-"+n.start+"-"+n.end;i[p]===void 0?(i[p]=0,y.info("abc78 new entry",p,i[p])):(i[p]++,y.info("abc78 new entry",p,i[p]));let r=p+"-"+i[p];y.info("abc78 new link id to be used is",p,r,i[p]);const k="LS-"+n.start,h="LE-"+n.end,t={style:"",labelStyle:""};switch(t.minlen=n.length||1,n.type==="arrow_open"?t.arrowhead="none":t.arrowhead="normal",t.arrowTypeStart="arrow_open",t.arrowTypeEnd="arrow_open",n.type){case"double_arrow_cross":t.arrowTypeStart="arrow_cross";case"arrow_cross":t.arrowTypeEnd="arrow_cross";break;case"double_arrow_point":t.arrowTypeStart="arrow_point";case"arrow_point":t.arrowTypeEnd="arrow_point";break;case"double_arrow_circle":t.arrowTypeStart="arrow_circle";case"arrow_circle":t.arrowTypeEnd="arrow_circle";break}let s="",b="";switch(n.stroke){case"normal":s="fill:none;",d!==void 0&&(s=d),w!==void 0&&(b=w),t.thickness="normal",t.pattern="solid";break;case"dotted":t.thickness="normal",t.pattern="dotted",t.style="fill:none;stroke-width:2px;stroke-dasharray:3;";break;case"thick":t.thickness="thick",t.pattern="solid",t.style="stroke-width: 3.5px;fill:none;";break;case"invisible":t.thickness="invisible",t.pattern="solid",t.style="stroke-width: 0;fill:none;";break}if(n.style!==void 0){const o=A(n.style);s=o.style,b=o.labelStyle}t.style=t.style+=s,t.labelStyle=t.labelStyle+=b,n.interpolate!==void 0?t.curve=$(n.interpolate,C):e.defaultInterpolate!==void 0?t.curve=$(e.defaultInterpolate,C):t.curve=$(G.curve,C),n.text===void 0?n.style!==void 0&&(t.arrowheadStyle="fill: #333"):(t.arrowheadStyle="fill: #333",t.labelpos="c"),t.labelType=n.labelType,t.label=await D(n.text.replace(z.lineBreakRegex,`
`),m()),n.style===void 0&&(t.style=t.style||"stroke: #333; stroke-width: 1.5px;fill:none;"),t.labelStyle=t.labelStyle.replace("color:","fill:"),t.id=r,t.classes="flowchart-link "+k+" "+h,l.setEdge(n.start,n.end,t,a)}},te=function(e,l){return l.db.getClasses()},re=async function(e,l,c,a){y.info("Drawing flowchart");let i=a.db.getDirection();i===void 0&&(i="TD");const{securityLevel:d,flowchart:w}=m(),n=w.nodeSpacing||50,p=w.rankSpacing||50;let r;d==="sandbox"&&(r=_("#i"+l));const k=d==="sandbox"?_(r.nodes()[0].contentDocument.body):_("body"),h=d==="sandbox"?r.nodes()[0].contentDocument:document,t=new K({multigraph:!0,compound:!0}).setGraph({rankdir:i,nodesep:n,ranksep:p,marginx:0,marginy:0}).setDefaultEdgeLabel(function(){return{}});let s;const b=a.db.getSubGraphs();y.info("Subgraphs - ",b);for(let f=b.length-1;f>=0;f--)s=b[f],y.info("Subgraph - ",s),a.db.addVertex(s.id,{text:s.title,type:s.labelType},"group",void 0,s.classes,s.dir);const o=a.db.getVertices(),S=a.db.getEdges();y.info("Edges",S);let x=0;for(x=b.length-1;x>=0;x--){s=b[x],W("cluster").append("text");for(let f=0;f<s.nodes.length;f++)y.info("Setting up subgraphs",s.nodes[f],s.id),t.setParent(s.nodes[f],s.id)}await P(o,t,l,k,h,a),await V(S,t);const T=k.select(`[id="${l}"]`);if(await Q(k.select("#"+l+" g"),t,["point","circle","cross"],"flowchart",l),R.insertTitle(T,"flowchartTitleText",w.titleTopMargin,a.db.getDiagramTitle()),q(t,T,w.diagramPadding,w.useMaxWidth),a.db.indexNodes("subGraph"+x),!w.htmlLabels){const f=h.querySelectorAll('[id="'+l+'"] .edgeLabel .label');for(const u of f){const v=u.getBBox(),g=h.createElementNS("http://www.w3.org/2000/svg","rect");g.setAttribute("rx",0),g.setAttribute("ry",0),g.setAttribute("width",v.width),g.setAttribute("height",v.height),u.insertBefore(g,u.firstChild)}}Object.keys(o).forEach(function(f){const u=o[f];if(u.link){const v=_("#"+l+' [id="'+f+'"]');if(v){const g=h.createElementNS("http://www.w3.org/2000/svg","a");g.setAttributeNS("http://www.w3.org/2000/svg","class",u.classes.join(" ")),g.setAttributeNS("http://www.w3.org/2000/svg","href",u.link),g.setAttributeNS("http://www.w3.org/2000/svg","rel","noopener"),d==="sandbox"?g.setAttributeNS("http://www.w3.org/2000/svg","target","_top"):u.linkTarget&&g.setAttributeNS("http://www.w3.org/2000/svg","target",u.linkTarget);const L=v.insert(function(){return g},":first-child"),N=v.select(".label-container");N&&L.append(function(){return N.node()});const B=v.select(".label");B&&L.append(function(){return B.node()})}}})},fe={setConf:ee,addVertices:P,addEdges:V,getClasses:te,draw:re},le=(e,l)=>{const c=j,a=c(e,"r"),i=c(e,"g"),d=c(e,"b");return H(a,i,d,l)},ae=e=>`.label {
    font-family: ${e.fontFamily};
    color: ${e.nodeTextColor||e.textColor};
  }
  .cluster-label text {
    fill: ${e.titleColor};
  }
  .cluster-label span,p {
    color: ${e.titleColor};
  }

  .label text,span,p {
    fill: ${e.nodeTextColor||e.textColor};
    color: ${e.nodeTextColor||e.textColor};
  }

  .node rect,
  .node circle,
  .node ellipse,
  .node polygon,
  .node path {
    fill: ${e.mainBkg};
    stroke: ${e.nodeBorder};
    stroke-width: 1px;
  }
  .flowchart-label text {
    text-anchor: middle;
  }
  // .flowchart-label .text-outer-tspan {
  //   text-anchor: middle;
  // }
  // .flowchart-label .text-inner-tspan {
  //   text-anchor: start;
  // }

  .node .katex path {
    fill: #000;
    stroke: #000;
    stroke-width: 1px;
  }

  .node .label {
    text-align: center;
  }
  .node.clickable {
    cursor: pointer;
  }

  .arrowheadPath {
    fill: ${e.arrowheadColor};
  }

  .edgePath .path {
    stroke: ${e.lineColor};
    stroke-width: 2.0px;
  }

  .flowchart-link {
    stroke: ${e.lineColor};
    fill: none;
  }

  .edgeLabel {
    background-color: ${e.edgeLabelBackground};
    rect {
      opacity: 0.5;
      background-color: ${e.edgeLabelBackground};
      fill: ${e.edgeLabelBackground};
    }
    text-align: center;
  }

  /* For html labels only */
  .labelBkg {
    background-color: ${le(e.edgeLabelBackground,.5)};
    // background-color: 
  }

  .cluster rect {
    fill: ${e.clusterBkg};
    stroke: ${e.clusterBorder};
    stroke-width: 1px;
  }

  .cluster text {
    fill: ${e.titleColor};
  }

  .cluster span,p {
    color: ${e.titleColor};
  }
  /* .cluster div {
    color: ${e.titleColor};
  } */

  div.mermaidTooltip {
    position: absolute;
    text-align: center;
    max-width: 200px;
    padding: 2px;
    font-family: ${e.fontFamily};
    font-size: 12px;
    background: ${e.tertiaryColor};
    border: 1px solid ${e.border2};
    border-radius: 2px;
    pointer-events: none;
    z-index: 100;
  }

  .flowchartTitleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${e.textColor};
  }
`,ue=ae;export{J as a,ce as c,pe as i,W as l,ue as n,be as o,O as r,de as s,fe as t};
