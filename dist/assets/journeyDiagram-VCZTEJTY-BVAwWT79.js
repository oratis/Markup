import{Yt as U}from"./milkdown-CEek6Ucv.js";import{t as rt}from"./arc-DRckBrQ5.js";import{n as s}from"./chunk-AGHRB4JF-CAZMR7zq.js";import{B as mt,C as xt,V as kt,W as _t,_ as bt,a as vt,b as R,c as wt,v as Tt}from"./chunk-ICPOFSXX-DopV1dwE.js";import{t as St}from"./chunk-FMBD7UC4-Co18dPKa.js";import{a as $t,n as Mt,o as Ct,s as ot}from"./chunk-YZCP3GAM-BF_7_z0w.js";var Z=(function(){var e=s(function(n,i,a,o){for(a=a||{},o=n.length;o--;a[n[o]]=i);return a},"o"),t=[6,8,10,11,12,14,16,17,18],l=[1,9],d=[1,10],r=[1,11],c=[1,12],h=[1,13],y=[1,14],g={trace:s(function(){},"trace"),yy:{},symbols_:{error:2,start:3,journey:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NEWLINE:10,title:11,acc_title:12,acc_title_value:13,acc_descr:14,acc_descr_value:15,acc_descr_multiline_value:16,section:17,taskName:18,taskData:19,$accept:0,$end:1},terminals_:{2:"error",4:"journey",6:"EOF",8:"SPACE",10:"NEWLINE",11:"title",12:"acc_title",13:"acc_title_value",14:"acc_descr",15:"acc_descr_value",16:"acc_descr_multiline_value",17:"section",18:"taskName",19:"taskData"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,2]],performAction:s(function(i,a,o,f,p,u,_){var x=u.length-1;switch(p){case 1:return u[x-1];case 2:this.$=[];break;case 3:u[x-1].push(u[x]),this.$=u[x-1];break;case 4:case 5:this.$=u[x];break;case 6:case 7:this.$=[];break;case 8:f.setDiagramTitle(u[x].substr(6)),this.$=u[x].substr(6);break;case 9:this.$=u[x].trim(),f.setAccTitle(this.$);break;case 10:case 11:this.$=u[x].trim(),f.setAccDescription(this.$);break;case 12:f.addSection(u[x].substr(8)),this.$=u[x].substr(8);break;case 13:f.addTask(u[x-1],u[x]),this.$="task";break}},"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},e(t,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:l,12:d,14:r,16:c,17:h,18:y},e(t,[2,7],{1:[2,1]}),e(t,[2,3]),{9:15,11:l,12:d,14:r,16:c,17:h,18:y},e(t,[2,5]),e(t,[2,6]),e(t,[2,8]),{13:[1,16]},{15:[1,17]},e(t,[2,11]),e(t,[2,12]),{19:[1,18]},e(t,[2,4]),e(t,[2,9]),e(t,[2,10]),e(t,[2,13])],defaultActions:{},parseError:s(function(i,a){if(a.recoverable)this.trace(i);else{var o=new Error(i);throw o.hash=a,o}},"parseError"),parse:s(function(i){var a=this,o=[0],f=[],p=[null],u=[],_=this.table,x="",E=0,A=0,D=0,dt=2,tt=1,ft=u.slice.call(arguments,1),k=Object.create(this.lexer),P={yy:{}};for(var O in this.yy)Object.prototype.hasOwnProperty.call(this.yy,O)&&(P.yy[O]=this.yy[O]);k.setInput(i,P.yy),P.yy.lexer=k,P.yy.parser=this,typeof k.yylloc>"u"&&(k.yylloc={});var Y=k.yylloc;u.push(Y);var pt=k.options&&k.options.ranges;typeof P.yy.parseError=="function"?this.parseError=P.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function gt(w){o.length=o.length-2*w,p.length=p.length-w,u.length=u.length-w}s(gt,"popStack");function et(){var w=f.pop()||k.lex()||tt;return typeof w!="number"&&(w instanceof Array&&(f=w,w=f.pop()),w=a.symbols_[w]||w),w}s(et,"lex");for(var b,q,I,v,X,F={},N,$,it,z;;){if(I=o[o.length-1],this.defaultActions[I]?v=this.defaultActions[I]:((b===null||typeof b>"u")&&(b=et()),v=_[I]&&_[I][b]),typeof v>"u"||!v.length||!v[0]){var G="";z=[];for(N in _[I])this.terminals_[N]&&N>dt&&z.push("'"+this.terminals_[N]+"'");k.showPosition?G="Parse error on line "+(E+1)+`:
`+k.showPosition()+`
Expecting `+z.join(", ")+", got '"+(this.terminals_[b]||b)+"'":G="Parse error on line "+(E+1)+": Unexpected "+(b==tt?"end of input":"'"+(this.terminals_[b]||b)+"'"),this.parseError(G,{text:k.match,token:this.terminals_[b]||b,line:k.yylineno,loc:Y,expected:z})}if(v[0]instanceof Array&&v.length>1)throw new Error("Parse Error: multiple actions possible at state: "+I+", token: "+b);switch(v[0]){case 1:o.push(b),p.push(k.yytext),u.push(k.yylloc),o.push(v[1]),b=null,q?(b=q,q=null):(A=k.yyleng,x=k.yytext,E=k.yylineno,Y=k.yylloc,D>0&&D--);break;case 2:if($=this.productions_[v[1]][1],F.$=p[p.length-$],F._$={first_line:u[u.length-($||1)].first_line,last_line:u[u.length-1].last_line,first_column:u[u.length-($||1)].first_column,last_column:u[u.length-1].last_column},pt&&(F._$.range=[u[u.length-($||1)].range[0],u[u.length-1].range[1]]),X=this.performAction.apply(F,[x,A,E,P.yy,v[1],p,u].concat(ft)),typeof X<"u")return X;$&&(o=o.slice(0,-1*$*2),p=p.slice(0,-1*$),u=u.slice(0,-1*$)),o.push(this.productions_[v[1]][0]),p.push(F.$),u.push(F._$),it=_[o[o.length-2]][o[o.length-1]],o.push(it);break;case 3:return!0}}return!0},"parse")};g.lexer=(function(){return{EOF:1,parseError:s(function(i,a){if(this.yy.parser)this.yy.parser.parseError(i,a);else throw new Error(i)},"parseError"),setInput:s(function(n,i){return this.yy=i||this.yy||{},this._input=n,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:s(function(){var n=this._input[0];return this.yytext+=n,this.yyleng++,this.offset++,this.match+=n,this.matched+=n,n.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),n},"input"),unput:s(function(n){var i=n.length,a=n.split(/(?:\r\n?|\n)/g);this._input=n+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-i),this.offset-=i;var o=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),a.length-1&&(this.yylineno-=a.length-1);var f=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:a?(a.length===o.length?this.yylloc.first_column:0)+o[o.length-a.length].length-a[0].length:this.yylloc.first_column-i},this.options.ranges&&(this.yylloc.range=[f[0],f[0]+this.yyleng-i]),this.yyleng=this.yytext.length,this},"unput"),more:s(function(){return this._more=!0,this},"more"),reject:s(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:s(function(n){this.unput(this.match.slice(n))},"less"),pastInput:s(function(){var n=this.matched.substr(0,this.matched.length-this.match.length);return(n.length>20?"...":"")+n.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:s(function(){var n=this.match;return n.length<20&&(n+=this._input.substr(0,20-n.length)),(n.substr(0,20)+(n.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:s(function(){var n=this.pastInput(),i=new Array(n.length+1).join("-");return n+this.upcomingInput()+`
`+i+"^"},"showPosition"),test_match:s(function(n,i){var a,o,f;if(this.options.backtrack_lexer&&(f={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(f.yylloc.range=this.yylloc.range.slice(0))),o=n[0].match(/(?:\r\n?|\n).*/g),o&&(this.yylineno+=o.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:o?o[o.length-1].length-o[o.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+n[0].length},this.yytext+=n[0],this.match+=n[0],this.matches=n,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(n[0].length),this.matched+=n[0],a=this.performAction.call(this,this.yy,this,i,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),a)return a;if(this._backtrack){for(var p in f)this[p]=f[p];return!1}return!1},"test_match"),next:s(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var n,i,a,o;this._more||(this.yytext="",this.match="");for(var f=this._currentRules(),p=0;p<f.length;p++)if(a=this._input.match(this.rules[f[p]]),a&&(!i||a[0].length>i[0].length)){if(i=a,o=p,this.options.backtrack_lexer){if(n=this.test_match(a,f[p]),n!==!1)return n;if(this._backtrack){i=!1;continue}else return!1}else if(!this.options.flex)break}return i?(n=this.test_match(i,f[o]),n!==!1?n:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:s(function(){var i=this.next();return i||this.lex()},"lex"),begin:s(function(i){this.conditionStack.push(i)},"begin"),popState:s(function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:s(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:s(function(i){return i=this.conditionStack.length-1-Math.abs(i||0),i>=0?this.conditionStack[i]:"INITIAL"},"topState"),pushState:s(function(i){this.begin(i)},"pushState"),stateStackSize:s(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:s(function(i,a,o,f){switch(o){case 0:break;case 1:break;case 2:return 10;case 3:break;case 4:break;case 5:return 4;case 6:return 11;case 7:return this.begin("acc_title"),12;case 8:return this.popState(),"acc_title_value";case 9:return this.begin("acc_descr"),14;case 10:return this.popState(),"acc_descr_value";case 11:this.begin("acc_descr_multiline");break;case 12:this.popState();break;case 13:return"acc_descr_multiline_value";case 14:return 17;case 15:return 18;case 16:return 19;case 17:return":";case 18:return 6;case 19:return"INVALID"}},"anonymous"),rules:[/^(?:%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:#[^\n]*)/i,/^(?:journey\b)/i,/^(?:title\s[^#\n;]+)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:section\s[^#:\n;]+)/i,/^(?:[^#:\n;]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[12,13],inclusive:!1},acc_descr:{rules:[10],inclusive:!1},acc_title:{rules:[8],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,9,11,14,15,16,17,18,19],inclusive:!0}}}})();function m(){this.yy={}}return s(m,"Parser"),m.prototype=g,g.Parser=m,new m})();Z.parser=Z;var Et=Z,V="",K=[],L=[],B=[],Pt=s(function(){K.length=0,L.length=0,V="",B.length=0,vt()},"clear"),It=s(function(e){V=e,K.push(e)},"addSection"),At=s(function(){return K},"getSections"),Ft=s(function(){let e=nt();const t=100;let l=0;for(;!e&&l<t;)e=nt(),l++;return L.push(...B),L},"getTasks"),Vt=s(function(){const e=[];return L.forEach(t=>{t.people&&e.push(...t.people)}),[...new Set(e)].sort()},"updateActors"),Rt=s(function(e,t){const l=t.substr(1).split(":");let d=0,r=[];l.length===1?(d=Number(l[0]),r=[]):(d=Number(l[0]),r=l[1].split(","));const c=r.map(y=>y.trim()),h={section:V,type:V,people:c,task:e,score:d};B.push(h)},"addTask"),Lt=s(function(e){const t={section:V,type:V,description:e,task:e,classes:[]};L.push(t)},"addTaskOrg"),nt=s(function(){const e=s(function(l){return B[l].processed},"compileTask");let t=!0;for(const[l,d]of B.entries())e(l),t=t&&d.processed;return t},"compileTasks"),st={getConfig:s(()=>R().journey,"getConfig"),clear:Pt,setDiagramTitle:_t,getDiagramTitle:xt,setAccTitle:kt,getAccTitle:Tt,setAccDescription:mt,getAccDescription:bt,addSection:It,getSections:At,getTasks:Ft,addTask:Rt,addTaskOrg:Lt,getActors:s(function(){return Vt()},"getActors")},Bt=s(e=>`.label {
    font-family: ${e.fontFamily};
    color: ${e.textColor};
  }
  .mouth {
    stroke: #666;
  }

  line {
    stroke: ${e.textColor}
  }

  .legend {
    fill: ${e.textColor};
    font-family: ${e.fontFamily};
  }

  .label text {
    fill: #333;
  }
  .label {
    color: ${e.textColor}
  }

  .face {
    ${e.faceColor?`fill: ${e.faceColor}`:"fill: #FFF8DC"};
    stroke: #999;
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
    stroke-width: 1.5px;
  }

  .flowchart-link {
    stroke: ${e.lineColor};
    fill: none;
  }

  .edgeLabel {
    background-color: ${e.edgeLabelBackground};
    rect {
      opacity: 0.5;
    }
    text-align: center;
  }

  .cluster rect {
  }

  .cluster text {
    fill: ${e.titleColor};
  }

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

  .task-type-0, .section-type-0  {
    ${e.fillType0?`fill: ${e.fillType0}`:""};
  }
  .task-type-1, .section-type-1  {
    ${e.fillType0?`fill: ${e.fillType1}`:""};
  }
  .task-type-2, .section-type-2  {
    ${e.fillType0?`fill: ${e.fillType2}`:""};
  }
  .task-type-3, .section-type-3  {
    ${e.fillType0?`fill: ${e.fillType3}`:""};
  }
  .task-type-4, .section-type-4  {
    ${e.fillType0?`fill: ${e.fillType4}`:""};
  }
  .task-type-5, .section-type-5  {
    ${e.fillType0?`fill: ${e.fillType5}`:""};
  }
  .task-type-6, .section-type-6  {
    ${e.fillType0?`fill: ${e.fillType6}`:""};
  }
  .task-type-7, .section-type-7  {
    ${e.fillType0?`fill: ${e.fillType7}`:""};
  }

  .actor-0 {
    ${e.actor0?`fill: ${e.actor0}`:""};
  }
  .actor-1 {
    ${e.actor1?`fill: ${e.actor1}`:""};
  }
  .actor-2 {
    ${e.actor2?`fill: ${e.actor2}`:""};
  }
  .actor-3 {
    ${e.actor3?`fill: ${e.actor3}`:""};
  }
  .actor-4 {
    ${e.actor4?`fill: ${e.actor4}`:""};
  }
  .actor-5 {
    ${e.actor5?`fill: ${e.actor5}`:""};
  }
  ${St()}
`,"getStyles"),Q=s(function(e,t){return $t(e,t)},"drawRect"),jt=s(function(e,t){const d=e.append("circle").attr("cx",t.cx).attr("cy",t.cy).attr("class","face").attr("r",15).attr("stroke-width",2).attr("overflow","visible"),r=e.append("g");r.append("circle").attr("cx",t.cx-15/3).attr("cy",t.cy-15/3).attr("r",1.5).attr("stroke-width",2).attr("fill","#666").attr("stroke","#666"),r.append("circle").attr("cx",t.cx+15/3).attr("cy",t.cy-15/3).attr("r",1.5).attr("stroke-width",2).attr("fill","#666").attr("stroke","#666");function c(g){const m=rt().startAngle(Math.PI/2).endAngle(3*(Math.PI/2)).innerRadius(7.5).outerRadius(6.8181818181818175);g.append("path").attr("class","mouth").attr("d",m).attr("transform","translate("+t.cx+","+(t.cy+2)+")")}s(c,"smile");function h(g){const m=rt().startAngle(3*Math.PI/2).endAngle(5*(Math.PI/2)).innerRadius(7.5).outerRadius(6.8181818181818175);g.append("path").attr("class","mouth").attr("d",m).attr("transform","translate("+t.cx+","+(t.cy+7)+")")}s(h,"sad");function y(g){g.append("line").attr("class","mouth").attr("stroke",2).attr("x1",t.cx-5).attr("y1",t.cy+7).attr("x2",t.cx+5).attr("y2",t.cy+7).attr("class","mouth").attr("stroke-width","1px").attr("stroke","#666")}return s(y,"ambivalent"),t.score>3?c(r):t.score<3?h(r):y(r),d},"drawFace"),ct=s(function(e,t){const l=e.append("circle");return l.attr("cx",t.cx),l.attr("cy",t.cy),l.attr("class","actor-"+t.pos),l.attr("fill",t.fill),l.attr("stroke",t.stroke),l.attr("r",t.r),l.class!==void 0&&l.attr("class",l.class),t.title!==void 0&&l.append("title").text(t.title),l},"drawCircle"),ht=s(function(e,t){return Ct(e,t)},"drawText"),Nt=s(function(e,t){function l(r,c,h,y,g){return r+","+c+" "+(r+h)+","+c+" "+(r+h)+","+(c+y-g)+" "+(r+h-g*1.2)+","+(c+y)+" "+r+","+(c+y)}s(l,"genPoints");const d=e.append("polygon");d.attr("points",l(t.x,t.y,50,20,7)),d.attr("class","labelBox"),t.y=t.y+t.labelMargin,t.x=t.x+.5*t.labelMargin,ht(e,t)},"drawLabel"),zt=s(function(e,t,l){const d=e.append("g"),r=ot();r.x=t.x,r.y=t.y,r.fill=t.fill,r.width=l.width*t.taskCount+l.diagramMarginX*(t.taskCount-1),r.height=l.height,r.class="journey-section section-type-"+t.num,r.rx=3,r.ry=3,Q(d,r),ut(l)(t.text,d,r.x,r.y,r.width,r.height,{class:"journey-section section-type-"+t.num},l,t.colour)},"drawSection"),J=-1,Wt=s(function(e,t,l,d){const r=t.x+l.width/2,c=e.append("g");J++,c.append("line").attr("id",d+"-task"+J).attr("x1",r).attr("y1",t.y).attr("x2",r).attr("y2",450).attr("class","task-line").attr("stroke-width","1px").attr("stroke-dasharray","4 2").attr("stroke","#666"),jt(c,{cx:r,cy:300+(5-t.score)*30,score:t.score});const h=ot();h.x=t.x,h.y=t.y,h.fill=t.fill,h.width=l.width,h.height=l.height,h.class="task task-type-"+t.num,h.rx=3,h.ry=3,Q(c,h);let y=t.x+14;t.people.forEach(g=>{const m=t.actors[g].color;ct(c,{cx:y,cy:t.y,r:7,fill:m,stroke:"#000",title:g,pos:t.actors[g].position}),y+=10}),ut(l)(t.task,c,h.x,h.y,h.width,h.height,{class:"task"},l,t.colour)},"drawTask"),Ot=s(function(e,t){Mt(e,t)},"drawBackgroundRect"),ut=(function(){function e(r,c,h,y,g,m,n,i){d(c.append("text").attr("x",h+g/2).attr("y",y+m/2+5).style("font-color",i).style("text-anchor","middle").text(r),n)}s(e,"byText");function t(r,c,h,y,g,m,n,i,a){const{taskFontSize:o,taskFontFamily:f}=i,p=r.split(/<br\s*\/?>/gi);for(let u=0;u<p.length;u++){const _=u*o-o*(p.length-1)/2,x=c.append("text").attr("x",h+g/2).attr("y",y).attr("fill",a).style("text-anchor","middle").style("font-size",o).style("font-family",f);x.append("tspan").attr("x",h+g/2).attr("dy",_).text(p[u]),x.attr("y",y+m/2).attr("dominant-baseline","central").attr("alignment-baseline","central"),d(x,n)}}s(t,"byTspan");function l(r,c,h,y,g,m,n,i){const a=c.append("switch"),o=a.append("foreignObject").attr("x",h).attr("y",y).attr("width",g).attr("height",m).attr("position","fixed").append("xhtml:div").style("display","table").style("height","100%").style("width","100%");o.append("div").attr("class","label").style("display","table-cell").style("text-align","center").style("vertical-align","middle").text(r),t(r,a,h,y,g,m,n,i),d(o,n)}s(l,"byFo");function d(r,c){for(const h in c)h in c&&r.attr(h,c[h])}return s(d,"_setTextAttrs"),function(r){return r.textPlacement==="fo"?l:r.textPlacement==="old"?e:t}})(),j={drawRect:Q,drawCircle:ct,drawSection:zt,drawText:ht,drawLabel:Nt,drawTask:Wt,drawBackgroundRect:Ot,initGraphics:s(function(e,t){J=-1,e.append("defs").append("marker").attr("id",t+"-arrowhead").attr("refX",5).attr("refY",2).attr("markerWidth",6).attr("markerHeight",4).attr("orient","auto").append("path").attr("d","M 0,0 V 4 L6,2 Z")},"initGraphics")},Yt=s(function(e){Object.keys(e).forEach(function(t){S[t]=e[t]})},"setConf"),M={},W=0;function yt(e){const t=R().journey,l=t.maxLabelWidth;W=0;let d=60;Object.keys(M).forEach(r=>{const c=M[r].color,h={cx:20,cy:d,r:7,fill:c,stroke:"#000",pos:M[r].position};j.drawCircle(e,h);let y=e.append("text").attr("visibility","hidden").text(r);const g=y.node().getBoundingClientRect().width;y.remove();let m=[];if(g<=l)m=[r];else{const n=r.split(" ");let i="";y=e.append("text").attr("visibility","hidden"),n.forEach(a=>{const o=i?`${i} ${a}`:a;if(y.text(o),y.node().getBoundingClientRect().width>l){if(i&&m.push(i),i=a,y.text(a),y.node().getBoundingClientRect().width>l){let f="";for(const p of a)f+=p,y.text(f+"-"),y.node().getBoundingClientRect().width>l&&(m.push(f.slice(0,-1)+"-"),f=p);i=f}}else i=o}),i&&m.push(i),y.remove()}m.forEach((n,i)=>{const a={x:40,y:d+7+i*20,fill:"#666",text:n,textMargin:t.boxTextMargin??5},o=j.drawText(e,a).node().getBoundingClientRect().width;o>W&&o>t.leftMargin-o&&(W=o)}),d+=Math.max(20,m.length*20)})}s(yt,"drawActorLegend");var S=R().journey,C=0,qt=s(function(e,t,l,d){const r=R(),c=r.journey.titleColor,h=r.journey.titleFontSize,y=r.journey.titleFontFamily,g=r.securityLevel;let m;g==="sandbox"&&(m=U("#i"+t));const n=g==="sandbox"?U(m.nodes()[0].contentDocument.body):U("body");T.init();const i=n.select("#"+t);j.initGraphics(i,t);const a=d.db.getTasks(),o=d.db.getDiagramTitle(),f=d.db.getActors();for(const A in M)delete M[A];let p=0;f.forEach(A=>{M[A]={color:S.actorColours[p%S.actorColours.length],position:p},p++}),yt(i),C=S.leftMargin+W,T.insert(0,0,C,Object.keys(M).length*50),Xt(i,a,0,t);const u=T.getBounds();o&&i.append("text").text(o).attr("x",C).attr("font-size",h).attr("font-weight","bold").attr("y",25).attr("fill",c).attr("font-family",y);const _=u.stopy-u.starty+2*S.diagramMarginY,x=C+u.stopx+2*S.diagramMarginX;wt(i,_,x,S.useMaxWidth),i.append("line").attr("x1",C).attr("y1",S.height*4).attr("x2",x-C-4).attr("y2",S.height*4).attr("stroke-width",4).attr("stroke","black").attr("marker-end","url(#"+t+"-arrowhead)");const E=o?70:0;i.attr("viewBox",`${u.startx} -25 ${x} ${_+E}`),i.attr("preserveAspectRatio","xMinYMin meet"),i.attr("height",_+E+25)},"draw"),T={data:{startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},verticalPos:0,sequenceItems:[],init:s(function(){this.sequenceItems=[],this.data={startx:void 0,stopx:void 0,starty:void 0,stopy:void 0},this.verticalPos=0},"init"),updateVal:s(function(e,t,l,d){e[t]===void 0?e[t]=l:e[t]=d(l,e[t])},"updateVal"),updateBounds:s(function(e,t,l,d){const r=R().journey,c=this;let h=0;function y(g){return s(function(n){h++;const i=c.sequenceItems.length-h+1;c.updateVal(n,"starty",t-i*r.boxMargin,Math.min),c.updateVal(n,"stopy",d+i*r.boxMargin,Math.max),c.updateVal(T.data,"startx",e-i*r.boxMargin,Math.min),c.updateVal(T.data,"stopx",l+i*r.boxMargin,Math.max),g!=="activation"&&(c.updateVal(n,"startx",e-i*r.boxMargin,Math.min),c.updateVal(n,"stopx",l+i*r.boxMargin,Math.max),c.updateVal(T.data,"starty",t-i*r.boxMargin,Math.min),c.updateVal(T.data,"stopy",d+i*r.boxMargin,Math.max))},"updateItemBounds")}s(y,"updateFn"),this.sequenceItems.forEach(y())},"updateBounds"),insert:s(function(e,t,l,d){const r=Math.min(e,l),c=Math.max(e,l),h=Math.min(t,d),y=Math.max(t,d);this.updateVal(T.data,"startx",r,Math.min),this.updateVal(T.data,"starty",h,Math.min),this.updateVal(T.data,"stopx",c,Math.max),this.updateVal(T.data,"stopy",y,Math.max),this.updateBounds(r,h,c,y)},"insert"),bumpVerticalPos:s(function(e){this.verticalPos=this.verticalPos+e,this.data.stopy=this.verticalPos},"bumpVerticalPos"),getVerticalPos:s(function(){return this.verticalPos},"getVerticalPos"),getBounds:s(function(){return this.data},"getBounds")},H=S.sectionFills,at=S.sectionColours,Xt=s(function(e,t,l,d){const r=R().journey;let c="";const h=l+(r.height*2+r.diagramMarginY);let y=0,g="#CCC",m="black",n=0;for(const[i,a]of t.entries()){if(c!==a.section){g=H[y%H.length],n=y%H.length,m=at[y%at.length];let f=0;const p=a.section;for(let _=i;_<t.length&&t[_].section==p;_++)f=f+1;const u={x:i*r.taskMargin+i*r.width+C,y:50,text:a.section,fill:g,num:n,colour:m,taskCount:f};j.drawSection(e,u,r),c=a.section,y++}const o=a.people.reduce((f,p)=>(M[p]&&(f[p]=M[p]),f),{});a.x=i*r.taskMargin+i*r.width+C,a.y=h,a.width=r.diagramMarginX,a.height=r.diagramMarginY,a.colour=m,a.fill=g,a.num=n,a.actors=o,j.drawTask(e,a,r,d),T.insert(a.x,a.y,a.x+a.width+r.taskMargin,450)}},"drawTasks"),lt={setConf:Yt,draw:qt},Qt={parser:Et,db:st,renderer:lt,styles:Bt,init:s(e=>{lt.setConf(e.journey),st.clear()},"init")};export{Qt as diagram};
