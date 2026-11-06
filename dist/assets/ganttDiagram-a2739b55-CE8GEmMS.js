import{s as ht}from"./rolldown-runtime-DwyjGMXk.js";import{$t as Qt,A as dt,B as Zt,L as $t,R as te,S as X,U as ee,Yt as lt,b as ie,d as se,en as re,f as ae,m as ne,w as ce,x as le}from"./milkdown-CEek6Ucv.js";import{t as oe}from"./linear-BuXphMyn.js";import{C as ue,S as de,_ as Ft,a as Lt,b as fe,c as he,d as me,f as ke,g as Mt,h as Vt,i as ye,l as ge,m as Pt,n as ve,o as Bt,p as pe,r as be,s as Te,t as xe,u as _e,v as Ot,x as we,y as Ce}from"./advancedFormat-BSA3351T.js";var Ee=Qt(),E=ht(re(),1),Se=ht(be(),1),De=ht(ve(),1),Ae=ht(xe(),1),gt=(function(){var t=function(c,u,o,d){for(o=o||{},d=c.length;d--;o[c[d]]=u);return o},s=[6,8,10,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,30,32,33,35,37],r=[1,25],n=[1,26],a=[1,27],f=[1,28],g=[1,29],V=[1,30],F=[1,31],S=[1,9],D=[1,10],A=[1,11],P=[1,12],N=[1,13],L=[1,14],T=[1,15],Z=[1,16],$=[1,18],tt=[1,19],et=[1,20],it=[1,21],st=[1,22],rt=[1,24],at=[1,32],h={trace:function(){},yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,dateFormat:19,inclusiveEndDates:20,topAxis:21,axisFormat:22,tickInterval:23,excludes:24,includes:25,todayMarker:26,title:27,acc_title:28,acc_title_value:29,acc_descr:30,acc_descr_value:31,acc_descr_multiline_value:32,section:33,clickStatement:34,taskTxt:35,taskData:36,click:37,callbackname:38,callbackargs:39,href:40,clickStatementDebug:41,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",19:"dateFormat",20:"inclusiveEndDates",21:"topAxis",22:"axisFormat",23:"tickInterval",24:"excludes",25:"includes",26:"todayMarker",27:"title",28:"acc_title",29:"acc_title_value",30:"acc_descr",31:"acc_descr_value",32:"acc_descr_multiline_value",33:"section",35:"taskTxt",36:"taskData",37:"click",38:"callbackname",39:"callbackargs",40:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[34,2],[34,3],[34,3],[34,4],[34,3],[34,4],[34,2],[41,2],[41,3],[41,3],[41,4],[41,3],[41,4],[41,2]],performAction:function(u,o,d,l,m,i,w){var e=i.length-1;switch(m){case 1:return i[e-1];case 2:this.$=[];break;case 3:i[e-1].push(i[e]),this.$=i[e-1];break;case 4:case 5:this.$=i[e];break;case 6:case 7:this.$=[];break;case 8:l.setWeekday("monday");break;case 9:l.setWeekday("tuesday");break;case 10:l.setWeekday("wednesday");break;case 11:l.setWeekday("thursday");break;case 12:l.setWeekday("friday");break;case 13:l.setWeekday("saturday");break;case 14:l.setWeekday("sunday");break;case 15:l.setDateFormat(i[e].substr(11)),this.$=i[e].substr(11);break;case 16:l.enableInclusiveEndDates(),this.$=i[e].substr(18);break;case 17:l.TopAxis(),this.$=i[e].substr(8);break;case 18:l.setAxisFormat(i[e].substr(11)),this.$=i[e].substr(11);break;case 19:l.setTickInterval(i[e].substr(13)),this.$=i[e].substr(13);break;case 20:l.setExcludes(i[e].substr(9)),this.$=i[e].substr(9);break;case 21:l.setIncludes(i[e].substr(9)),this.$=i[e].substr(9);break;case 22:l.setTodayMarker(i[e].substr(12)),this.$=i[e].substr(12);break;case 24:l.setDiagramTitle(i[e].substr(6)),this.$=i[e].substr(6);break;case 25:this.$=i[e].trim(),l.setAccTitle(this.$);break;case 26:case 27:this.$=i[e].trim(),l.setAccDescription(this.$);break;case 28:l.addSection(i[e].substr(8)),this.$=i[e].substr(8);break;case 30:l.addTask(i[e-1],i[e]),this.$="task";break;case 31:this.$=i[e-1],l.setClickEvent(i[e-1],i[e],null);break;case 32:this.$=i[e-2],l.setClickEvent(i[e-2],i[e-1],i[e]);break;case 33:this.$=i[e-2],l.setClickEvent(i[e-2],i[e-1],null),l.setLink(i[e-2],i[e]);break;case 34:this.$=i[e-3],l.setClickEvent(i[e-3],i[e-2],i[e-1]),l.setLink(i[e-3],i[e]);break;case 35:this.$=i[e-2],l.setClickEvent(i[e-2],i[e],null),l.setLink(i[e-2],i[e-1]);break;case 36:this.$=i[e-3],l.setClickEvent(i[e-3],i[e-1],i[e]),l.setLink(i[e-3],i[e-2]);break;case 37:this.$=i[e-1],l.setLink(i[e-1],i[e]);break;case 38:case 44:this.$=i[e-1]+" "+i[e];break;case 39:case 40:case 42:this.$=i[e-2]+" "+i[e-1]+" "+i[e];break;case 41:case 43:this.$=i[e-3]+" "+i[e-2]+" "+i[e-1]+" "+i[e];break}},table:[{3:1,4:[1,2]},{1:[3]},t(s,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:r,13:n,14:a,15:f,16:g,17:V,18:F,19:S,20:D,21:A,22:P,23:N,24:L,25:T,26:Z,27:$,28:tt,30:et,32:it,33:st,34:23,35:rt,37:at},t(s,[2,7],{1:[2,1]}),t(s,[2,3]),{9:33,11:17,12:r,13:n,14:a,15:f,16:g,17:V,18:F,19:S,20:D,21:A,22:P,23:N,24:L,25:T,26:Z,27:$,28:tt,30:et,32:it,33:st,34:23,35:rt,37:at},t(s,[2,5]),t(s,[2,6]),t(s,[2,15]),t(s,[2,16]),t(s,[2,17]),t(s,[2,18]),t(s,[2,19]),t(s,[2,20]),t(s,[2,21]),t(s,[2,22]),t(s,[2,23]),t(s,[2,24]),{29:[1,34]},{31:[1,35]},t(s,[2,27]),t(s,[2,28]),t(s,[2,29]),{36:[1,36]},t(s,[2,8]),t(s,[2,9]),t(s,[2,10]),t(s,[2,11]),t(s,[2,12]),t(s,[2,13]),t(s,[2,14]),{38:[1,37],40:[1,38]},t(s,[2,4]),t(s,[2,25]),t(s,[2,26]),t(s,[2,30]),t(s,[2,31],{39:[1,39],40:[1,40]}),t(s,[2,37],{38:[1,41]}),t(s,[2,32],{40:[1,42]}),t(s,[2,33]),t(s,[2,35],{39:[1,43]}),t(s,[2,34]),t(s,[2,36])],defaultActions:{},parseError:function(u,o){if(o.recoverable)this.trace(u);else{var d=new Error(u);throw d.hash=o,d}},parse:function(u){var o=this,d=[0],l=[],m=[null],i=[],w=this.table,e="",k=0,b=0,x=2,v=1,_=i.slice.call(arguments,1),y=Object.create(this.lexer),O={yy:{}};for(var H in this.yy)Object.prototype.hasOwnProperty.call(this.yy,H)&&(O.yy[H]=this.yy[H]);y.setInput(u,O.yy),O.yy.lexer=y,O.yy.parser=this,typeof y.yylloc>"u"&&(y.yylloc={});var mt=y.yylloc;i.push(mt);var Jt=y.options&&y.options.ranges;typeof O.yy.parseError=="function"?this.parseError=O.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function Kt(){var R=l.pop()||y.lex()||v;return typeof R!="number"&&(R instanceof Array&&(l=R,R=l.pop()),R=o.symbols_[R]||R),R}for(var I,z,M,kt,U={},nt,W,It,ct;;){if(z=d[d.length-1],this.defaultActions[z]?M=this.defaultActions[z]:((I===null||typeof I>"u")&&(I=Kt()),M=w[z]&&w[z][I]),typeof M>"u"||!M.length||!M[0]){var yt="";ct=[];for(nt in w[z])this.terminals_[nt]&&nt>x&&ct.push("'"+this.terminals_[nt]+"'");y.showPosition?yt="Parse error on line "+(k+1)+`:
`+y.showPosition()+`
Expecting `+ct.join(", ")+", got '"+(this.terminals_[I]||I)+"'":yt="Parse error on line "+(k+1)+": Unexpected "+(I==v?"end of input":"'"+(this.terminals_[I]||I)+"'"),this.parseError(yt,{text:y.match,token:this.terminals_[I]||I,line:y.yylineno,loc:mt,expected:ct})}if(M[0]instanceof Array&&M.length>1)throw new Error("Parse Error: multiple actions possible at state: "+z+", token: "+I);switch(M[0]){case 1:d.push(I),m.push(y.yytext),i.push(y.yylloc),d.push(M[1]),I=null,b=y.yyleng,e=y.yytext,k=y.yylineno,mt=y.yylloc;break;case 2:if(W=this.productions_[M[1]][1],U.$=m[m.length-W],U._$={first_line:i[i.length-(W||1)].first_line,last_line:i[i.length-1].last_line,first_column:i[i.length-(W||1)].first_column,last_column:i[i.length-1].last_column},Jt&&(U._$.range=[i[i.length-(W||1)].range[0],i[i.length-1].range[1]]),kt=this.performAction.apply(U,[e,b,k,O.yy,M[1],m,i].concat(_)),typeof kt<"u")return kt;W&&(d=d.slice(0,-1*W*2),m=m.slice(0,-1*W),i=i.slice(0,-1*W)),d.push(this.productions_[M[1]][0]),m.push(U.$),i.push(U._$),It=w[d[d.length-2]][d[d.length-1]],d.push(It);break;case 3:return!0}}return!0}};h.lexer=(function(){return{EOF:1,parseError:function(u,o){if(this.yy.parser)this.yy.parser.parseError(u,o);else throw new Error(u)},setInput:function(c,u){return this.yy=u||this.yy||{},this._input=c,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var c=this._input[0];return this.yytext+=c,this.yyleng++,this.offset++,this.match+=c,this.matched+=c,c.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),c},unput:function(c){var u=c.length,o=c.split(/(?:\r\n?|\n)/g);this._input=c+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-u),this.offset-=u;var d=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),o.length-1&&(this.yylineno-=o.length-1);var l=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:o?(o.length===d.length?this.yylloc.first_column:0)+d[d.length-o.length].length-o[0].length:this.yylloc.first_column-u},this.options.ranges&&(this.yylloc.range=[l[0],l[0]+this.yyleng-u]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},less:function(c){this.unput(this.match.slice(c))},pastInput:function(){var c=this.matched.substr(0,this.matched.length-this.match.length);return(c.length>20?"...":"")+c.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var c=this.match;return c.length<20&&(c+=this._input.substr(0,20-c.length)),(c.substr(0,20)+(c.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var c=this.pastInput(),u=new Array(c.length+1).join("-");return c+this.upcomingInput()+`
`+u+"^"},test_match:function(c,u){var o,d,l;if(this.options.backtrack_lexer&&(l={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(l.yylloc.range=this.yylloc.range.slice(0))),d=c[0].match(/(?:\r\n?|\n).*/g),d&&(this.yylineno+=d.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:d?d[d.length-1].length-d[d.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+c[0].length},this.yytext+=c[0],this.match+=c[0],this.matches=c,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(c[0].length),this.matched+=c[0],o=this.performAction.call(this,this.yy,this,u,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),o)return o;if(this._backtrack){for(var m in l)this[m]=l[m];return!1}return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var c,u,o,d;this._more||(this.yytext="",this.match="");for(var l=this._currentRules(),m=0;m<l.length;m++)if(o=this._input.match(this.rules[l[m]]),o&&(!u||o[0].length>u[0].length)){if(u=o,d=m,this.options.backtrack_lexer){if(c=this.test_match(o,l[m]),c!==!1)return c;if(this._backtrack){u=!1;continue}else return!1}else if(!this.options.flex)break}return u?(c=this.test_match(u,l[d]),c!==!1?c:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var u=this.next();return u||this.lex()},begin:function(u){this.conditionStack.push(u)},popState:function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(u){return u=this.conditionStack.length-1-Math.abs(u||0),u>=0?this.conditionStack[u]:"INITIAL"},pushState:function(u){this.begin(u)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(u,o,d,l){switch(d){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),28;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),30;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 40;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 38;case 21:this.popState();break;case 22:return 39;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 37;case 26:return 4;case 27:return 19;case 28:return 20;case 29:return 21;case 30:return 22;case 31:return 23;case 32:return 25;case 33:return 24;case 34:return 26;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return"date";case 43:return 27;case 44:return"accDescription";case 45:return 33;case 46:return 35;case 47:return 36;case 48:return":";case 49:return 6;case 50:return"INVALID"}},rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50],inclusive:!0}}}})();function p(){this.yy={}}return p.prototype=h,h.Parser=p,new p})();gt.parser=gt;var Ie=gt;E.default.extend(Se.default);E.default.extend(De.default);E.default.extend(Ae.default);var B="",Tt="",xt=void 0,_t="",J=[],K=[],wt={},Ct=[],ft=[],G="",Et="",Nt=["active","done","crit","milestone"],St=[],Q=!1,Dt=!1,At="sunday",vt=0,Fe=function(){Ct=[],ft=[],G="",St=[],ot=0,bt=void 0,ut=void 0,C=[],B="",Tt="",Et="",xt=void 0,_t="",J=[],K=[],Q=!1,Dt=!1,vt=0,wt={},se(),At="sunday"},Le=function(t){Tt=t},Me=function(){return Tt},Ve=function(t){xt=t},Pe=function(){return xt},Be=function(t){_t=t},Oe=function(){return _t},We=function(t){B=t},Ye=function(){Q=!0},Ne=function(){return Q},Re=function(){Dt=!0},ze=function(){return Dt},qe=function(t){Et=t},Ue=function(){return Et},Xe=function(){return B},je=function(t){J=t.toLowerCase().split(/[\s,]+/)},Ge=function(){return J},He=function(t){K=t.toLowerCase().split(/[\s,]+/)},Je=function(){return K},Ke=function(){return wt},Qe=function(t){G=t,Ct.push(t)},Ze=function(){return Ct},$e=function(){let t=Wt();const s=10;let r=0;for(;!t&&r<s;)t=Wt(),r++;return ft=C,ft},Rt=function(t,s,r,n){return n.includes(t.format(s.trim()))?!1:t.isoWeekday()>=6&&r.includes("weekends")||r.includes(t.format("dddd").toLowerCase())?!0:r.includes(t.format(s.trim()))},ti=function(t){At=t},ei=function(){return At},zt=function(t,s,r,n){if(!r.length||t.manualEndTime)return;let a;t.startTime instanceof Date?a=(0,E.default)(t.startTime):a=(0,E.default)(t.startTime,s,!0),a=a.add(1,"d");let f;t.endTime instanceof Date?f=(0,E.default)(t.endTime):f=(0,E.default)(t.endTime,s,!0);const[g,V]=ii(a,f,s,r,n);t.endTime=g.toDate(),t.renderEndTime=V},ii=function(t,s,r,n,a){let f=!1,g=null;for(;t<=s;)f||(g=s.toDate()),f=Rt(t,r,n,a),f&&(s=s.add(1,"d")),t=t.add(1,"d");return[s,g]},pt=function(t,s,r){r=r.trim();const n=/^after\s+(?<ids>[\d\w- ]+)/.exec(r);if(n!==null){let f=null;for(const V of n.groups.ids.split(" ")){let F=q(V);F!==void 0&&(!f||F.endTime>f.endTime)&&(f=F)}if(f)return f.endTime;const g=new Date;return g.setHours(0,0,0,0),g}let a=(0,E.default)(r,s.trim(),!0);if(a.isValid())return a.toDate();{dt.debug("Invalid date:"+r),dt.debug("With date format:"+s.trim());const f=new Date(r);if(f===void 0||isNaN(f.getTime())||f.getFullYear()<-1e4||f.getFullYear()>1e4)throw new Error("Invalid date:"+r);return f}},qt=function(t){const s=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return s!==null?[Number.parseFloat(s[1]),s[2]]:[NaN,"ms"]},Ut=function(t,s,r,n=!1){r=r.trim();const a=/^until\s+(?<ids>[\d\w- ]+)/.exec(r);if(a!==null){let S=null;for(const A of a.groups.ids.split(" ")){let P=q(A);P!==void 0&&(!S||P.startTime<S.startTime)&&(S=P)}if(S)return S.startTime;const D=new Date;return D.setHours(0,0,0,0),D}let f=(0,E.default)(r,s.trim(),!0);if(f.isValid())return n&&(f=f.add(1,"d")),f.toDate();let g=(0,E.default)(t);const[V,F]=qt(r);if(!Number.isNaN(V)){const S=g.add(V,F);S.isValid()&&(g=S)}return g.toDate()},ot=0,j=function(t){return t===void 0?(ot=ot+1,"task"+ot):t},si=function(t,s){let r;s.substr(0,1)===":"?r=s.substr(1,s.length):r=s;const n=r.split(","),a={};Ht(n,a,Nt);for(let g=0;g<n.length;g++)n[g]=n[g].trim();let f="";switch(n.length){case 1:a.id=j(),a.startTime=t.endTime,f=n[0];break;case 2:a.id=j(),a.startTime=pt(void 0,B,n[0]),f=n[1];break;case 3:a.id=j(n[0]),a.startTime=pt(void 0,B,n[1]),f=n[2];break}return f&&(a.endTime=Ut(a.startTime,B,f,Q),a.manualEndTime=(0,E.default)(f,"YYYY-MM-DD",!0).isValid(),zt(a,B,K,J)),a},ri=function(t,s){let r;s.substr(0,1)===":"?r=s.substr(1,s.length):r=s;const n=r.split(","),a={};Ht(n,a,Nt);for(let f=0;f<n.length;f++)n[f]=n[f].trim();switch(n.length){case 1:a.id=j(),a.startTime={type:"prevTaskEnd",id:t},a.endTime={data:n[0]};break;case 2:a.id=j(),a.startTime={type:"getStartDate",startData:n[0]},a.endTime={data:n[1]};break;case 3:a.id=j(n[0]),a.startTime={type:"getStartDate",startData:n[1]},a.endTime={data:n[2]};break}return a},bt,ut,C=[],Xt={},ai=function(t,s){const r={section:G,type:G,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:s},task:t,classes:[]},n=ri(ut,s);r.raw.startTime=n.startTime,r.raw.endTime=n.endTime,r.id=n.id,r.prevTaskId=ut,r.active=n.active,r.done=n.done,r.crit=n.crit,r.milestone=n.milestone,r.order=vt,vt++;const a=C.push(r);ut=r.id,Xt[r.id]=a-1},q=function(t){const s=Xt[t];return C[s]},ni=function(t,s){const r={section:G,type:G,description:t,task:t,classes:[]},n=si(bt,s);r.startTime=n.startTime,r.endTime=n.endTime,r.id=n.id,r.active=n.active,r.done=n.done,r.crit=n.crit,r.milestone=n.milestone,bt=r,ft.push(r)},Wt=function(){const t=function(r){const n=C[r];let a="";switch(C[r].raw.startTime.type){case"prevTaskEnd":n.startTime=q(n.prevTaskId).endTime;break;case"getStartDate":a=pt(void 0,B,C[r].raw.startTime.startData),a&&(C[r].startTime=a);break}return C[r].startTime&&(C[r].endTime=Ut(C[r].startTime,B,C[r].raw.endTime.data,Q),C[r].endTime&&(C[r].processed=!0,C[r].manualEndTime=(0,E.default)(C[r].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),zt(C[r],B,K,J))),C[r].processed};let s=!0;for(const[r,n]of C.entries())t(r),s=s&&n.processed;return s},ci=function(t,s){let r=s;X().securityLevel!=="loose"&&(r=(0,Ee.sanitizeUrl)(s)),t.split(",").forEach(function(n){q(n)!==void 0&&(Gt(n,()=>{window.open(r,"_self")}),wt[n]=r)}),jt(t,"clickable")},jt=function(t,s){t.split(",").forEach(function(r){let n=q(r);n!==void 0&&n.classes.push(s)})},li=function(t,s,r){if(X().securityLevel!=="loose"||s===void 0)return;let n=[];if(typeof r=="string"){n=r.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let a=0;a<n.length;a++){let f=n[a].trim();f.charAt(0)==='"'&&f.charAt(f.length-1)==='"'&&(f=f.substr(1,f.length-2)),n[a]=f}}n.length===0&&n.push(t),q(t)!==void 0&&Gt(t,()=>{ee.runFunc(s,...n)})},Gt=function(t,s){St.push(function(){const r=document.querySelector(`[id="${t}"]`);r!==null&&r.addEventListener("click",function(){s()})},function(){const r=document.querySelector(`[id="${t}-text"]`);r!==null&&r.addEventListener("click",function(){s()})})},oi=function(t,s,r){t.split(",").forEach(function(n){li(n,s,r)}),jt(t,"clickable")},ui=function(t){St.forEach(function(s){s(t)})},di={getConfig:()=>X().gantt,clear:Fe,setDateFormat:We,getDateFormat:Xe,enableInclusiveEndDates:Ye,endDatesAreInclusive:Ne,enableTopAxis:Re,topAxisEnabled:ze,setAxisFormat:Le,getAxisFormat:Me,setTickInterval:Ve,getTickInterval:Pe,setTodayMarker:Be,getTodayMarker:Oe,setAccTitle:te,getAccTitle:le,setDiagramTitle:Zt,getDiagramTitle:ce,setDisplayMode:qe,getDisplayMode:Ue,setAccDescription:$t,getAccDescription:ie,addSection:Qe,getSections:Ze,getTasks:$e,addTask:ai,findTaskById:q,addTaskOrg:ni,setIncludes:je,getIncludes:Ge,setExcludes:He,getExcludes:Je,setClickEvent:oi,setLink:ci,getLinks:Ke,bindFunctions:ui,parseDuration:qt,isInvalidDate:Rt,setWeekday:ti,getWeekday:ei};function Ht(t,s,r){let n=!0;for(;n;)n=!1,r.forEach(function(a){const f="^\\s*"+a+"\\s*$",g=new RegExp(f);t[0].match(g)&&(s[a]=!0,t.shift(1),n=!0)})}var fi=function(){dt.debug("Something is calling, setConf, remove the call")},Yt={monday:he,tuesday:ke,wednesday:pe,thursday:me,friday:Te,saturday:ge,sunday:_e},hi=(t,s)=>{let r=[...t].map(()=>-1/0),n=[...t].sort((f,g)=>f.startTime-g.startTime||f.order-g.order),a=0;for(const f of n)for(let g=0;g<r.length;g++)if(f.startTime>=r[g]){r[g]=f.endTime,f.order=g+s,g>a&&(a=g);break}return a},Y,mi=function(t,s,r,n){const a=X().gantt,f=X().securityLevel;let g;f==="sandbox"&&(g=lt("#i"+s));const V=f==="sandbox"?lt(g.nodes()[0].contentDocument.body):lt("body"),F=f==="sandbox"?g.nodes()[0].contentDocument:document,S=F.getElementById(s);Y=S.parentElement.offsetWidth,Y===void 0&&(Y=1200),a.useWidth!==void 0&&(Y=a.useWidth);const D=n.db.getTasks();let A=[];for(const h of D)A.push(h.type);A=at(A);const P={};let N=2*a.topPadding;if(n.db.getDisplayMode()==="compact"||a.displayMode==="compact"){const h={};for(const c of D)h[c.section]===void 0?h[c.section]=[c]:h[c.section].push(c);let p=0;for(const c of Object.keys(h)){const u=hi(h[c],p)+1;p+=u,N+=u*(a.barHeight+a.barGap),P[c]=u}}else{N+=D.length*(a.barHeight+a.barGap);for(const h of A)P[h]=D.filter(p=>p.type===h).length}S.setAttribute("viewBox","0 0 "+Y+" "+N);const L=V.select(`[id="${s}"]`),T=ye().domain([de(D,function(h){return h.startTime}),ue(D,function(h){return h.endTime})]).rangeRound([0,Y-a.leftPadding-a.rightPadding]);function Z(h,p){const c=h.startTime,u=p.startTime;let o=0;return c>u?o=1:c<u&&(o=-1),o}D.sort(Z),$(D,Y,N),ne(L,N,Y,a.useMaxWidth),L.append("text").text(n.db.getDiagramTitle()).attr("x",Y/2).attr("y",a.titleTopMargin).attr("class","titleText");function $(h,p,c){const u=a.barHeight,o=u+a.barGap,d=a.topPadding,l=a.leftPadding,m=oe().domain([0,A.length]).range(["#00B9FA","#F95002"]).interpolate(Ce);et(o,d,l,p,c,h,n.db.getExcludes(),n.db.getIncludes()),it(l,d,p,c),tt(h,o,d,l,u,m,p),st(o,d),rt(l,d,p,c)}function tt(h,p,c,u,o,d,l){const m=[...new Set(h.map(e=>e.order))].map(e=>h.find(k=>k.order===e));L.append("g").selectAll("rect").data(m).enter().append("rect").attr("x",0).attr("y",function(e,k){return k=e.order,k*p+c-2}).attr("width",function(){return l-a.rightPadding/2}).attr("height",p).attr("class",function(e){for(const[k,b]of A.entries())if(e.type===b)return"section section"+k%a.numberSectionStyles;return"section section0"});const i=L.append("g").selectAll("rect").data(h).enter(),w=n.db.getLinks();if(i.append("rect").attr("id",function(e){return e.id}).attr("rx",3).attr("ry",3).attr("x",function(e){return e.milestone?T(e.startTime)+u+.5*(T(e.endTime)-T(e.startTime))-.5*o:T(e.startTime)+u}).attr("y",function(e,k){return k=e.order,k*p+c}).attr("width",function(e){return e.milestone?o:T(e.renderEndTime||e.endTime)-T(e.startTime)}).attr("height",o).attr("transform-origin",function(e,k){return k=e.order,(T(e.startTime)+u+.5*(T(e.endTime)-T(e.startTime))).toString()+"px "+(k*p+c+.5*o).toString()+"px"}).attr("class",function(e){const k="task";let b="";e.classes.length>0&&(b=e.classes.join(" "));let x=0;for(const[_,y]of A.entries())e.type===y&&(x=_%a.numberSectionStyles);let v="";return e.active?e.crit?v+=" activeCrit":v=" active":e.done?e.crit?v=" doneCrit":v=" done":e.crit&&(v+=" crit"),v.length===0&&(v=" task"),e.milestone&&(v=" milestone "+v),v+=x,v+=" "+b,k+v}),i.append("text").attr("id",function(e){return e.id+"-text"}).text(function(e){return e.task}).attr("font-size",a.fontSize).attr("x",function(e){let k=T(e.startTime),b=T(e.renderEndTime||e.endTime);e.milestone&&(k+=.5*(T(e.endTime)-T(e.startTime))-.5*o),e.milestone&&(b=k+o);const x=this.getBBox().width;return x>b-k?b+x+1.5*a.leftPadding>l?k+u-5:b+u+5:(b-k)/2+k+u}).attr("y",function(e,k){return k=e.order,k*p+a.barHeight/2+(a.fontSize/2-2)+c}).attr("text-height",o).attr("class",function(e){const k=T(e.startTime);let b=T(e.endTime);e.milestone&&(b=k+o);const x=this.getBBox().width;let v="";e.classes.length>0&&(v=e.classes.join(" "));let _=0;for(const[O,H]of A.entries())e.type===H&&(_=O%a.numberSectionStyles);let y="";return e.active&&(e.crit?y="activeCritText"+_:y="activeText"+_),e.done?e.crit?y=y+" doneCritText"+_:y=y+" doneText"+_:e.crit&&(y=y+" critText"+_),e.milestone&&(y+=" milestoneText"),x>b-k?b+x+1.5*a.leftPadding>l?v+" taskTextOutsideLeft taskTextOutside"+_+" "+y:v+" taskTextOutsideRight taskTextOutside"+_+" "+y+" width-"+x:v+" taskText taskText"+_+" "+y+" width-"+x}),X().securityLevel==="sandbox"){let e;e=lt("#i"+s);const k=e.nodes()[0].contentDocument;i.filter(function(b){return w[b.id]!==void 0}).each(function(b){var x=k.querySelector("#"+b.id),v=k.querySelector("#"+b.id+"-text");const _=x.parentNode;var y=k.createElement("a");y.setAttribute("xlink:href",w[b.id]),y.setAttribute("target","_top"),_.appendChild(y),y.appendChild(x),y.appendChild(v)})}}function et(h,p,c,u,o,d,l,m){if(l.length===0&&m.length===0)return;let i,w;for(const{startTime:v,endTime:_}of d)(i===void 0||v<i)&&(i=v),(w===void 0||_>w)&&(w=_);if(!i||!w)return;if((0,E.default)(w).diff((0,E.default)(i),"year")>5){dt.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}const e=n.db.getDateFormat(),k=[];let b=null,x=(0,E.default)(i);for(;x.valueOf()<=w;)n.db.isInvalidDate(x,e,l,m)?b?b.end=x:b={start:x,end:x}:b&&(k.push(b),b=null),x=x.add(1,"d");L.append("g").selectAll("rect").data(k).enter().append("rect").attr("id",function(v){return"exclude-"+v.start.format("YYYY-MM-DD")}).attr("x",function(v){return T(v.start)+c}).attr("y",a.gridLineStartPadding).attr("width",function(v){return T(v.end.add(1,"day"))-T(v.start)}).attr("height",o-p-a.gridLineStartPadding).attr("transform-origin",function(v,_){return(T(v.start)+c+.5*(T(v.end)-T(v.start))).toString()+"px "+(_*h+.5*o).toString()+"px"}).attr("class","exclude-range")}function it(h,p,c,u){let o=fe(T).tickSize(-u+p+a.gridLineStartPadding).tickFormat(Lt(n.db.getAxisFormat()||a.axisFormat||"%Y-%m-%d"));const d=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(n.db.getTickInterval()||a.tickInterval);if(d!==null){const l=d[1],m=d[2],i=n.db.getWeekday()||a.weekday;switch(m){case"millisecond":o.ticks(Ot.every(l));break;case"second":o.ticks(Ft.every(l));break;case"minute":o.ticks(Mt.every(l));break;case"hour":o.ticks(Vt.every(l));break;case"day":o.ticks(Pt.every(l));break;case"week":o.ticks(Yt[i].every(l));break;case"month":o.ticks(Bt.every(l));break}}if(L.append("g").attr("class","grid").attr("transform","translate("+h+", "+(u-50)+")").call(o).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),n.db.topAxisEnabled()||a.topAxis){let l=we(T).tickSize(-u+p+a.gridLineStartPadding).tickFormat(Lt(n.db.getAxisFormat()||a.axisFormat||"%Y-%m-%d"));if(d!==null){const m=d[1],i=d[2],w=n.db.getWeekday()||a.weekday;switch(i){case"millisecond":l.ticks(Ot.every(m));break;case"second":l.ticks(Ft.every(m));break;case"minute":l.ticks(Mt.every(m));break;case"hour":l.ticks(Vt.every(m));break;case"day":l.ticks(Pt.every(m));break;case"week":l.ticks(Yt[w].every(m));break;case"month":l.ticks(Bt.every(m));break}}L.append("g").attr("class","grid").attr("transform","translate("+h+", "+p+")").call(l).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}function st(h,p){let c=0;const u=Object.keys(P).map(o=>[o,P[o]]);L.append("g").selectAll("text").data(u).enter().append(function(o){const d=o[0].split(ae.lineBreakRegex),l=-(d.length-1)/2,m=F.createElementNS("http://www.w3.org/2000/svg","text");m.setAttribute("dy",l+"em");for(const[i,w]of d.entries()){const e=F.createElementNS("http://www.w3.org/2000/svg","tspan");e.setAttribute("alignment-baseline","central"),e.setAttribute("x","10"),i>0&&e.setAttribute("dy","1em"),e.textContent=w,m.appendChild(e)}return m}).attr("x",10).attr("y",function(o,d){if(d>0)for(let l=0;l<d;l++)return c+=u[d-1][1],o[1]*h/2+c*h+p;else return o[1]*h/2+p}).attr("font-size",a.sectionFontSize).attr("class",function(o){for(const[d,l]of A.entries())if(o[0]===l)return"sectionTitle sectionTitle"+d%a.numberSectionStyles;return"sectionTitle"})}function rt(h,p,c,u){const o=n.db.getTodayMarker();if(o==="off")return;const d=L.append("g").attr("class","today"),l=new Date,m=d.append("line");m.attr("x1",T(l)+h).attr("x2",T(l)+h).attr("y1",a.titleTopMargin).attr("y2",u-a.titleTopMargin).attr("class","today"),o!==""&&m.attr("style",o.replace(/,/g,";"))}function at(h){const p={},c=[];for(let u=0,o=h.length;u<o;++u)Object.prototype.hasOwnProperty.call(p,h[u])||(p[h[u]]=!0,c.push(h[u]));return c}},ki={setConf:fi,draw:mi},yi=t=>`
  .mermaid-main-font {
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .exclude-range {
    fill: ${t.excludeBkgColor};
  }

  .section {
    stroke: none;
    opacity: 0.2;
  }

  .section0 {
    fill: ${t.sectionBkgColor};
  }

  .section2 {
    fill: ${t.sectionBkgColor2};
  }

  .section1,
  .section3 {
    fill: ${t.altSectionBkgColor};
    opacity: 0.2;
  }

  .sectionTitle0 {
    fill: ${t.titleColor};
  }

  .sectionTitle1 {
    fill: ${t.titleColor};
  }

  .sectionTitle2 {
    fill: ${t.titleColor};
  }

  .sectionTitle3 {
    fill: ${t.titleColor};
  }

  .sectionTitle {
    text-anchor: start;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }


  /* Grid and axis */

  .grid .tick {
    stroke: ${t.gridColor};
    opacity: 0.8;
    shape-rendering: crispEdges;
  }

  .grid .tick text {
    font-family: ${t.fontFamily};
    fill: ${t.textColor};
  }

  .grid path {
    stroke-width: 0;
  }


  /* Today line */

  .today {
    fill: none;
    stroke: ${t.todayLineColor};
    stroke-width: 2px;
  }


  /* Task styling */

  /* Default task */

  .task {
    stroke-width: 2;
  }

  .taskText {
    text-anchor: middle;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }

  .taskTextOutsideLeft {
    fill: ${t.taskTextDarkColor};
    text-anchor: end;
  }


  /* Special case clickable */

  .task.clickable {
    cursor: pointer;
  }

  .taskText.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideLeft.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }

  .taskTextOutsideRight.clickable {
    cursor: pointer;
    fill: ${t.taskTextClickableColor} !important;
    font-weight: bold;
  }


  /* Specific task settings for the sections*/

  .taskText0,
  .taskText1,
  .taskText2,
  .taskText3 {
    fill: ${t.taskTextColor};
  }

  .task0,
  .task1,
  .task2,
  .task3 {
    fill: ${t.taskBkgColor};
    stroke: ${t.taskBorderColor};
  }

  .taskTextOutside0,
  .taskTextOutside2
  {
    fill: ${t.taskTextOutsideColor};
  }

  .taskTextOutside1,
  .taskTextOutside3 {
    fill: ${t.taskTextOutsideColor};
  }


  /* Active task */

  .active0,
  .active1,
  .active2,
  .active3 {
    fill: ${t.activeTaskBkgColor};
    stroke: ${t.activeTaskBorderColor};
  }

  .activeText0,
  .activeText1,
  .activeText2,
  .activeText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Completed task */

  .done0,
  .done1,
  .done2,
  .done3 {
    stroke: ${t.doneTaskBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
  }

  .doneText0,
  .doneText1,
  .doneText2,
  .doneText3 {
    fill: ${t.taskTextDarkColor} !important;
  }


  /* Tasks on the critical line */

  .crit0,
  .crit1,
  .crit2,
  .crit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.critBkgColor};
    stroke-width: 2;
  }

  .activeCrit0,
  .activeCrit1,
  .activeCrit2,
  .activeCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.activeTaskBkgColor};
    stroke-width: 2;
  }

  .doneCrit0,
  .doneCrit1,
  .doneCrit2,
  .doneCrit3 {
    stroke: ${t.critBorderColor};
    fill: ${t.doneTaskBkgColor};
    stroke-width: 2;
    cursor: pointer;
    shape-rendering: crispEdges;
  }

  .milestone {
    transform: rotate(45deg) scale(0.8,0.8);
  }

  .milestoneText {
    font-style: italic;
  }
  .doneCritText0,
  .doneCritText1,
  .doneCritText2,
  .doneCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .activeCritText0,
  .activeCritText1,
  .activeCritText2,
  .activeCritText3 {
    fill: ${t.taskTextDarkColor} !important;
  }

  .titleText {
    text-anchor: middle;
    font-size: 18px;
    fill: ${t.titleColor||t.textColor};
    font-family: var(--mermaid-font-family, "trebuchet ms", verdana, arial, sans-serif);
  }
`,Ti={parser:Ie,db:di,renderer:ki,styles:yi};export{Ti as diagram};
