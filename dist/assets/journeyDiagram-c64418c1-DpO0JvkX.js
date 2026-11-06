import{s as ut}from"./rolldown-runtime-DwyjGMXk.js";import{$t as yt,B as dt,L as ft,R as pt,S as P,Yt as q,b as gt,d as mt,en as xt,m as _t,w as kt,x as vt}from"./milkdown-CEek6Ucv.js";import{t as K}from"./arc-DRckBrQ5.js";import{a as bt,i as wt,o as it,t as $t}from"./svgDrawCommon-b86b1483-CFOgJspD.js";var Jt=ut(xt(),1),Kt=yt(),X=(function(){var t=function(r,i,u,a){for(u=u||{},a=r.length;a--;u[r[a]]=i);return u},e=[6,8,10,11,12,14,16,17,18],n=[1,9],o=[1,10],s=[1,11],l=[1,12],h=[1,13],f=[1,14],y={trace:function(){},yy:{},symbols_:{error:2,start:3,journey:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NEWLINE:10,title:11,acc_title:12,acc_title_value:13,acc_descr:14,acc_descr_value:15,acc_descr_multiline_value:16,section:17,taskName:18,taskData:19,$accept:0,$end:1},terminals_:{2:"error",4:"journey",6:"EOF",8:"SPACE",10:"NEWLINE",11:"title",12:"acc_title",13:"acc_title_value",14:"acc_descr",15:"acc_descr_value",16:"acc_descr_multiline_value",17:"section",18:"taskName",19:"taskData"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,2]],performAction:function(i,u,a,d,p,c,b){var m=c.length-1;switch(p){case 1:return c[m-1];case 2:this.$=[];break;case 3:c[m-1].push(c[m]),this.$=c[m-1];break;case 4:case 5:this.$=c[m];break;case 6:case 7:this.$=[];break;case 8:d.setDiagramTitle(c[m].substr(6)),this.$=c[m].substr(6);break;case 9:this.$=c[m].trim(),d.setAccTitle(this.$);break;case 10:case 11:this.$=c[m].trim(),d.setAccDescription(this.$);break;case 12:d.addSection(c[m].substr(8)),this.$=c[m].substr(8);break;case 13:d.addTask(c[m-1],c[m]),this.$="task";break}},table:[{3:1,4:[1,2]},{1:[3]},t(e,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:n,12:o,14:s,16:l,17:h,18:f},t(e,[2,7],{1:[2,1]}),t(e,[2,3]),{9:15,11:n,12:o,14:s,16:l,17:h,18:f},t(e,[2,5]),t(e,[2,6]),t(e,[2,8]),{13:[1,16]},{15:[1,17]},t(e,[2,11]),t(e,[2,12]),{19:[1,18]},t(e,[2,4]),t(e,[2,9]),t(e,[2,10]),t(e,[2,13])],defaultActions:{},parseError:function(i,u){if(u.recoverable)this.trace(i);else{var a=new Error(i);throw a.hash=u,a}},parse:function(i){var u=this,a=[0],d=[],p=[null],c=[],b=this.table,m="",F=0,H=0,lt=2,Z=1,ot=c.slice.call(arguments,1),x=Object.create(this.lexer),M={yy:{}};for(var j in this.yy)Object.prototype.hasOwnProperty.call(this.yy,j)&&(M.yy[j]=this.yy[j]);x.setInput(i,M.yy),M.yy.lexer=x,M.yy.parser=this,typeof x.yylloc>"u"&&(x.yylloc={});var z=x.yylloc;c.push(z);var ct=x.options&&x.options.ranges;typeof M.yy.parseError=="function"?this.parseError=M.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function ht(){var T=d.pop()||x.lex()||Z;return typeof T!="number"&&(T instanceof Array&&(d=T,T=d.pop()),T=u.symbols_[T]||T),T}for(var _,S,k,Y,I={},R,w,J,N;;){if(S=a[a.length-1],this.defaultActions[S]?k=this.defaultActions[S]:((_===null||typeof _>"u")&&(_=ht()),k=b[S]&&b[S][_]),typeof k>"u"||!k.length||!k[0]){var O="";N=[];for(R in b[S])this.terminals_[R]&&R>lt&&N.push("'"+this.terminals_[R]+"'");x.showPosition?O="Parse error on line "+(F+1)+`:
`+x.showPosition()+`
Expecting `+N.join(", ")+", got '"+(this.terminals_[_]||_)+"'":O="Parse error on line "+(F+1)+": Unexpected "+(_==Z?"end of input":"'"+(this.terminals_[_]||_)+"'"),this.parseError(O,{text:x.match,token:this.terminals_[_]||_,line:x.yylineno,loc:z,expected:N})}if(k[0]instanceof Array&&k.length>1)throw new Error("Parse Error: multiple actions possible at state: "+S+", token: "+_);switch(k[0]){case 1:a.push(_),p.push(x.yytext),c.push(x.yylloc),a.push(k[1]),_=null,H=x.yyleng,m=x.yytext,F=x.yylineno,z=x.yylloc;break;case 2:if(w=this.productions_[k[1]][1],I.$=p[p.length-w],I._$={first_line:c[c.length-(w||1)].first_line,last_line:c[c.length-1].last_line,first_column:c[c.length-(w||1)].first_column,last_column:c[c.length-1].last_column},ct&&(I._$.range=[c[c.length-(w||1)].range[0],c[c.length-1].range[1]]),Y=this.performAction.apply(I,[m,H,F,M.yy,k[1],p,c].concat(ot)),typeof Y<"u")return Y;w&&(a=a.slice(0,-1*w*2),p=p.slice(0,-1*w),c=c.slice(0,-1*w)),a.push(this.productions_[k[1]][0]),p.push(I.$),c.push(I._$),J=b[a[a.length-2]][a[a.length-1]],a.push(J);break;case 3:return!0}}return!0}};y.lexer=(function(){return{EOF:1,parseError:function(i,u){if(this.yy.parser)this.yy.parser.parseError(i,u);else throw new Error(i)},setInput:function(r,i){return this.yy=i||this.yy||{},this._input=r,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var r=this._input[0];return this.yytext+=r,this.yyleng++,this.offset++,this.match+=r,this.matched+=r,r.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),r},unput:function(r){var i=r.length,u=r.split(/(?:\r\n?|\n)/g);this._input=r+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-i),this.offset-=i;var a=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),u.length-1&&(this.yylineno-=u.length-1);var d=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:u?(u.length===a.length?this.yylloc.first_column:0)+a[a.length-u.length].length-u[0].length:this.yylloc.first_column-i},this.options.ranges&&(this.yylloc.range=[d[0],d[0]+this.yyleng-i]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},less:function(r){this.unput(this.match.slice(r))},pastInput:function(){var r=this.matched.substr(0,this.matched.length-this.match.length);return(r.length>20?"...":"")+r.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var r=this.match;return r.length<20&&(r+=this._input.substr(0,20-r.length)),(r.substr(0,20)+(r.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var r=this.pastInput(),i=new Array(r.length+1).join("-");return r+this.upcomingInput()+`
`+i+"^"},test_match:function(r,i){var u,a,d;if(this.options.backtrack_lexer&&(d={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(d.yylloc.range=this.yylloc.range.slice(0))),a=r[0].match(/(?:\r\n?|\n).*/g),a&&(this.yylineno+=a.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:a?a[a.length-1].length-a[a.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+r[0].length},this.yytext+=r[0],this.match+=r[0],this.matches=r,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(r[0].length),this.matched+=r[0],u=this.performAction.call(this,this.yy,this,i,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),u)return u;if(this._backtrack){for(var p in d)this[p]=d[p];return!1}return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var r,i,u,a;this._more||(this.yytext="",this.match="");for(var d=this._currentRules(),p=0;p<d.length;p++)if(u=this._input.match(this.rules[d[p]]),u&&(!i||u[0].length>i[0].length)){if(i=u,a=p,this.options.backtrack_lexer){if(r=this.test_match(u,d[p]),r!==!1)return r;if(this._backtrack){i=!1;continue}else return!1}else if(!this.options.flex)break}return i?(r=this.test_match(i,d[a]),r!==!1?r:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var i=this.next();return i||this.lex()},begin:function(i){this.conditionStack.push(i)},popState:function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(i){return i=this.conditionStack.length-1-Math.abs(i||0),i>=0?this.conditionStack[i]:"INITIAL"},pushState:function(i){this.begin(i)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(i,u,a,d){switch(a){case 0:break;case 1:break;case 2:return 10;case 3:break;case 4:break;case 5:return 4;case 6:return 11;case 7:return this.begin("acc_title"),12;case 8:return this.popState(),"acc_title_value";case 9:return this.begin("acc_descr"),14;case 10:return this.popState(),"acc_descr_value";case 11:this.begin("acc_descr_multiline");break;case 12:this.popState();break;case 13:return"acc_descr_multiline_value";case 14:return 17;case 15:return 18;case 16:return 19;case 17:return":";case 18:return 6;case 19:return"INVALID"}},rules:[/^(?:%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:#[^\n]*)/i,/^(?:journey\b)/i,/^(?:title\s[^#\n;]+)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:section\s[^#:\n;]+)/i,/^(?:[^#:\n;]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[12,13],inclusive:!1},acc_descr:{rules:[10],inclusive:!1},acc_title:{rules:[8],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,9,11,14,15,16,17,18,19],inclusive:!0}}}})();function g(){this.yy={}}return g.prototype=y,y.Parser=g,new g})();X.parser=X;var Tt=X,A="",G=[],C=[],V=[],Mt=function(){G.length=0,C.length=0,A="",V.length=0,mt()},St=function(t){A=t,G.push(t)},Et=function(){return G},Pt=function(){let t=Q();const e=100;let n=0;for(;!t&&n<e;)t=Q(),n++;return C.push(...V),C},It=function(){const t=[];return C.forEach(e=>{e.people&&t.push(...e.people)}),[...new Set(t)].sort()},At=function(t,e){const n=e.substr(1).split(":");let o=0,s=[];n.length===1?(o=Number(n[0]),s=[]):(o=Number(n[0]),s=n[1].split(","));const l=s.map(f=>f.trim()),h={section:A,type:A,people:l,task:t,score:o};V.push(h)},Ct=function(t){const e={section:A,type:A,description:t,task:t,classes:[]};C.push(e)},Q=function(){const t=function(n){return V[n].processed};let e=!0;for(const[n,o]of V.entries())t(n),e=e&&o.processed;return e},Vt=function(){return It()},D={getConfig:()=>P().journey,clear:Mt,setDiagramTitle:dt,getDiagramTitle:kt,setAccTitle:pt,getAccTitle:vt,setAccDescription:ft,getAccDescription:gt,addSection:St,getSections:Et,getTasks:Pt,addTask:At,addTaskOrg:Ct,getActors:Vt},Lt=t=>`.label {
    font-family: 'trebuchet ms', verdana, arial, sans-serif;
    font-family: var(--mermaid-font-family);
    color: ${t.textColor};
  }
  .mouth {
    stroke: #666;
  }

  line {
    stroke: ${t.textColor}
  }

  .legend {
    fill: ${t.textColor};
  }

  .label text {
    fill: #333;
  }
  .label {
    color: ${t.textColor}
  }

  .face {
    ${t.faceColor?`fill: ${t.faceColor}`:"fill: #FFF8DC"};
    stroke: #999;
  }

  .node rect,
  .node circle,
  .node ellipse,
  .node polygon,
  .node path {
    fill: ${t.mainBkg};
    stroke: ${t.nodeBorder};
    stroke-width: 1px;
  }

  .node .label {
    text-align: center;
  }
  .node.clickable {
    cursor: pointer;
  }

  .arrowheadPath {
    fill: ${t.arrowheadColor};
  }

  .edgePath .path {
    stroke: ${t.lineColor};
    stroke-width: 1.5px;
  }

  .flowchart-link {
    stroke: ${t.lineColor};
    fill: none;
  }

  .edgeLabel {
    background-color: ${t.edgeLabelBackground};
    rect {
      opacity: 0.5;
    }
    text-align: center;
  }

  .cluster rect {
  }

  .cluster text {
    fill: ${t.titleColor};
  }

  div.mermaidTooltip {
    position: absolute;
    text-align: center;
    max-width: 200px;
    padding: 2px;
    font-family: 'trebuchet ms', verdana, arial, sans-serif;
    font-family: var(--mermaid-font-family);
    font-size: 12px;
    background: ${t.tertiaryColor};
    border: 1px solid ${t.border2};
    border-radius: 2px;
    pointer-events: none;
    z-index: 100;
  }

  .task-type-0, .section-type-0  {
    ${t.fillType0?`fill: ${t.fillType0}`:""};
  }
  .task-type-1, .section-type-1  {
    ${t.fillType0?`fill: ${t.fillType1}`:""};
  }
  .task-type-2, .section-type-2  {
    ${t.fillType0?`fill: ${t.fillType2}`:""};
  }
  .task-type-3, .section-type-3  {
    ${t.fillType0?`fill: ${t.fillType3}`:""};
  }
  .task-type-4, .section-type-4  {
    ${t.fillType0?`fill: ${t.fillType4}`:""};
  }
  .task-type-5, .section-type-5  {
    ${t.fillType0?`fill: ${t.fillType5}`:""};
  }
  .task-type-6, .section-type-6  {
    ${t.fillType0?`fill: ${t.fillType6}`:""};
  }
  .task-type-7, .section-type-7  {
    ${t.fillType0?`fill: ${t.fillType7}`:""};
  }

  .actor-0 {
    ${t.actor0?`fill: ${t.actor0}`:""};
  }
  .actor-1 {
    ${t.actor1?`fill: ${t.actor1}`:""};
  }
  .actor-2 {
    ${t.actor2?`fill: ${t.actor2}`:""};
  }
  .actor-3 {
    ${t.actor3?`fill: ${t.actor3}`:""};
  }
  .actor-4 {
    ${t.actor4?`fill: ${t.actor4}`:""};
  }
  .actor-5 {
    ${t.actor5?`fill: ${t.actor5}`:""};
  }
`,Ft=Lt,U=function(t,e){return wt(t,e)},Rt=function(t,e){const o=t.append("circle").attr("cx",e.cx).attr("cy",e.cy).attr("class","face").attr("r",15).attr("stroke-width",2).attr("overflow","visible"),s=t.append("g");s.append("circle").attr("cx",e.cx-15/3).attr("cy",e.cy-15/3).attr("r",1.5).attr("stroke-width",2).attr("fill","#666").attr("stroke","#666"),s.append("circle").attr("cx",e.cx+15/3).attr("cy",e.cy-15/3).attr("r",1.5).attr("stroke-width",2).attr("fill","#666").attr("stroke","#666");function l(y){const g=K().startAngle(Math.PI/2).endAngle(3*(Math.PI/2)).innerRadius(7.5).outerRadius(6.8181818181818175);y.append("path").attr("class","mouth").attr("d",g).attr("transform","translate("+e.cx+","+(e.cy+2)+")")}function h(y){const g=K().startAngle(3*Math.PI/2).endAngle(5*(Math.PI/2)).innerRadius(7.5).outerRadius(6.8181818181818175);y.append("path").attr("class","mouth").attr("d",g).attr("transform","translate("+e.cx+","+(e.cy+7)+")")}function f(y){y.append("line").attr("class","mouth").attr("stroke",2).attr("x1",e.cx-5).attr("y1",e.cy+7).attr("x2",e.cx+5).attr("y2",e.cy+7).attr("class","mouth").attr("stroke-width","1px").attr("stroke","#666")}return e.score>3?l(s):e.score<3?h(s):f(s),o},st=function(t,e){const n=t.append("circle");return n.attr("cx",e.cx),n.attr("cy",e.cy),n.attr("class","actor-"+e.pos),n.attr("fill",e.fill),n.attr("stroke",e.stroke),n.attr("r",e.r),n.class!==void 0&&n.attr("class",n.class),e.title!==void 0&&n.append("title").text(e.title),n},nt=function(t,e){return bt(t,e)},Nt=function(t,e){function n(s,l,h,f,y){return s+","+l+" "+(s+h)+","+l+" "+(s+h)+","+(l+f-y)+" "+(s+h-y*1.2)+","+(l+f)+" "+s+","+(l+f)}const o=t.append("polygon");o.attr("points",n(e.x,e.y,50,20,7)),o.attr("class","labelBox"),e.y=e.y+e.labelMargin,e.x=e.x+.5*e.labelMargin,nt(t,e)},Bt=function(t,e,n){const o=t.append("g"),s=it();s.x=e.x,s.y=e.y,s.fill=e.fill,s.width=n.width*e.taskCount+n.diagramMarginX*(e.taskCount-1),s.height=n.height,s.class="journey-section section-type-"+e.num,s.rx=3,s.ry=3,U(o,s),at(n)(e.text,o,s.x,s.y,s.width,s.height,{class:"journey-section section-type-"+e.num},n,e.colour)},tt=-1,jt=function(t,e,n){const o=e.x+n.width/2,s=t.append("g");tt++,s.append("line").attr("id","task"+tt).attr("x1",o).attr("y1",e.y).attr("x2",o).attr("y2",450).attr("class","task-line").attr("stroke-width","1px").attr("stroke-dasharray","4 2").attr("stroke","#666"),Rt(s,{cx:o,cy:300+(5-e.score)*30,score:e.score});const l=it();l.x=e.x,l.y=e.y,l.fill=e.fill,l.width=n.width,l.height=n.height,l.class="task task-type-"+e.num,l.rx=3,l.ry=3,U(s,l);let h=e.x+14;e.people.forEach(f=>{const y=e.actors[f].color;st(s,{cx:h,cy:e.y,r:7,fill:y,stroke:"#000",title:f,pos:e.actors[f].position}),h+=10}),at(n)(e.task,s,l.x,l.y,l.width,l.height,{class:"task"},n,e.colour)},zt=function(t,e){$t(t,e)},at=(function(){function t(s,l,h,f,y,g,r,i){o(l.append("text").attr("x",h+y/2).attr("y",f+g/2+5).style("font-color",i).style("text-anchor","middle").text(s),r)}function e(s,l,h,f,y,g,r,i,u){const{taskFontSize:a,taskFontFamily:d}=i,p=s.split(/<br\s*\/?>/gi);for(let c=0;c<p.length;c++){const b=c*a-a*(p.length-1)/2,m=l.append("text").attr("x",h+y/2).attr("y",f).attr("fill",u).style("text-anchor","middle").style("font-size",a).style("font-family",d);m.append("tspan").attr("x",h+y/2).attr("dy",b).text(p[c]),m.attr("y",f+g/2).attr("dominant-baseline","central").attr("alignment-baseline","central"),o(m,r)}}function n(s,l,h,f,y,g,r,i){const u=l.append("switch"),a=u.append("foreignObject").attr("x",h).attr("y",f).attr("width",y).attr("height",g).attr("position","fixed").append("xhtml:div").style("display","table").style("height","100%").style("width","100%");a.append("div").attr("class","label").style("display","table-cell").style("text-align","center").style("vertical-align","middle").text(s),e(s,u,h,f,y,g,r,i),o(a,r)}function o(s,l){for(const h in l)h in l&&s.attr(h,l[h])}return function(s){return s.textPlacement==="fo"?n:s.textPlacement==="old"?t:e}})(),Yt=function(t){t.append("defs").append("marker").attr("id","arrowhead").attr("refX",5).attr("refY",2).attr("markerWidth",6).attr("markerHeight",4).attr("orient","auto").append("path").attr("d","M 0,0 V 4 L6,2 Z")},L={drawRect:U,drawCircle:st,drawSection:Bt,drawText:nt,drawLabel:Nt,drawTask:jt,drawBackgroundRect:zt,initGraphics:Yt},Ot=function(t){Object.keys(t).forEach(function(e){B[e]=t[e]})},$={};function qt(t){const e=P().journey;let n=60;Object.keys($).forEach(o=>{const s=$[o].color,l={cx:20,cy:n,r:7,fill:s,stroke:"#000",pos:$[o].position};L.drawCircle(t,l);const h={x:40,y:n+7,fill:"#666",text:o,textMargin:e.boxTextMargin|5};L.drawText(t,h),n+=20})}var B=P().journey,E=B.leftMargin,Wt=function(t,e,n,o){const s=P().journey,l=P().securityLevel;let h;l==="sandbox"&&(h=q("#i"+e));const f=l==="sandbox"?q(h.nodes()[0].contentDocument.body):q("body");v.init();const y=f.select("#"+e);L.initGraphics(y);const g=o.db.getTasks(),r=o.db.getDiagramTitle(),i=o.db.getActors();for(const b in $)delete $[b];let u=0;i.forEach(b=>{$[b]={color:s.actorColours[u%s.actorColours.length],position:u},u++}),qt(y),v.insert(0,0,E,Object.keys($).length*50),Xt(y,g,0);const a=v.getBounds();r&&y.append("text").text(r).attr("x",E).attr("font-size","4ex").attr("font-weight","bold").attr("y",25);const d=a.stopy-a.starty+2*s.diagramMarginY,p=E+a.stopx+2*s.diagramMarginX;_t(y,d,p,s.useMaxWidth),y.append("line").attr("x1",E).attr("y1",s.height*4).attr("x2",p-E-4).attr("y2",s.height*4).attr("stroke-width",4).attr("stroke","black").attr("marker-end","url(#arrowhead)");const c=r?70:0;y.attr("viewBox",`${a.startx} -25 ${p} ${d+c}`),y.attr("preserveAspectRatio","xMinYMin meet"),y.attr("height",d+c+25)},v={data:{startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},verticalPos:0,sequenceItems:[],init:function(){this.sequenceItems=[],this.data={startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},this.verticalPos=0},updateVal:function(t,e,n,o){t[e]===void 0?t[e]=n:t[e]=o(n,t[e])},updateBounds:function(t,e,n,o){const s=P().journey,l=this;let h=0;function f(y){return function(r){h++;const i=l.sequenceItems.length-h+1;l.updateVal(r,"starty",e-i*s.boxMargin,Math.min),l.updateVal(r,"stopy",o+i*s.boxMargin,Math.max),l.updateVal(v.data,"startx",t-i*s.boxMargin,Math.min),l.updateVal(v.data,"stopx",n+i*s.boxMargin,Math.max),y!=="activation"&&(l.updateVal(r,"startx",t-i*s.boxMargin,Math.min),l.updateVal(r,"stopx",n+i*s.boxMargin,Math.max),l.updateVal(v.data,"starty",e-i*s.boxMargin,Math.min),l.updateVal(v.data,"stopy",o+i*s.boxMargin,Math.max))}}this.sequenceItems.forEach(f())},insert:function(t,e,n,o){const s=Math.min(t,n),l=Math.max(t,n),h=Math.min(e,o),f=Math.max(e,o);this.updateVal(v.data,"startx",s,Math.min),this.updateVal(v.data,"starty",h,Math.min),this.updateVal(v.data,"stopx",l,Math.max),this.updateVal(v.data,"stopy",f,Math.max),this.updateBounds(s,h,l,f)},bumpVerticalPos:function(t){this.verticalPos=this.verticalPos+t,this.data.stopy=this.verticalPos},getVerticalPos:function(){return this.verticalPos},getBounds:function(){return this.data}},W=B.sectionFills,et=B.sectionColours,Xt=function(t,e,n){const o=P().journey;let s="";const l=n+(o.height*2+o.diagramMarginY);let h=0,f="#CCC",y="black",g=0;for(const[r,i]of e.entries()){if(s!==i.section){f=W[h%W.length],g=h%W.length,y=et[h%et.length];let a=0;const d=i.section;for(let c=r;c<e.length&&e[c].section==d;c++)a=a+1;const p={x:r*o.taskMargin+r*o.width+E,y:50,text:i.section,fill:f,num:g,colour:y,taskCount:a};L.drawSection(t,p,o),s=i.section,h++}const u=i.people.reduce((a,d)=>($[d]&&(a[d]=$[d]),a),{});i.x=r*o.taskMargin+r*o.width+E,i.y=l,i.width=o.diagramMarginX,i.height=o.diagramMarginY,i.colour=y,i.fill=f,i.num=g,i.actors=u,L.drawTask(t,i,o),v.insert(i.x,i.y,i.x+i.width+o.taskMargin,450)}},rt={setConf:Ot,draw:Wt},Qt={parser:Tt,db:D,renderer:rt,styles:Ft,init:t=>{rt.setConf(t.journey),D.clear()}};export{Qt as diagram};
