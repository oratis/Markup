import{n as d,r as m}from"./chunk-AGHRB4JF-CAZMR7zq.js";import{B as ee,C as se,V as ie,W as re,_ as ae,a as ne,b as w,s as W,v as oe}from"./chunk-ICPOFSXX-DopV1dwE.js";import{h as le,o as ce}from"./chunk-5PVQY5BW-I8kJyHeI.js";import{t as he}from"./chunk-55IACEB6-q9-DDB_f.js";import{t as de}from"./chunk-EDXVE4YY-DK3yG4o9.js";import{r as ue}from"./chunk-336JU56O-D_Y-RMOn.js";var pt,Ct=(function(){var t=d(function(r,f,l,p){for(l=l||{},p=r.length;p--;l[r[p]]=f);return l},"o"),e=[1,2],n=[1,3],s=[1,4],u=[2,4],h=[1,9],y=[1,11],T=[1,16],a=[1,17],g=[1,18],k=[1,19],D=[1,33],x=[1,20],R=[1,21],c=[1,22],L=[1,23],v=[1,24],$=[1,26],I=[1,27],B=[1,28],Y=[1,29],et=[1,30],st=[1,31],it=[1,32],rt=[1,35],at=[1,36],nt=[1,37],ot=[1,38],U=[1,34],S=[1,4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],lt=[1,4,5,14,15,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,39,40,41,45,48,51,52,53,54,57],Lt=[4,5,16,17,19,21,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],Tt={trace:d(function(){},"trace"),yy:{},symbols_:{error:2,start:3,SPACE:4,NL:5,SD:6,document:7,line:8,statement:9,classDefStatement:10,styleStatement:11,cssClassStatement:12,idStatement:13,DESCR:14,"-->":15,HIDE_EMPTY:16,scale:17,WIDTH:18,COMPOSIT_STATE:19,STRUCT_START:20,STRUCT_STOP:21,STATE_DESCR:22,AS:23,ID:24,FORK:25,JOIN:26,CHOICE:27,CONCURRENT:28,note:29,notePosition:30,NOTE_TEXT:31,direction:32,acc_title:33,acc_title_value:34,acc_descr:35,acc_descr_value:36,acc_descr_multiline_value:37,CLICK:38,STRING:39,HREF:40,classDef:41,CLASSDEF_ID:42,CLASSDEF_STYLEOPTS:43,DEFAULT:44,style:45,STYLE_IDS:46,STYLEDEF_STYLEOPTS:47,class:48,CLASSENTITY_IDS:49,STYLECLASS:50,direction_tb:51,direction_bt:52,direction_rl:53,direction_lr:54,eol:55,";":56,EDGE_STATE:57,STYLE_SEPARATOR:58,left_of:59,right_of:60,$accept:0,$end:1},terminals_:{2:"error",4:"SPACE",5:"NL",6:"SD",14:"DESCR",15:"-->",16:"HIDE_EMPTY",17:"scale",18:"WIDTH",19:"COMPOSIT_STATE",20:"STRUCT_START",21:"STRUCT_STOP",22:"STATE_DESCR",23:"AS",24:"ID",25:"FORK",26:"JOIN",27:"CHOICE",28:"CONCURRENT",29:"note",31:"NOTE_TEXT",33:"acc_title",34:"acc_title_value",35:"acc_descr",36:"acc_descr_value",37:"acc_descr_multiline_value",38:"CLICK",39:"STRING",40:"HREF",41:"classDef",42:"CLASSDEF_ID",43:"CLASSDEF_STYLEOPTS",44:"DEFAULT",45:"style",46:"STYLE_IDS",47:"STYLEDEF_STYLEOPTS",48:"class",49:"CLASSENTITY_IDS",50:"STYLECLASS",51:"direction_tb",52:"direction_bt",53:"direction_rl",54:"direction_lr",56:";",57:"EDGE_STATE",58:"STYLE_SEPARATOR",59:"left_of",60:"right_of"},productions_:[0,[3,2],[3,2],[3,2],[7,0],[7,2],[8,2],[8,1],[8,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,3],[9,4],[9,1],[9,2],[9,1],[9,4],[9,3],[9,6],[9,1],[9,1],[9,1],[9,1],[9,4],[9,4],[9,1],[9,2],[9,2],[9,1],[9,5],[9,5],[10,3],[10,3],[11,3],[12,3],[32,1],[32,1],[32,1],[32,1],[55,1],[55,1],[13,1],[13,1],[13,3],[13,3],[30,1],[30,1]],performAction:d(function(f,l,p,_,E,i,X){var o=i.length-1;switch(E){case 3:return _.setRootDoc(i[o]),i[o];case 4:this.$=[];break;case 5:i[o]!="nl"&&(i[o-1].push(i[o]),this.$=i[o-1]);break;case 6:case 7:this.$=i[o];break;case 8:this.$="nl";break;case 12:this.$=i[o];break;case 13:const ht=i[o-1];ht.description=_.trimColon(i[o]),this.$=ht;break;case 14:this.$={stmt:"relation",state1:i[o-2],state2:i[o]};break;case 15:const dt=_.trimColon(i[o]);this.$={stmt:"relation",state1:i[o-3],state2:i[o-1],description:dt};break;case 19:this.$={stmt:"state",id:i[o-3],type:"default",description:"",doc:i[o-1]};break;case 20:var F=i[o],j=i[o-2].trim();if(i[o].match(":")){var J=i[o].split(":");F=J[0],j=[j,J[1]]}this.$={stmt:"state",id:F,type:"default",description:j};break;case 21:this.$={stmt:"state",id:i[o-3],type:"default",description:i[o-5],doc:i[o-1]};break;case 22:this.$={stmt:"state",id:i[o],type:"fork"};break;case 23:this.$={stmt:"state",id:i[o],type:"join"};break;case 24:this.$={stmt:"state",id:i[o],type:"choice"};break;case 25:this.$={stmt:"state",id:_.getDividerId(),type:"divider"};break;case 26:this.$={stmt:"state",id:i[o-1].trim(),note:{position:i[o-2].trim(),text:i[o].trim()}};break;case 29:this.$=i[o].trim(),_.setAccTitle(this.$);break;case 30:case 31:this.$=i[o].trim(),_.setAccDescription(this.$);break;case 32:this.$={stmt:"click",id:i[o-3],url:i[o-2],tooltip:i[o-1]};break;case 33:this.$={stmt:"click",id:i[o-3],url:i[o-1],tooltip:""};break;case 34:case 35:this.$={stmt:"classDef",id:i[o-1].trim(),classes:i[o].trim()};break;case 36:this.$={stmt:"style",id:i[o-1].trim(),styleClass:i[o].trim()};break;case 37:this.$={stmt:"applyClass",id:i[o-1].trim(),styleClass:i[o].trim()};break;case 38:_.setDirection("TB"),this.$={stmt:"dir",value:"TB"};break;case 39:_.setDirection("BT"),this.$={stmt:"dir",value:"BT"};break;case 40:_.setDirection("RL"),this.$={stmt:"dir",value:"RL"};break;case 41:_.setDirection("LR"),this.$={stmt:"dir",value:"LR"};break;case 44:case 45:this.$={stmt:"state",id:i[o].trim(),type:"default",description:""};break;case 46:this.$={stmt:"state",id:i[o-2].trim(),classes:[i[o].trim()],type:"default",description:""};break;case 47:this.$={stmt:"state",id:i[o-2].trim(),classes:[i[o].trim()],type:"default",description:""};break}},"anonymous"),table:[{3:1,4:e,5:n,6:s},{1:[3]},{3:5,4:e,5:n,6:s},{3:6,4:e,5:n,6:s},t([1,4,5,16,17,19,22,24,25,26,27,28,29,33,35,37,38,41,45,48,51,52,53,54,57],u,{7:7}),{1:[2,1]},{1:[2,2]},{1:[2,3],4:h,5:y,8:8,9:10,10:12,11:13,12:14,13:15,16:T,17:a,19:g,22:k,24:D,25:x,26:R,27:c,28:L,29:v,32:25,33:$,35:I,37:B,38:Y,41:et,45:st,48:it,51:rt,52:at,53:nt,54:ot,57:U},t(S,[2,5]),{9:39,10:12,11:13,12:14,13:15,16:T,17:a,19:g,22:k,24:D,25:x,26:R,27:c,28:L,29:v,32:25,33:$,35:I,37:B,38:Y,41:et,45:st,48:it,51:rt,52:at,53:nt,54:ot,57:U},t(S,[2,7]),t(S,[2,8]),t(S,[2,9]),t(S,[2,10]),t(S,[2,11]),t(S,[2,12],{14:[1,40],15:[1,41]}),t(S,[2,16]),{18:[1,42]},t(S,[2,18],{20:[1,43]}),{23:[1,44]},t(S,[2,22]),t(S,[2,23]),t(S,[2,24]),t(S,[2,25]),{30:45,31:[1,46],59:[1,47],60:[1,48]},t(S,[2,28]),{34:[1,49]},{36:[1,50]},t(S,[2,31]),{13:51,24:D,57:U},{42:[1,52],44:[1,53]},{46:[1,54]},{49:[1,55]},t(lt,[2,44],{58:[1,56]}),t(lt,[2,45],{58:[1,57]}),t(S,[2,38]),t(S,[2,39]),t(S,[2,40]),t(S,[2,41]),t(S,[2,6]),t(S,[2,13]),{13:58,24:D,57:U},t(S,[2,17]),t(Lt,u,{7:59}),{24:[1,60]},{24:[1,61]},{23:[1,62]},{24:[2,48]},{24:[2,49]},t(S,[2,29]),t(S,[2,30]),{39:[1,63],40:[1,64]},{43:[1,65]},{43:[1,66]},{47:[1,67]},{50:[1,68]},{24:[1,69]},{24:[1,70]},t(S,[2,14],{14:[1,71]}),{4:h,5:y,8:8,9:10,10:12,11:13,12:14,13:15,16:T,17:a,19:g,21:[1,72],22:k,24:D,25:x,26:R,27:c,28:L,29:v,32:25,33:$,35:I,37:B,38:Y,41:et,45:st,48:it,51:rt,52:at,53:nt,54:ot,57:U},t(S,[2,20],{20:[1,73]}),{31:[1,74]},{24:[1,75]},{39:[1,76]},{39:[1,77]},t(S,[2,34]),t(S,[2,35]),t(S,[2,36]),t(S,[2,37]),t(lt,[2,46]),t(lt,[2,47]),t(S,[2,15]),t(S,[2,19]),t(Lt,u,{7:78}),t(S,[2,26]),t(S,[2,27]),{5:[1,79]},{5:[1,80]},{4:h,5:y,8:8,9:10,10:12,11:13,12:14,13:15,16:T,17:a,19:g,21:[1,81],22:k,24:D,25:x,26:R,27:c,28:L,29:v,32:25,33:$,35:I,37:B,38:Y,41:et,45:st,48:it,51:rt,52:at,53:nt,54:ot,57:U},t(S,[2,32]),t(S,[2,33]),t(S,[2,21])],defaultActions:{5:[2,1],6:[2,2],47:[2,48],48:[2,49]},parseError:d(function(f,l){if(l.recoverable)this.trace(f);else{var p=new Error(f);throw p.hash=l,p}},"parseError"),parse:d(function(f){var l=this,p=[0],_=[],E=[null],i=[],X=this.table,o="",F=0,j=0,J=0,ht=2,dt=1,Qt=i.slice.call(arguments,1),b=Object.create(this.lexer),V={yy:{}};for(var _t in this.yy)Object.prototype.hasOwnProperty.call(this.yy,_t)&&(V.yy[_t]=this.yy[_t]);b.setInput(f,V.yy),V.yy.lexer=b,V.yy.parser=this,typeof b.yylloc>"u"&&(b.yylloc={});var Et=b.yylloc;i.push(Et);var Zt=b.options&&b.options.ranges;typeof V.yy.parseError=="function"?this.parseError=V.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function te(O){p.length=p.length-2*O,E.length=E.length-O,i.length=i.length-O}d(te,"popStack");function It(){var O=_.pop()||b.lex()||dt;return typeof O!="number"&&(O instanceof Array&&(_=O,O=_.pop()),O=l.symbols_[O]||O),O}d(It,"lex");for(var C,mt,M,N,bt,H={},ut,P,Nt,ft;;){if(M=p[p.length-1],this.defaultActions[M]?N=this.defaultActions[M]:((C===null||typeof C>"u")&&(C=It()),N=X[M]&&X[M][C]),typeof N>"u"||!N.length||!N[0]){var kt="";ft=[];for(ut in X[M])this.terminals_[ut]&&ut>ht&&ft.push("'"+this.terminals_[ut]+"'");b.showPosition?kt="Parse error on line "+(F+1)+`:
`+b.showPosition()+`
Expecting `+ft.join(", ")+", got '"+(this.terminals_[C]||C)+"'":kt="Parse error on line "+(F+1)+": Unexpected "+(C==dt?"end of input":"'"+(this.terminals_[C]||C)+"'"),this.parseError(kt,{text:b.match,token:this.terminals_[C]||C,line:b.yylineno,loc:Et,expected:ft})}if(N[0]instanceof Array&&N.length>1)throw new Error("Parse Error: multiple actions possible at state: "+M+", token: "+C);switch(N[0]){case 1:p.push(C),E.push(b.yytext),i.push(b.yylloc),p.push(N[1]),C=null,mt?(C=mt,mt=null):(j=b.yyleng,o=b.yytext,F=b.yylineno,Et=b.yylloc,J>0&&J--);break;case 2:if(P=this.productions_[N[1]][1],H.$=E[E.length-P],H._$={first_line:i[i.length-(P||1)].first_line,last_line:i[i.length-1].last_line,first_column:i[i.length-(P||1)].first_column,last_column:i[i.length-1].last_column},Zt&&(H._$.range=[i[i.length-(P||1)].range[0],i[i.length-1].range[1]]),bt=this.performAction.apply(H,[o,j,F,V.yy,N[1],E,i].concat(Qt)),typeof bt<"u")return bt;P&&(p=p.slice(0,-1*P*2),E=E.slice(0,-1*P),i=i.slice(0,-1*P)),p.push(this.productions_[N[1]][0]),E.push(H.$),i.push(H._$),Nt=X[p[p.length-2]][p[p.length-1]],p.push(Nt);break;case 3:return!0}}return!0},"parse")};Tt.lexer=(function(){return{EOF:1,parseError:d(function(f,l){if(this.yy.parser)this.yy.parser.parseError(f,l);else throw new Error(f)},"parseError"),setInput:d(function(r,f){return this.yy=f||this.yy||{},this._input=r,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:d(function(){var r=this._input[0];return this.yytext+=r,this.yyleng++,this.offset++,this.match+=r,this.matched+=r,r.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),r},"input"),unput:d(function(r){var f=r.length,l=r.split(/(?:\r\n?|\n)/g);this._input=r+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-f),this.offset-=f;var p=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),l.length-1&&(this.yylineno-=l.length-1);var _=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:l?(l.length===p.length?this.yylloc.first_column:0)+p[p.length-l.length].length-l[0].length:this.yylloc.first_column-f},this.options.ranges&&(this.yylloc.range=[_[0],_[0]+this.yyleng-f]),this.yyleng=this.yytext.length,this},"unput"),more:d(function(){return this._more=!0,this},"more"),reject:d(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:d(function(r){this.unput(this.match.slice(r))},"less"),pastInput:d(function(){var r=this.matched.substr(0,this.matched.length-this.match.length);return(r.length>20?"...":"")+r.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:d(function(){var r=this.match;return r.length<20&&(r+=this._input.substr(0,20-r.length)),(r.substr(0,20)+(r.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:d(function(){var r=this.pastInput(),f=new Array(r.length+1).join("-");return r+this.upcomingInput()+`
`+f+"^"},"showPosition"),test_match:d(function(r,f){var l,p,_;if(this.options.backtrack_lexer&&(_={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(_.yylloc.range=this.yylloc.range.slice(0))),p=r[0].match(/(?:\r\n?|\n).*/g),p&&(this.yylineno+=p.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:p?p[p.length-1].length-p[p.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+r[0].length},this.yytext+=r[0],this.match+=r[0],this.matches=r,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(r[0].length),this.matched+=r[0],l=this.performAction.call(this,this.yy,this,f,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),l)return l;if(this._backtrack){for(var E in _)this[E]=_[E];return!1}return!1},"test_match"),next:d(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var r,f,l,p;this._more||(this.yytext="",this.match="");for(var _=this._currentRules(),E=0;E<_.length;E++)if(l=this._input.match(this.rules[_[E]]),l&&(!f||l[0].length>f[0].length)){if(f=l,p=E,this.options.backtrack_lexer){if(r=this.test_match(l,_[E]),r!==!1)return r;if(this._backtrack){f=!1;continue}else return!1}else if(!this.options.flex)break}return f?(r=this.test_match(f,_[p]),r!==!1?r:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:d(function(){var f=this.next();return f||this.lex()},"lex"),begin:d(function(f){this.conditionStack.push(f)},"begin"),popState:d(function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:d(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:d(function(f){return f=this.conditionStack.length-1-Math.abs(f||0),f>=0?this.conditionStack[f]:"INITIAL"},"topState"),pushState:d(function(f){this.begin(f)},"pushState"),stateStackSize:d(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:d(function(f,l,p,_){switch(p){case 0:return 38;case 1:return 40;case 2:return 39;case 3:return 44;case 4:return 51;case 5:return 52;case 6:return 53;case 7:return 54;case 8:break;case 9:break;case 10:return 5;case 11:break;case 12:break;case 13:break;case 14:break;case 15:return this.pushState("SCALE"),17;case 16:return 18;case 17:this.popState();break;case 18:return this.begin("acc_title"),33;case 19:return this.popState(),"acc_title_value";case 20:return this.begin("acc_descr"),35;case 21:return this.popState(),"acc_descr_value";case 22:this.begin("acc_descr_multiline");break;case 23:this.popState();break;case 24:return"acc_descr_multiline_value";case 25:return this.pushState("CLASSDEF"),41;case 26:return this.popState(),this.pushState("CLASSDEFID"),"DEFAULT_CLASSDEF_ID";case 27:return this.popState(),this.pushState("CLASSDEFID"),42;case 28:return this.popState(),43;case 29:return this.pushState("CLASS"),48;case 30:return this.popState(),this.pushState("CLASS_STYLE"),49;case 31:return this.popState(),50;case 32:return this.pushState("STYLE"),45;case 33:return this.popState(),this.pushState("STYLEDEF_STYLES"),46;case 34:return this.popState(),47;case 35:return this.pushState("SCALE"),17;case 36:return 18;case 37:this.popState();break;case 38:this.pushState("STATE");break;case 39:return this.popState(),l.yytext=l.yytext.slice(0,-8).trim(),25;case 40:return this.popState(),l.yytext=l.yytext.slice(0,-8).trim(),26;case 41:return this.popState(),l.yytext=l.yytext.slice(0,-10).trim(),27;case 42:return this.popState(),l.yytext=l.yytext.slice(0,-8).trim(),25;case 43:return this.popState(),l.yytext=l.yytext.slice(0,-8).trim(),26;case 44:return this.popState(),l.yytext=l.yytext.slice(0,-10).trim(),27;case 45:return 51;case 46:return 52;case 47:return 53;case 48:return 54;case 49:this.pushState("STATE_STRING");break;case 50:return this.pushState("STATE_ID"),"AS";case 51:return this.popState(),"ID";case 52:this.popState();break;case 53:return"STATE_DESCR";case 54:return 19;case 55:this.popState();break;case 56:return this.popState(),this.pushState("struct"),20;case 57:break;case 58:return this.popState(),21;case 59:break;case 60:return this.begin("NOTE"),29;case 61:return this.popState(),this.pushState("NOTE_ID"),59;case 62:return this.popState(),this.pushState("NOTE_ID"),60;case 63:this.popState(),this.pushState("FLOATING_NOTE");break;case 64:return this.popState(),this.pushState("FLOATING_NOTE_ID"),"AS";case 65:break;case 66:return"NOTE_TEXT";case 67:return this.popState(),"ID";case 68:return this.popState(),this.pushState("NOTE_TEXT"),24;case 69:return this.popState(),l.yytext=l.yytext.substr(2).trim(),31;case 70:return this.popState(),l.yytext=l.yytext.slice(0,-8).trim(),31;case 71:return 6;case 72:return 6;case 73:return 16;case 74:return 57;case 75:return 24;case 76:return l.yytext=l.yytext.trim(),14;case 77:return 15;case 78:return 28;case 79:return 58;case 80:return 5;case 81:return"INVALID"}},"anonymous"),rules:[/^(?:click\b)/i,/^(?:href\b)/i,/^(?:"[^"]*")/i,/^(?:default\b)/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:[^\}]%%[^\n]*)/i,/^(?:[\n]+)/i,/^(?:[\s]+)/i,/^(?:((?!\n)\s)+)/i,/^(?:#[^\n]*)/i,/^(?:%[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:classDef\s+)/i,/^(?:DEFAULT\s+)/i,/^(?:\w+\s+)/i,/^(?:[^\n]*)/i,/^(?:class\s+)/i,/^(?:(\w+)+((,\s*\w+)*))/i,/^(?:[^\n]*)/i,/^(?:style\s+)/i,/^(?:[\w,]+\s+)/i,/^(?:[^\n]*)/i,/^(?:scale\s+)/i,/^(?:\d+)/i,/^(?:\s+width\b)/i,/^(?:state\s+)/i,/^(?:.*<<fork>>)/i,/^(?:.*<<join>>)/i,/^(?:.*<<choice>>)/i,/^(?:.*\[\[fork\]\])/i,/^(?:.*\[\[join\]\])/i,/^(?:.*\[\[choice\]\])/i,/^(?:.*direction\s+TB[^\n]*)/i,/^(?:.*direction\s+BT[^\n]*)/i,/^(?:.*direction\s+RL[^\n]*)/i,/^(?:.*direction\s+LR[^\n]*)/i,/^(?:["])/i,/^(?:\s*as\s+)/i,/^(?:[^\n\{]*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n\s\{]+)/i,/^(?:\n)/i,/^(?:\{)/i,/^(?:%%(?!\{)[^\n]*)/i,/^(?:\})/i,/^(?:[\n])/i,/^(?:note\s+)/i,/^(?:left of\b)/i,/^(?:right of\b)/i,/^(?:")/i,/^(?:\s*as\s*)/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:[^\n]*)/i,/^(?:\s*[^:\n\s\-]+)/i,/^(?:\s*:[^:\n;]+)/i,/^(?:[\s\S]*?end note\b)/i,/^(?:stateDiagram\s+)/i,/^(?:stateDiagram-v2\s+)/i,/^(?:hide empty description\b)/i,/^(?:\[\*\])/i,/^(?:[^:\n\s\-\{]+)/i,/^(?:\s*:(?:[^:\n;]|:[^:\n;])+)/i,/^(?:-->)/i,/^(?:--)/i,/^(?::::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{LINE:{rules:[12,13],inclusive:!1},struct:{rules:[12,13,25,29,32,38,45,46,47,48,57,58,59,60,74,75,76,77,78,79],inclusive:!1},FLOATING_NOTE_ID:{rules:[67],inclusive:!1},FLOATING_NOTE:{rules:[64,65,66],inclusive:!1},NOTE_TEXT:{rules:[69,70],inclusive:!1},NOTE_ID:{rules:[68],inclusive:!1},NOTE:{rules:[61,62,63],inclusive:!1},STYLEDEF_STYLEOPTS:{rules:[],inclusive:!1},STYLEDEF_STYLES:{rules:[34],inclusive:!1},STYLE_IDS:{rules:[],inclusive:!1},STYLE:{rules:[33],inclusive:!1},CLASS_STYLE:{rules:[31],inclusive:!1},CLASS:{rules:[30],inclusive:!1},CLASSDEFID:{rules:[28],inclusive:!1},CLASSDEF:{rules:[26,27],inclusive:!1},acc_descr_multiline:{rules:[23,24],inclusive:!1},acc_descr:{rules:[21],inclusive:!1},acc_title:{rules:[19],inclusive:!1},SCALE:{rules:[16,17,36,37],inclusive:!1},ALIAS:{rules:[],inclusive:!1},STATE_ID:{rules:[51],inclusive:!1},STATE_STRING:{rules:[52,53],inclusive:!1},FORK_STATE:{rules:[],inclusive:!1},STATE:{rules:[12,13,39,40,41,42,43,44,49,50,54,55,56],inclusive:!1},ID:{rules:[12,13],inclusive:!1},INITIAL:{rules:[0,1,2,3,4,5,6,7,8,9,10,11,13,14,15,18,20,22,25,29,32,35,38,56,60,71,72,73,74,75,76,77,79,80,81],inclusive:!0}}}})();function ct(){this.yy={}}return d(ct,"Parser"),ct.prototype=Tt,Tt.Parser=ct,new ct})();Ct.parser=Ct;var Be=Ct,fe="TB",Gt="TB",Ot="dir",K="state",z="root",At="relation",pe="classDef",Se="style",ye="applyClass",Z="default",Ft="divider",Vt="fill:none",Mt="fill: #333",Wt="c",Ut="markdown",jt="normal",Dt="rect",vt="rectWithTitle",ge="stateStart",Te="stateEnd",Rt="divider",wt="roundedWithTitle",_e="note",Ee="noteGroup",tt="statediagram",me=`${tt}-state`,Ht="transition",be="note",ke=`${Ht} note-edge`,De=`${tt}-${be}`,ve=`${tt}-cluster`,Ce=`${tt}-cluster-alt`,zt="parent",Kt="note",Ae="state",xt="----",xe=`${xt}${Kt}`,$t=`${xt}${zt}`,Xt=d((t,e=Gt)=>{if(!t.doc)return e;let n=e;for(const s of t.doc)s.stmt==="dir"&&(n=s.value);return n},"getDir"),Ye={getClasses:d(function(t,e){return e.db.getClasses()},"getClasses"),draw:d(async function(t,e,n,s){m.info("REF0:"),m.info("Drawing state diagram (v2)",e);const{securityLevel:u,state:h,layout:y}=w();s.db.extract(s.db.getRootDocV2());const T=s.db.getData(),a=he(e,u);T.type=s.type,T.layoutAlgorithm=y,T.nodeSpacing=h?.nodeSpacing||50,T.rankSpacing=h?.rankSpacing||50,w().look==="neo"?T.markers=["barbNeo"]:T.markers=["barb"],T.diagramId=e,await ue(T,a);const g=8;try{(typeof s.db.getLinks=="function"?s.db.getLinks():new Map).forEach((k,D)=>{const x=typeof D=="string"?D:typeof D?.id=="string"?D.id:"";if(!x){m.warn("⚠️ Invalid or missing stateId from key:",JSON.stringify(D));return}const R=a.node()?.querySelectorAll("g");let c;if(R?.forEach(I=>{I.textContent?.trim()===x&&(c=I)}),!c){m.warn("⚠️ Could not find node matching text:",x);return}const L=c.parentNode;if(!L){m.warn("⚠️ Node has no parent, cannot wrap:",x);return}const v=document.createElementNS("http://www.w3.org/2000/svg","a"),$=k.url.replace(/^"+|"+$/g,"");if(v.setAttributeNS("http://www.w3.org/1999/xlink","xlink:href",$),v.setAttribute("target","_blank"),k.tooltip){const I=k.tooltip.replace(/^"+|"+$/g,"");v.setAttribute("title",I)}L.replaceChild(v,c),v.appendChild(c),m.info("🔗 Wrapped node in <a> tag for:",x,k.url)})}catch(k){m.error("❌ Error injecting clickable links:",k)}le.insertTitle(a,"statediagramTitleText",h?.titleTopMargin??25,s.db.getDiagramTitle()),de(a,g,tt,h?.useMaxWidth??!0)},"draw"),getDir:Xt},yt=new Map,G=0;function gt(t="",e=0,n="",s=xt){return`${Ae}-${t}${n!==null&&n.length>0?`${s}${n}`:""}-${e}`}d(gt,"stateDomId");var Le=d((t,e,n,s,u,h,y,T)=>{m.trace("items",e),e.forEach(a=>{switch(a.stmt){case K:Q(t,a,n,s,u,h,y,T);break;case Z:Q(t,a,n,s,u,h,y,T);break;case At:{Q(t,a.state1,n,s,u,h,y,T),Q(t,a.state2,n,s,u,h,y,T);const g=y==="neo",k={id:"edge"+G,start:a.state1.id,end:a.state2.id,arrowhead:"normal",arrowTypeEnd:g?"arrow_barb_neo":"arrow_barb",style:Vt,labelStyle:"",label:W.sanitizeText(a.description??"",w()),arrowheadStyle:Mt,labelpos:Wt,labelType:Ut,thickness:jt,classes:Ht,look:y};u.push(k),G++}break}})},"setupDoc"),Pt=d((t,e=Gt)=>{let n=e;if(t.doc)for(const s of t.doc)s.stmt==="dir"&&(n=s.value);return n},"getDir");function q(t,e,n){if(!e.id||e.id==="</join></fork>"||e.id==="</choice>")return;e.cssClasses&&(Array.isArray(e.cssCompiledStyles)||(e.cssCompiledStyles=[]),e.cssClasses.split(" ").forEach(u=>{const h=n.get(u);h&&(e.cssCompiledStyles=[...e.cssCompiledStyles??[],...h.styles])}));const s=t.find(u=>u.id===e.id);s?Object.assign(s,e):t.push(e)}d(q,"insertOrUpdateNode");function Jt(t){return t?.classes?.join(" ")??""}d(Jt,"getClassesFromDbInfo");function qt(t){return t?.styles??[]}d(qt,"getStylesFromDbInfo");var Q=d((t,e,n,s,u,h,y,T)=>{const a=e.id,g=n.get(a),k=Jt(g),D=qt(g),x=w();if(m.info("dataFetcher parsedItem",e,g,D),a!=="root"){let R=Dt;e.start===!0?R=ge:e.start===!1&&(R=Te),e.type!==Z&&(R=e.type),yt.get(a)||yt.set(a,{id:a,shape:R,description:W.sanitizeText(a,x),cssClasses:`${k} ${me}`,cssStyles:D});const c=yt.get(a);e.description&&(Array.isArray(c.description)?(c.shape=vt,c.description.push(e.description)):c.description?.length&&c.description.length>0?(c.shape=vt,c.description===a?c.description=[e.description]:c.description=[c.description,e.description]):(c.shape=Dt,c.description=e.description),c.description=W.sanitizeTextOrArray(c.description,x)),c.description?.length===1&&c.shape===vt&&(c.type==="group"?c.shape=wt:c.shape=Dt),!c.type&&e.doc&&(m.info("Setting cluster for XCX",a,Pt(e)),c.type="group",c.isGroup=!0,c.dir=Pt(e),c.shape=e.type===Ft?Rt:wt,c.cssClasses=`${c.cssClasses} ${ve} ${h?Ce:""}`);const L={labelStyle:"",shape:c.shape,label:c.description,cssClasses:c.cssClasses,cssCompiledStyles:[],cssStyles:c.cssStyles,id:a,dir:c.dir,domId:gt(a,G),type:c.type,isGroup:c.type==="group",padding:8,rx:10,ry:10,look:y,labelType:"markdown"};if(L.shape===Rt&&(L.label=""),t&&t.id!=="root"&&(m.trace("Setting node ",a," to be child of its parent ",t.id),L.parentId=t.id),L.centerLabel=!0,e.note){const v={labelStyle:"",shape:_e,label:e.note.text,labelType:"markdown",cssClasses:De,cssStyles:[],cssCompiledStyles:[],id:a+xe+"-"+G,domId:gt(a,G,Kt),type:c.type,isGroup:c.type==="group",padding:x.flowchart?.padding,look:y,position:e.note.position},$=a+$t,I={labelStyle:"",shape:Ee,label:e.note.text,cssClasses:c.cssClasses,cssStyles:[],id:a+$t,domId:gt(a,G,zt),type:"group",isGroup:!0,padding:16,look:y,position:e.note.position};G++,I.id=$,v.parentId=$,q(s,I,T),q(s,v,T),q(s,L,T);let B=a,Y=v.id;e.note.position==="left of"&&(B=v.id,Y=a),u.push({id:B+"-"+Y,start:B,end:Y,arrowhead:"none",arrowTypeEnd:"",style:Vt,labelStyle:"",classes:ke,arrowheadStyle:Mt,labelpos:Wt,labelType:Ut,thickness:jt,look:y})}else q(s,L,T)}e.doc&&(m.trace("Adding nodes children "),Le(e,e.doc,n,s,u,!h,y,T))},"dataFetcher"),Ie=d(()=>{yt.clear(),G=0},"reset"),A={START_NODE:"[*]",START_TYPE:"start",END_NODE:"[*]",END_TYPE:"end",COLOR_KEYWORD:"color",FILL_KEYWORD:"fill",BG_FILL:"bgFill",STYLECLASS_SEP:","},Bt=d(()=>new Map,"newClassesList"),Yt=d(()=>({relations:[],states:new Map,documents:{}}),"newDoc"),St=d(t=>JSON.parse(JSON.stringify(t)),"clone"),Ge=(pt=class{constructor(t){this.version=t,this.nodes=[],this.edges=[],this.rootDoc=[],this.classes=Bt(),this.documents={root:Yt()},this.currentDocument=this.documents.root,this.startEndCount=0,this.dividerCnt=0,this.links=new Map,this.getAccTitle=oe,this.setAccTitle=ie,this.getAccDescription=ae,this.setAccDescription=ee,this.setDiagramTitle=re,this.getDiagramTitle=se,this.clear(),this.setRootDoc=this.setRootDoc.bind(this),this.getDividerId=this.getDividerId.bind(this),this.setDirection=this.setDirection.bind(this),this.trimColon=this.trimColon.bind(this)}extract(t){this.clear(!0);for(const s of Array.isArray(t)?t:t.doc)switch(s.stmt){case K:this.addState(s.id.trim(),s.type,s.doc,s.description,s.note);break;case At:this.addRelation(s.state1,s.state2,s.description);break;case pe:this.addStyleClass(s.id.trim(),s.classes);break;case Se:this.handleStyleDef(s);break;case ye:this.setCssClass(s.id.trim(),s.styleClass);break;case"click":this.addLink(s.id,s.url,s.tooltip);break}const e=this.getStates(),n=w();Ie(),Q(void 0,this.getRootDocV2(),e,this.nodes,this.edges,!0,n.look,this.classes);for(const s of this.nodes)if(Array.isArray(s.label)){if(s.description=s.label.slice(1),s.isGroup&&s.description.length>0)throw new Error(`Group nodes can only have label. Remove the additional description for node [${s.id}]`);s.label=s.label[0]}}handleStyleDef(t){const e=t.id.trim().split(","),n=t.styleClass.split(",");for(const s of e){let u=this.getState(s);if(!u){const h=s.trim();this.addState(h),u=this.getState(h)}u&&(u.styles=n.map(h=>h.replace(/;/g,"")?.trim()))}}setRootDoc(t){m.info("Setting root doc",t),this.rootDoc=t,this.version===1?this.extract(t):this.extract(this.getRootDocV2())}docTranslator(t,e,n){if(e.stmt===At){this.docTranslator(t,e.state1,!0),this.docTranslator(t,e.state2,!1);return}if(e.stmt===K&&(e.id===A.START_NODE?(e.id=t.id+(n?"_start":"_end"),e.start=n):e.id=e.id.trim()),e.stmt!==z&&e.stmt!==K||!e.doc)return;const s=[];let u=[];for(const h of e.doc)if(h.type===Ft){const y=St(h);y.doc=St(u),s.push(y),u=[]}else u.push(h);if(s.length>0&&u.length>0){const h={stmt:K,id:ce(),type:"divider",doc:St(u)};s.push(St(h)),e.doc=s}e.doc.forEach(h=>this.docTranslator(e,h,!0))}getRootDocV2(){return this.docTranslator({id:z,stmt:z},{id:z,stmt:z,doc:this.rootDoc},!0),{id:z,doc:this.rootDoc}}addState(t,e=Z,n=void 0,s=void 0,u=void 0,h=void 0,y=void 0,T=void 0){const a=t?.trim();if(!this.currentDocument.states.has(a))m.info("Adding state ",a,s),this.currentDocument.states.set(a,{stmt:K,id:a,descriptions:[],type:e,doc:n,note:u,classes:[],styles:[],textStyles:[]});else{const g=this.currentDocument.states.get(a);if(!g)throw new Error(`State not found: ${a}`);g.doc||(g.doc=n),g.type||(g.type=e)}if(s&&(m.info("Setting state description",a,s),(Array.isArray(s)?s:[s]).forEach(g=>this.addDescription(a,g.trim()))),u){const g=this.currentDocument.states.get(a);if(!g)throw new Error(`State not found: ${a}`);g.note=u,g.note.text=W.sanitizeText(g.note.text,w())}h&&(m.info("Setting state classes",a,h),(Array.isArray(h)?h:[h]).forEach(g=>this.setCssClass(a,g.trim()))),y&&(m.info("Setting state styles",a,y),(Array.isArray(y)?y:[y]).forEach(g=>this.setStyle(a,g.trim()))),T&&(m.info("Setting state styles",a,y),(Array.isArray(T)?T:[T]).forEach(g=>this.setTextStyle(a,g.trim())))}clear(t){this.nodes=[],this.edges=[],this.documents={root:Yt()},this.currentDocument=this.documents.root,this.startEndCount=0,this.classes=Bt(),t||(this.links=new Map,ne())}getState(t){return this.currentDocument.states.get(t)}getStates(){return this.currentDocument.states}logDocuments(){m.info("Documents = ",this.documents)}getRelations(){return this.currentDocument.relations}addLink(t,e,n){this.links.set(t,{url:e,tooltip:n}),m.warn("Adding link",t,e,n)}getLinks(){return this.links}startIdIfNeeded(t=""){return t===A.START_NODE?(this.startEndCount++,`${A.START_TYPE}${this.startEndCount}`):t}startTypeIfNeeded(t="",e=Z){return t===A.START_NODE?A.START_TYPE:e}endIdIfNeeded(t=""){return t===A.END_NODE?(this.startEndCount++,`${A.END_TYPE}${this.startEndCount}`):t}endTypeIfNeeded(t="",e=Z){return t===A.END_NODE?A.END_TYPE:e}addRelationObjs(t,e,n=""){const s=this.startIdIfNeeded(t.id.trim()),u=this.startTypeIfNeeded(t.id.trim(),t.type),h=this.startIdIfNeeded(e.id.trim()),y=this.startTypeIfNeeded(e.id.trim(),e.type);this.addState(s,u,t.doc,t.description,t.note,t.classes,t.styles,t.textStyles),this.addState(h,y,e.doc,e.description,e.note,e.classes,e.styles,e.textStyles),this.currentDocument.relations.push({id1:s,id2:h,relationTitle:W.sanitizeText(n,w())})}addRelation(t,e,n){if(typeof t=="object"&&typeof e=="object")this.addRelationObjs(t,e,n);else if(typeof t=="string"&&typeof e=="string"){const s=this.startIdIfNeeded(t.trim()),u=this.startTypeIfNeeded(t),h=this.endIdIfNeeded(e.trim()),y=this.endTypeIfNeeded(e);this.addState(s,u),this.addState(h,y),this.currentDocument.relations.push({id1:s,id2:h,relationTitle:n?W.sanitizeText(n,w()):void 0})}}addDescription(t,e){const n=this.currentDocument.states.get(t),s=e.startsWith(":")?e.replace(":","").trim():e;n?.descriptions?.push(W.sanitizeText(s,w()))}cleanupLabel(t){return t.startsWith(":")?t.slice(2).trim():t.trim()}getDividerId(){return this.dividerCnt++,`divider-id-${this.dividerCnt}`}addStyleClass(t,e=""){this.classes.has(t)||this.classes.set(t,{id:t,styles:[],textStyles:[]});const n=this.classes.get(t);e&&n&&e.split(A.STYLECLASS_SEP).forEach(s=>{const u=s.replace(/([^;]*);/,"$1").trim();if(RegExp(A.COLOR_KEYWORD).exec(s)){const h=u.replace(A.FILL_KEYWORD,A.BG_FILL).replace(A.COLOR_KEYWORD,A.FILL_KEYWORD);n.textStyles.push(h)}n.styles.push(u)})}getClasses(){return this.classes}setCssClass(t,e){t.split(",").forEach(n=>{let s=this.getState(n);if(!s){const u=n.trim();this.addState(u),s=this.getState(u)}s?.classes?.push(e)})}setStyle(t,e){this.getState(t)?.styles?.push(e)}setTextStyle(t,e){this.getState(t)?.textStyles?.push(e)}getDirectionStatement(){return this.rootDoc.find(t=>t.stmt===Ot)}getDirection(){return this.getDirectionStatement()?.value??fe}setDirection(t){const e=this.getDirectionStatement();e?e.value=t:this.rootDoc.unshift({stmt:Ot,value:t})}trimColon(t){return t.startsWith(":")?t.slice(1).trim():t.trim()}getData(){const t=w();return{nodes:this.nodes,edges:this.edges,other:{},config:t,direction:Xt(this.getRootDocV2())}}getConfig(){return w().state}},d(pt,"StateDB"),pt.relationType={AGGREGATION:0,EXTENSION:1,COMPOSITION:2,DEPENDENCY:3},pt),Fe=d(t=>`
defs [id$="-barbEnd"] {
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
  stroke-width: ${t.strokeWidth||1};
}

.transition {
  stroke: ${t.transitionColor};
  stroke-width: ${t.strokeWidth||1};
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
.edgeLabel {
  background-color: ${t.edgeLabelBackground};
  p {
    background-color: ${t.edgeLabelBackground};
  }
  rect {
    opacity: 0.5;
    background-color: ${t.edgeLabelBackground};
    fill: ${t.edgeLabelBackground};
  }
  text-align: center;
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
  stroke-width: ${t.strokeWidth||1}px;
}
.node polygon {
  fill: ${t.mainBkg};
  stroke: ${t.stateBorder||t.nodeBorder};;
  stroke-width: ${t.strokeWidth||1}px;
}
[id$="-barbEnd"] {
  fill: ${t.lineColor};
}

.statediagram-cluster rect {
  fill: ${t.compositeTitleBackground};
  stroke: ${t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth||1}px;
}

.cluster-label, .nodeLabel {
  color: ${t.stateLabelColor};
  // line-height: 1;
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

[id$="-dependencyStart"], [id$="-dependencyEnd"] {
  fill: ${t.lineColor};
  stroke: ${t.lineColor};
  stroke-width: ${t.strokeWidth||1};
}

.statediagramTitleText {
  text-anchor: middle;
  font-size: 18px;
  fill: ${t.textColor};
}

[data-look="neo"].statediagram-cluster rect {
  fill: ${t.mainBkg};
  stroke: ${t.useGradient?"url("+t.svgId+"-gradient)":t.stateBorder||t.nodeBorder};
  stroke-width: ${t.strokeWidth??1};
}
[data-look="neo"].statediagram-cluster rect.outer {
  rx: ${t.radius}px;
  ry: ${t.radius}px;
  filter: ${t.dropShadow?t.dropShadow.replace("url(#drop-shadow)",`url(${t.svgId}-drop-shadow)`):"none"}
}
`,"getStyles");export{Fe as i,Be as n,Ye as r,Ge as t};
