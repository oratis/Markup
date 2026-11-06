import{A as b,B as Gt,L as jt,R as Ut,S as F,b as zt,d as Mt,f as ot,w as Ht,x as Xt,y as Kt}from"./milkdown-CEek6Ucv.js";var gt=(function(){var t=function(i,l,r,c){for(r=r||{},c=i.length;c--;r[i[c]]=l);return r},e=[1,2],a=[1,3],h=[1,4],p=[2,4],d=[1,9],y=[1,11],E=[1,15],f=[1,16],T=[1,17],Y=[1,18],N=[1,30],G=[1,19],j=[1,20],U=[1,21],z=[1,22],M=[1,23],H=[1,25],X=[1,26],K=[1,27],W=[1,28],J=[1,29],q=[1,32],Q=[1,33],Z=[1,34],tt=[1,35],R=[1,31],o=[1,4,5,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],et=[1,4,5,13,14,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],bt=[4,5,15,16,18,20,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],ht={trace:function(){},yy:{},symbols_:{error:2,start:3,SPACE:4,NL:5,SD:6,document:7,line:8,statement:9,classDefStatement:10,cssClassStatement:11,idStatement:12,DESCR:13,"-->":14,HIDE_EMPTY:15,scale:16,WIDTH:17,COMPOSIT_STATE:18,STRUCT_START:19,STRUCT_STOP:20,STATE_DESCR:21,AS:22,ID:23,FORK:24,JOIN:25,CHOICE:26,CONCURRENT:27,note:28,notePosition:29,NOTE_TEXT:30,direction:31,acc_title:32,acc_title_value:33,acc_descr:34,acc_descr_value:35,acc_descr_multiline_value:36,classDef:37,CLASSDEF_ID:38,CLASSDEF_STYLEOPTS:39,DEFAULT:40,class:41,CLASSENTITY_IDS:42,STYLECLASS:43,direction_tb:44,direction_bt:45,direction_rl:46,direction_lr:47,eol:48,";":49,EDGE_STATE:50,STYLE_SEPARATOR:51,left_of:52,right_of:53,$accept:0,$end:1},terminals_:{2:"error",4:"SPACE",5:"NL",6:"SD",13:"DESCR",14:"-->",15:"HIDE_EMPTY",16:"scale",17:"WIDTH",18:"COMPOSIT_STATE",19:"STRUCT_START",20:"STRUCT_STOP",21:"STATE_DESCR",22:"AS",23:"ID",24:"FORK",25:"JOIN",26:"CHOICE",27:"CONCURRENT",28:"note",30:"NOTE_TEXT",32:"acc_title",33:"acc_title_value",34:"acc_descr",35:"acc_descr_value",36:"acc_descr_multiline_value",37:"classDef",38:"CLASSDEF_ID",39:"CLASSDEF_STYLEOPTS",40:"DEFAULT",41:"class",42:"CLASSENTITY_IDS",43:"STYLECLASS",44:"direction_tb",45:"direction_bt",46:"direction_rl",47:"direction_lr",49:";",50:"EDGE_STATE",51:"STYLE_SEPARATOR",52:"left_of",53:"right_of"},productions_:[0,[3,2],[3,2],[3,2],[7,0],[7,2],[8,2],[8,1],[8,1],[9,1],[9,1],[9,1],[9,2],[9,3],[9,4],[9,1],[9,2],[9,1],[9,4],[9,3],[9,6],[9,1],[9,1],[9,1],[9,1],[9,4],[9,4],[9,1],[9,2],[9,2],[9,1],[10,3],[10,3],[11,3],[31,1],[31,1],[31,1],[31,1],[48,1],[48,1],[12,1],[12,1],[12,3],[12,3],[29,1],[29,1]],performAction:function(l,r,c,u,S,s,w){var n=s.length-1;switch(S){case 3:return u.setRootDoc(s[n]),s[n];case 4:this.$=[];break;case 5:s[n]!="nl"&&(s[n-1].push(s[n]),this.$=s[n-1]);break;case 6:case 7:this.$=s[n];break;case 8:this.$="nl";break;case 11:this.$=s[n];break;case 12:const $=s[n-1];$.description=u.trimColon(s[n]),this.$=$;break;case 13:this.$={stmt:"relation",state1:s[n-2],state2:s[n]};break;case 14:const ft=u.trimColon(s[n]);this.$={stmt:"relation",state1:s[n-3],state2:s[n-1],description:ft};break;case 18:this.$={stmt:"state",id:s[n-3],type:"default",description:"",doc:s[n-1]};break;case 19:var D=s[n],I=s[n-2].trim();if(s[n].match(":")){var st=s[n].split(":");D=st[0],I=[I,st[1]]}this.$={stmt:"state",id:D,type:"default",description:I};break;case 20:this.$={stmt:"state",id:s[n-3],type:"default",description:s[n-5],doc:s[n-1]};break;case 21:this.$={stmt:"state",id:s[n],type:"fork"};break;case 22:this.$={stmt:"state",id:s[n],type:"join"};break;case 23:this.$={stmt:"state",id:s[n],type:"choice"};break;case 24:this.$={stmt:"state",id:u.getDividerId(),type:"divider"};break;case 25:this.$={stmt:"state",id:s[n-1].trim(),note:{position:s[n-2].trim(),text:s[n].trim()}};break;case 28:this.$=s[n].trim(),u.setAccTitle(this.$);break;case 29:case 30:this.$=s[n].trim(),u.setAccDescription(this.$);break;case 31:case 32:this.$={stmt:"classDef",id:s[n-1].trim(),classes:s[n].trim()};break;case 33:this.$={stmt:"applyClass",id:s[n-1].trim(),styleClass:s[n].trim()};break;case 34:u.setDirection("TB"),this.$={stmt:"dir",value:"TB"};break;case 35:u.setDirection("BT"),this.$={stmt:"dir",value:"BT"};break;case 36:u.setDirection("RL"),this.$={stmt:"dir",value:"RL"};break;case 37:u.setDirection("LR"),this.$={stmt:"dir",value:"LR"};break;case 40:case 41:this.$={stmt:"state",id:s[n].trim(),type:"default",description:""};break;case 42:this.$={stmt:"state",id:s[n-2].trim(),classes:[s[n].trim()],type:"default",description:""};break;case 43:this.$={stmt:"state",id:s[n-2].trim(),classes:[s[n].trim()],type:"default",description:""};break}},table:[{3:1,4:e,5:a,6:h},{1:[3]},{3:5,4:e,5:a,6:h},{3:6,4:e,5:a,6:h},t([1,4,5,15,16,18,21,23,24,25,26,27,28,32,34,36,37,41,44,45,46,47,50],p,{7:7}),{1:[2,1]},{1:[2,2]},{1:[2,3],4:d,5:y,8:8,9:10,10:12,11:13,12:14,15:E,16:f,18:T,21:Y,23:N,24:G,25:j,26:U,27:z,28:M,31:24,32:H,34:X,36:K,37:W,41:J,44:q,45:Q,46:Z,47:tt,50:R},t(o,[2,5]),{9:36,10:12,11:13,12:14,15:E,16:f,18:T,21:Y,23:N,24:G,25:j,26:U,27:z,28:M,31:24,32:H,34:X,36:K,37:W,41:J,44:q,45:Q,46:Z,47:tt,50:R},t(o,[2,7]),t(o,[2,8]),t(o,[2,9]),t(o,[2,10]),t(o,[2,11],{13:[1,37],14:[1,38]}),t(o,[2,15]),{17:[1,39]},t(o,[2,17],{19:[1,40]}),{22:[1,41]},t(o,[2,21]),t(o,[2,22]),t(o,[2,23]),t(o,[2,24]),{29:42,30:[1,43],52:[1,44],53:[1,45]},t(o,[2,27]),{33:[1,46]},{35:[1,47]},t(o,[2,30]),{38:[1,48],40:[1,49]},{42:[1,50]},t(et,[2,40],{51:[1,51]}),t(et,[2,41],{51:[1,52]}),t(o,[2,34]),t(o,[2,35]),t(o,[2,36]),t(o,[2,37]),t(o,[2,6]),t(o,[2,12]),{12:53,23:N,50:R},t(o,[2,16]),t(bt,p,{7:54}),{23:[1,55]},{23:[1,56]},{22:[1,57]},{23:[2,44]},{23:[2,45]},t(o,[2,28]),t(o,[2,29]),{39:[1,58]},{39:[1,59]},{43:[1,60]},{23:[1,61]},{23:[1,62]},t(o,[2,13],{13:[1,63]}),{4:d,5:y,8:8,9:10,10:12,11:13,12:14,15:E,16:f,18:T,20:[1,64],21:Y,23:N,24:G,25:j,26:U,27:z,28:M,31:24,32:H,34:X,36:K,37:W,41:J,44:q,45:Q,46:Z,47:tt,50:R},t(o,[2,19],{19:[1,65]}),{30:[1,66]},{23:[1,67]},t(o,[2,31]),t(o,[2,32]),t(o,[2,33]),t(et,[2,42]),t(et,[2,43]),t(o,[2,14]),t(o,[2,18]),t(bt,p,{7:68}),t(o,[2,25]),t(o,[2,26]),{4:d,5:y,8:8,9:10,10:12,11:13,12:14,15:E,16:f,18:T,20:[1,69],21:Y,23:N,24:G,25:j,26:U,27:z,28:M,31:24,32:H,34:X,36:K,37:W,41:J,44:q,45:Q,46:Z,47:tt,50:R},t(o,[2,20])],defaultActions:{5:[2,1],6:[2,2],44:[2,44],45:[2,45]},parseError:function(l,r){if(r.recoverable)this.trace(l);else{var c=new Error(l);throw c.hash=r,c}},parse:function(l){var r=this,c=[0],u=[],S=[null],s=[],w=this.table,n="",D=0,I=0,st=2,$=1,ft=s.slice.call(arguments,1),g=Object.create(this.lexer),C={yy:{}};for(var dt in this.yy)Object.prototype.hasOwnProperty.call(this.yy,dt)&&(C.yy[dt]=this.yy[dt]);g.setInput(l,C.yy),C.yy.lexer=g,C.yy.parser=this,typeof g.yylloc>"u"&&(g.yylloc={});var pt=g.yylloc;s.push(pt);var Ft=g.options&&g.options.ranges;typeof C.yy.parseError=="function"?this.parseError=C.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function Yt(){var x=u.pop()||g.lex()||$;return typeof x!="number"&&(x instanceof Array&&(u=x,x=u.pop()),x=r.symbols_[x]||x),x}for(var m,A,k,yt,O={},it,v,xt,rt;;){if(A=c[c.length-1],this.defaultActions[A]?k=this.defaultActions[A]:((m===null||typeof m>"u")&&(m=Yt()),k=w[A]&&w[A][m]),typeof k>"u"||!k.length||!k[0]){var St="";rt=[];for(it in w[A])this.terminals_[it]&&it>st&&rt.push("'"+this.terminals_[it]+"'");g.showPosition?St="Parse error on line "+(D+1)+`:
`+g.showPosition()+`
Expecting `+rt.join(", ")+", got '"+(this.terminals_[m]||m)+"'":St="Parse error on line "+(D+1)+": Unexpected "+(m==$?"end of input":"'"+(this.terminals_[m]||m)+"'"),this.parseError(St,{text:g.match,token:this.terminals_[m]||m,line:g.yylineno,loc:pt,expected:rt})}if(k[0]instanceof Array&&k.length>1)throw new Error("Parse Error: multiple actions possible at state: "+A+", token: "+m);switch(k[0]){case 1:c.push(m),S.push(g.yytext),s.push(g.yylloc),c.push(k[1]),m=null,I=g.yyleng,n=g.yytext,D=g.yylineno,pt=g.yylloc;break;case 2:if(v=this.productions_[k[1]][1],O.$=S[S.length-v],O._$={first_line:s[s.length-(v||1)].first_line,last_line:s[s.length-1].last_line,first_column:s[s.length-(v||1)].first_column,last_column:s[s.length-1].last_column},Ft&&(O._$.range=[s[s.length-(v||1)].range[0],s[s.length-1].range[1]]),yt=this.performAction.apply(O,[n,I,D,C.yy,k[1],S,s].concat(ft)),typeof yt<"u")return yt;v&&(c=c.slice(0,-1*v*2),S=S.slice(0,-1*v),s=s.slice(0,-1*v)),c.push(this.productions_[k[1]][0]),S.push(O.$),s.push(O._$),xt=w[c[c.length-2]][c[c.length-1]],c.push(xt);break;case 3:return!0}}return!0}};ht.lexer=(function(){return{EOF:1,parseError:function(l,r){if(this.yy.parser)this.yy.parser.parseError(l,r);else throw new Error(l)},setInput:function(i,l){return this.yy=l||this.yy||{},this._input=i,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},input:function(){var i=this._input[0];return this.yytext+=i,this.yyleng++,this.offset++,this.match+=i,this.matched+=i,i.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),i},unput:function(i){var l=i.length,r=i.split(/(?:\r\n?|\n)/g);this._input=i+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-l),this.offset-=l;var c=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),r.length-1&&(this.yylineno-=r.length-1);var u=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:r?(r.length===c.length?this.yylloc.first_column:0)+c[c.length-r.length].length-r[0].length:this.yylloc.first_column-l},this.options.ranges&&(this.yylloc.range=[u[0],u[0]+this.yyleng-l]),this.yyleng=this.yytext.length,this},more:function(){return this._more=!0,this},reject:function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},less:function(i){this.unput(this.match.slice(i))},pastInput:function(){var i=this.matched.substr(0,this.matched.length-this.match.length);return(i.length>20?"...":"")+i.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var i=this.match;return i.length<20&&(i+=this._input.substr(0,20-i.length)),(i.substr(0,20)+(i.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var i=this.pastInput(),l=new Array(i.length+1).join("-");return i+this.upcomingInput()+`
`+l+"^"},test_match:function(i,l){var r,c,u;if(this.options.backtrack_lexer&&(u={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(u.yylloc.range=this.yylloc.range.slice(0))),c=i[0].match(/(?:\r\n?|\n).*/g),c&&(this.yylineno+=c.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:c?c[c.length-1].length-c[c.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+i[0].length},this.yytext+=i[0],this.match+=i[0],this.matches=i,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(i[0].length),this.matched+=i[0],r=this.performAction.call(this,this.yy,this,l,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),r)return r;if(this._backtrack){for(var S in u)this[S]=u[S];return!1}return!1},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var i,l,r,c;this._more||(this.yytext="",this.match="");for(var u=this._currentRules(),S=0;S<u.length;S++)if(r=this._input.match(this.rules[u[S]]),r&&(!l||r[0].length>l[0].length)){if(l=r,c=S,this.options.backtrack_lexer){if(i=this.test_match(r,u[S]),i!==!1)return i;if(this._backtrack){l=!1;continue}else return!1}else if(!this.options.flex)break}return l?(i=this.test_match(l,u[c]),i!==!1?i:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var l=this.next();return l||this.lex()},begin:function(l){this.conditionStack.push(l)},popState:function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},_currentRules:function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},topState:function(l){return l=this.conditionStack.length-1-Math.abs(l||0),l>=0?this.conditionStack[l]:"INITIAL"},pushState:function(l){this.begin(l)},stateStackSize:function(){return this.conditionStack.length},options:{"case-insensitive":!0},performAction:function(l,r,c,u){switch(c){case 0:return 40;case 1:return 44;case 2:return 45;case 3:return 46;case 4:return 47;case 5:break;case 6:break;case 7:return 5;case 8:break;case 9:break;case 10:break;case 11:break;case 12:return this.pushState("SCALE"),16;case 13:return 17;case 14:this.popState();break;case 15:return this.begin("acc_title"),32;case 16:return this.popState(),"acc_title_value";case 17:return this.begin("acc_descr"),34;case 18:return this.popState(),"acc_descr_value";case 19:this.begin("acc_descr_multiline");break;case 20:this.popState();break;case 21:return"acc_descr_multiline_value";case 22:return this.pushState("CLASSDEF"),37;case 23:return this.popState(),this.pushState("CLASSDEFID"),"DEFAULT_CLASSDEF_ID";case 24:return this.popState(),this.pushState("CLASSDEFID"),38;case 25:return this.popState(),39;case 26:return this.pushState("CLASS"),41;case 27:return this.popState(),this.pushState("CLASS_STYLE"),42;case 28:return this.popState(),43;case 29:return this.pushState("SCALE"),16;case 30:return 17;case 31:this.popState();break;case 32:this.pushState("STATE");break;case 33:return this.popState(),r.yytext=r.yytext.slice(0,-8).trim(),24;case 34:return this.popState(),r.yytext=r.yytext.slice(0,-8).trim(),25;case 35:return this.popState(),r.yytext=r.yytext.slice(0,-10).trim(),26;case 36:return this.popState(),r.yytext=r.yytext.slice(0,-8).trim(),24;case 37:return this.popState(),r.yytext=r.yytext.slice(0,-8).trim(),25;case 38:return this.popState(),r.yytext=r.yytext.slice(0,-10).trim(),26;case 39:return 44;case 40:return 45;case 41:return 46;case 42:return 47;case 43:this.pushState("STATE_STRING");break;case 44:return this.pushState("STATE_ID"),"AS";case 45:return this.popState(),"ID";case 46:this.popState();break;case 47:return"STATE_DESCR";case 48:return 18;case 49:this.popState();break;case 50:return this.popState(),this.pushState("struct"),19;case 51:break;case 52:return this.popState(),20;case 53:break;case 54:return this.begin("NOTE"),28;case 55:return this.popState(),this.pushState("NOTE_ID"),52;case 56:return this.popState(),this.pushState("NOTE_ID"),53;case 57:this.popState(),this.pushState("FLOATING_NOTE");break;case 58:return this.popState(),this.pushState("FLOATING_NOTE_ID"),"AS";case 59:break;case 60:return"NOTE_TEXT";case 61:return this.popState(),"ID";case 62:return this.popState(),this.pushState("NOTE_TEXT"),23;case 63:return this.popState(),r.yytext=r.yytext.substr(2).trim(),30;case 64:return this.popState(),r.yytext=r.yytext.slice(0,-8).trim(),30;case 65:return 6;case 66:return 6;case 67:return 15;case 68:return 50;case 69:return 23;case 70:return r.yytext=r.yytext.trim(),13;case 71:return 14;case 72:return 27;case 73:return 51;case 74:return 5;case 75:return"INVALID"}},rules:[/^(?:default\b)/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:[\s]+)/i,/^(?:((?!\n)\s)+)/i,/^(?:#[^\n]*)/i,/^(?:%[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:classDef\s+)/i,/^(?:DEFAULT\s+)/i,/^(?:\w+\s+)/i,/^(?:[^\n]*)/i,/^(?:class\s+)/i,/^(?:(\w+)+((,\s*\w+)*))/i,/^(?:[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:state\s+)/i,/^(?:.*<<fork>>)/i,/^(?:.*<<join>>)/i,/^(?:.*<<choice>>)/i,/^(?:.*\[\[fork\]\])/i,/^(?:.*\[\[join\]\])/i,/^(?:.*\[\[choice\]\])/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:["])/i,/^(?:\s*as\s+)/i,/^(?:[^\n\{]*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n\s\{]+)/i,/^(?:\n)/i,/^(?:\{)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:\})/i,/^(?:[\n])/i,/^(?:note\s+)/i,/^(?:left of\b)/i,/^(?:right of\b)/i,/^(?:")/i,/^(?:\s*as\s*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n]*)/i,/^(?:\s*[^:\n\s\-]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:[\s\S]*?end note\b)/i,/^(?:stateDiagram\s+)/i,/^(?:stateDiagram-v2\s+)/i,/^(?:hide empty description\b)/i,/^(?:\[\*\])/i,/^(?:[^:\n\s\-\{]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:-->)/i,/^(?:--)/i,/^(?::::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{LINE:{rules:[9,10],inclusive:!1},struct:{rules:[9,10,22,26,32,39,40,41,42,51,52,53,54,68,69,70,71,72],inclusive:!1},FLOATING_NOTE_ID:{rules:[61],inclusive:!1},FLOATING_NOTE:{rules:[58,59,60],inclusive:!1},NOTE_TEXT:{rules:[63,64],inclusive:!1},NOTE_ID:{rules:[62],inclusive:!1},NOTE:{rules:[55,56,57],inclusive:!1},CLASS_STYLE:{rules:[28],inclusive:!1},CLASS:{rules:[27],inclusive:!1},CLASSDEFID:{rules:[25],inclusive:!1},CLASSDEF:{rules:[23,24],inclusive:!1},acc_descr_multiline:{rules:[20,21],inclusive:!1},acc_descr:{rules:[18],inclusive:!1},acc_title:{rules:[16],inclusive:!1},SCALE:{rules:[13,14,30,31],inclusive:!1},ALIAS:{rules:[],inclusive:!1},STATE_ID:{rules:[45],inclusive:!1},STATE_STRING:{rules:[46,47],inclusive:!1},FORK_STATE:{rules:[],inclusive:!1},STATE:{rules:[9,10,33,34,35,36,37,38,43,44,48,49,50],inclusive:!1},ID:{rules:[9,10],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,8,10,11,12,15,17,19,22,26,29,32,50,54,65,66,67,68,69,70,71,73,74,75],inclusive:!0}}}})();function ut(){this.yy={}}return ut.prototype=ht,ht.Parser=ut,new ut})();gt.parser=gt;var ve=gt,Wt="LR",Lt="state",Jt="relation",qt="classDef",Qt="applyClass",kt="default",be="divider",Et="[*]",It="start",Ot=Et,Nt="end",Dt="color",Ct="fill",Zt="bgFill",te=",";function Rt(){return{}}var wt=Wt,lt=[],B=Rt(),$t=()=>({relations:[],states:{},documents:{}}),ct={root:$t()},_=ct.root,P=0,At=0,ee={LINE:0,DOTTED_LINE:1},se={AGGREGATION:0,EXTENSION:1,COMPOSITION:2,DEPENDENCY:3},at=t=>JSON.parse(JSON.stringify(t)),ie=t=>{b.info("Setting root doc",t),lt=t},re=()=>lt,nt=(t,e,a)=>{if(e.stmt==="relation")nt(t,e.state1,!0),nt(t,e.state2,!1);else if(e.stmt==="state"&&(e.id==="[*]"?(e.id=a?t.id+"_start":t.id+"_end",e.start=a):e.id=e.id.trim()),e.doc){const h=[];let p=[],d;for(d=0;d<e.doc.length;d++)if(e.doc[d].type==="divider"){const y=at(e.doc[d]);y.doc=at(p),h.push(y),p=[]}else p.push(e.doc[d]);if(h.length>0&&p.length>0){const y={stmt:Lt,id:Kt(),type:"divider",doc:at(p)};h.push(at(y)),e.doc=h}e.doc.forEach(y=>nt(e,y,!0))}},ae=()=>(nt({id:"root"},{id:"root",doc:lt},!0),{id:"root",doc:lt}),ne=t=>{let e;t.doc?e=t.doc:e=t,b.info(e),Bt(!0),b.info("Extract",e),e.forEach(a=>{switch(a.stmt){case Lt:L(a.id.trim(),a.type,a.doc,a.description,a.note,a.classes,a.styles,a.textStyles);break;case Jt:Pt(a.state1,a.state2,a.description);break;case qt:Vt(a.id.trim(),a.classes);break;case Qt:vt(a.id.trim(),a.styleClass);break}})},L=function(t,e=kt,a=null,h=null,p=null,d=null,y=null,E=null){const f=t?.trim();_.states[f]===void 0?(b.info("Adding state ",f,h),_.states[f]={id:f,descriptions:[],type:e,doc:a,note:p,classes:[],styles:[],textStyles:[]}):(_.states[f].doc||(_.states[f].doc=a),_.states[f].type||(_.states[f].type=e)),h&&(b.info("Setting state description",f,h),typeof h=="string"&&Tt(f,h.trim()),typeof h=="object"&&h.forEach(T=>Tt(f,T.trim()))),p&&(_.states[f].note=p,_.states[f].note.text=ot.sanitizeText(_.states[f].note.text,F())),d&&(b.info("Setting state classes",f,d),(typeof d=="string"?[d]:d).forEach(T=>vt(f,T.trim()))),y&&(b.info("Setting state styles",f,y),(typeof y=="string"?[y]:y).forEach(T=>Se(f,T.trim()))),E&&(b.info("Setting state styles",f,y),(typeof E=="string"?[E]:E).forEach(T=>ge(f,T.trim())))},Bt=function(t){ct={root:$t()},_=ct.root,P=0,B=Rt(),t||Mt()},V=function(t){return _.states[t]},le=function(){return _.states},ce=function(){b.info("Documents = ",ct)},oe=function(){return _.relations};function _t(t=""){let e=t;return t===Et&&(P++,e=`${It}${P}`),e}function mt(t="",e=kt){return t===Et?It:e}function he(t=""){let e=t;return t===Ot&&(P++,e=`${Nt}${P}`),e}function ue(t="",e=kt){return t===Ot?Nt:e}function fe(t,e,a){let h=_t(t.id.trim()),p=mt(t.id.trim(),t.type),d=_t(e.id.trim()),y=mt(e.id.trim(),e.type);L(h,p,t.doc,t.description,t.note,t.classes,t.styles,t.textStyles),L(d,y,e.doc,e.description,e.note,e.classes,e.styles,e.textStyles),_.relations.push({id1:h,id2:d,relationTitle:ot.sanitizeText(a,F())})}var Pt=function(t,e,a){if(typeof t=="object")fe(t,e,a);else{const h=_t(t.trim()),p=mt(t),d=he(e.trim()),y=ue(e);L(h,p),L(d,y),_.relations.push({id1:h,id2:d,title:ot.sanitizeText(a,F())})}},Tt=function(t,e){const a=_.states[t],h=e.startsWith(":")?e.replace(":","").trim():e;a.descriptions.push(ot.sanitizeText(h,F()))},de=function(t){return t.substring(0,1)===":"?t.substr(2).trim():t.trim()},pe=()=>(At++,"divider-id-"+At),Vt=function(t,e=""){B[t]===void 0&&(B[t]={id:t,styles:[],textStyles:[]});const a=B[t];e?.split(te).forEach(h=>{const p=h.replace(/([^;]*);/,"$1").trim();if(h.match(Dt)){const d=p.replace(Ct,Zt).replace(Dt,Ct);a.textStyles.push(d)}a.styles.push(p)})},ye=function(){return B},vt=function(t,e){t.split(",").forEach(function(a){let h=V(a);if(h===void 0){const p=a.trim();L(p),h=V(p)}h.classes.push(e)})},Se=function(t,e){const a=V(t);a!==void 0&&a.textStyles.push(e)},ge=function(t,e){const a=V(t);a!==void 0&&a.textStyles.push(e)},_e=()=>wt,me=t=>{wt=t},Te=t=>t&&t[0]===":"?t.substr(1).trim():t.trim(),xe={getConfig:()=>F().state,addState:L,clear:Bt,getState:V,getStates:le,getRelations:oe,getClasses:ye,getDirection:_e,addRelation:Pt,getDividerId:pe,setDirection:me,cleanupLabel:de,lineType:ee,relationType:se,logDocuments:ce,getRootDoc:re,setRootDoc:ie,getRootDocV2:ae,extract:ne,trimColon:Te,getAccTitle:Xt,setAccTitle:Ut,getAccDescription:zt,setAccDescription:jt,addStyleClass:Vt,setCssClass:vt,addDescription:Tt,setDiagramTitle:Gt,getDiagramTitle:Ht},ke=t=>`
defs #statediagram-barbEnd {
    fill: ${t.transitionColor};
    stroke: ${t.transitionColor};
  }
g.stateGroup text {
  fill: ${t.nodeBorder};
  stroke: none;
  font-size: 10px;
}
g.stateGroup text {
  fill: ${t.textColor};
  stroke: none;
  font-size: 10px;

}
g.stateGroup .state-title {
  font-weight: bolder;
  fill: ${t.stateLabelColor};
}

g.stateGroup rect {
  fill: ${t.mainBkg};
  stroke: ${t.nodeBorder};
}

g.stateGroup line {
  stroke: ${t.lineColor};
  stroke-width: 1;
}

.transition {
  stroke: ${t.transitionColor};
  stroke-width: 1;
  fill: none;
}

.stateGroup .composit {
  fill: ${t.background};
  border-bottom: 1px
}

.stateGroup .alt-composit {
  fill: #e0e0e0;
  border-bottom: 1px
}

.state-note {
  stroke: ${t.noteBorderColor};
  fill: ${t.noteBkgColor};

  text {
    fill: ${t.noteTextColor};
    stroke: none;
    font-size: 10px;
  }
}

.stateLabel .box {
  stroke: none;
  stroke-width: 0;
  fill: ${t.mainBkg};
  opacity: 0.5;
}

.edgeLabel .label rect {
  fill: ${t.labelBackgroundColor};
  opacity: 0.5;
}
.edgeLabel .label text {
  fill: ${t.transitionLabelColor||t.tertiaryTextColor};
}
.label div .edgeLabel {
  color: ${t.transitionLabelColor||t.tertiaryTextColor};
}

.stateLabel text {
  fill: ${t.stateLabelColor};
  font-size: 10px;
  font-weight: bold;
}

.node circle.state-start {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node .fork-join {
  fill: ${t.specialStateColor};
  stroke: ${t.specialStateColor};
}

.node circle.state-end {
  fill: ${t.innerEndBackground};
  stroke: ${t.background};
  stroke-width: 1.5
}
.end-state-inner {
  fill: ${t.compositeBackground||t.background};
  // stroke: ${t.background};
  stroke-width: 1.5
}

.node rect {
  fill: ${t.stateBkg||t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: 1px;
}
.node polygon {
  fill: ${t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};;
  stroke-width: 1px;
}
#statediagram-barbEnd {
  fill: ${t.lineColor};
}

.statediagram-cluster rect {
  fill: ${t.compositeTitleBackground};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: 1px;
}

.cluster-label, .nodeLabel {
  color: ${t.stateLabelColor};
}

.statediagram-cluster rect.outer {
  rx: 5px;
  ry: 5px;
}
.statediagram-state .divider {
  stroke: ${t.stateBorder||t.nodeBorder};
}

.statediagram-state .title-state {
  rx: 5px;
  ry: 5px;
}
.statediagram-cluster.statediagram-cluster .inner {
  fill: ${t.compositeBackground||t.background};
}
.statediagram-cluster.statediagram-cluster-alt .inner {
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.statediagram-cluster .inner {
  rx:0;
  ry:0;
}

.statediagram-state rect.basic {
  rx: 5px;
  ry: 5px;
}
.statediagram-state rect.divider {
  stroke-dasharray: 10,10;
  fill: ${t.altBackground?t.altBackground:"#efefef"};
}

.note-edge {
  stroke-dasharray: 5;
}

.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}
.statediagram-note rect {
  fill: ${t.noteBkgColor};
  stroke: ${t.noteBorderColor};
  stroke-width: 1px;
  rx: 0;
  ry: 0;
}

.statediagram-note text {
  fill: ${t.noteTextColor};
}

.statediagram-note .nodeLabel {
  color: ${t.noteTextColor};
}
.statediagram .edgeLabel {
  color: red; // ${t.noteTextColor};
}

#dependencyStart, #dependencyEnd {
  fill: ${t.lineColor};
  stroke: ${t.lineColor};
  stroke-width: 1;
}

.statediagramTitleText {
  text-anchor: middle;
  font-size: 18px;
  fill: ${t.textColor};
}
`,De=ke;export{xe as a,Lt as i,be as n,ve as o,Jt as r,De as s,kt as t};
