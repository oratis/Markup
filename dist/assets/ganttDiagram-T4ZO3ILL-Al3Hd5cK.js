import{s as ot,t as oe}from"./rolldown-runtime-DwyjGMXk.js";import{Yt as ht,en as ce}from"./milkdown-CEek6Ucv.js";import{t as le}from"./linear-BuXphMyn.js";import{C as ue,S as de,_ as Rt,a as Bt,b as fe,c as he,d as me,f as ke,g as zt,h as qt,i as ye,l as ge,m as Ht,n as pe,o as jt,p as ve,r as Te,s as xe,t as be,u as _e,v as Xt,x as we,y as De}from"./advancedFormat-BSA3351T.js";import{n as u,r as tt}from"./chunk-AGHRB4JF-CAZMR7zq.js";import{B as Se,C as Ce,V as Ee,W as Ie,_ as Me,a as Ae,b as nt,c as Fe,s as Le,v as $e}from"./chunk-ICPOFSXX-DopV1dwE.js";import{t as Oe}from"./dist-CN9Ik0N1.js";import{h as Ye}from"./chunk-5PVQY5BW-I8kJyHeI.js";var Ve=oe(((t,i)=>{(function(a,s){typeof t=="object"&&typeof i<"u"?i.exports=s():typeof define=="function"&&define.amd?define(s):(a=typeof globalThis<"u"?globalThis:a||self).dayjs_plugin_duration=s()})(t,(function(){"use strict";var a,s,r=1e3,m=6e4,x=36e5,V=864e5,N=/\[([^\]]+)]|Y{1,4}|M{1,4}|D{1,2}|d{1,4}|H{1,2}|h{1,2}|a|A|m{1,2}|s{1,2}|Z{1,2}|SSS/g,F=31536e6,I=2628e6,Y=/^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/,$={years:F,months:I,days:V,hours:x,minutes:m,seconds:r,milliseconds:1,weeks:6048e5},P=function(D){return D instanceof j},L=function(D,v,k){return new j(D,k,v.$l)},_=function(D){return s.p(D)+"s"},G=function(D){return D<0},R=function(D){return G(D)?Math.ceil(D):Math.floor(D)},K=function(D){return Math.abs(D)},B=function(D,v){return D?G(D)?{negative:!0,format:""+K(D)+v}:{negative:!1,format:""+D+v}:{negative:!1,format:""}},j=(function(){function D(k,h,p){var g=this;if(this.$d={},this.$l=p,k===void 0&&(this.$ms=0,this.parseFromMilliseconds()),h)return L(k*$[_(h)],this);if(typeof k=="number")return this.$ms=k,this.parseFromMilliseconds(),this;if(typeof k=="object")return Object.keys(k).forEach((function(y){g.$d[_(y)]=k[y]})),this.calMilliseconds(),this;if(typeof k=="string"){var o=k.match(Y);if(o){var l=o.slice(2).map((function(y){return y!=null?Number(y):0}));return this.$d.years=l[0],this.$d.months=l[1],this.$d.weeks=l[2],this.$d.days=l[3],this.$d.hours=l[4],this.$d.minutes=l[5],this.$d.seconds=l[6],this.calMilliseconds(),this}}return this}var v=D.prototype;return v.calMilliseconds=function(){var k=this;this.$ms=Object.keys(this.$d).reduce((function(h,p){return h+(k.$d[p]||0)*$[p]}),0)},v.parseFromMilliseconds=function(){var k=this.$ms;this.$d.years=R(k/F),k%=F,this.$d.months=R(k/I),k%=I,this.$d.days=R(k/V),k%=V,this.$d.hours=R(k/x),k%=x,this.$d.minutes=R(k/m),k%=m,this.$d.seconds=R(k/r),k%=r,this.$d.milliseconds=k},v.toISOString=function(){var k=B(this.$d.years,"Y"),h=B(this.$d.months,"M"),p=+this.$d.days||0;this.$d.weeks&&(p+=7*this.$d.weeks);var g=B(p,"D"),o=B(this.$d.hours,"H"),l=B(this.$d.minutes,"M"),y=this.$d.seconds||0;this.$d.milliseconds&&(y+=this.$d.milliseconds/1e3,y=Math.round(1e3*y)/1e3);var f=B(y,"S"),d=k.negative||h.negative||g.negative||o.negative||l.negative||f.negative,T=o.format||l.format||f.format?"T":"",e=(d?"-":"")+"P"+k.format+h.format+g.format+T+o.format+l.format+f.format;return e==="P"||e==="-P"?"P0D":e},v.toJSON=function(){return this.toISOString()},v.format=function(k){var h=k||"YYYY-MM-DDTHH:mm:ss",p={Y:this.$d.years,YY:s.s(this.$d.years,2,"0"),YYYY:s.s(this.$d.years,4,"0"),M:this.$d.months,MM:s.s(this.$d.months,2,"0"),D:this.$d.days,DD:s.s(this.$d.days,2,"0"),H:this.$d.hours,HH:s.s(this.$d.hours,2,"0"),m:this.$d.minutes,mm:s.s(this.$d.minutes,2,"0"),s:this.$d.seconds,ss:s.s(this.$d.seconds,2,"0"),SSS:s.s(this.$d.milliseconds,3,"0")};return h.replace(N,(function(g,o){return o||String(p[g])}))},v.as=function(k){return this.$ms/$[_(k)]},v.get=function(k){var h=this.$ms,p=_(k);return p==="milliseconds"?h%=1e3:h=p==="weeks"?R(h/$[p]):this.$d[p],h||0},v.add=function(k,h,p){var g;return g=h?k*$[_(h)]:P(k)?k.$ms:L(k,this).$ms,L(this.$ms+g*(p?-1:1),this)},v.subtract=function(k,h){return this.add(k,h,!0)},v.locale=function(k){var h=this.clone();return h.$l=k,h},v.clone=function(){return L(this.$ms,this)},v.humanize=function(k){return a().add(this.$ms,"ms").locale(this.$l).fromNow(!k)},v.valueOf=function(){return this.asMilliseconds()},v.milliseconds=function(){return this.get("milliseconds")},v.asMilliseconds=function(){return this.as("milliseconds")},v.seconds=function(){return this.get("seconds")},v.asSeconds=function(){return this.as("seconds")},v.minutes=function(){return this.get("minutes")},v.asMinutes=function(){return this.as("minutes")},v.hours=function(){return this.get("hours")},v.asHours=function(){return this.as("hours")},v.days=function(){return this.get("days")},v.asDays=function(){return this.as("days")},v.weeks=function(){return this.get("weeks")},v.asWeeks=function(){return this.as("weeks")},v.months=function(){return this.get("months")},v.asMonths=function(){return this.as("months")},v.years=function(){return this.get("years")},v.asYears=function(){return this.as("years")},D})(),J=function(D,v,k){return D.add(v.years()*k,"y").add(v.months()*k,"M").add(v.days()*k,"d").add(v.hours()*k,"h").add(v.minutes()*k,"m").add(v.seconds()*k,"s").add(v.milliseconds()*k,"ms")};return function(D,v,k){a=k,s=k().$utils(),k.duration=function(g,o){return L(g,{$l:k.locale()},o)},k.isDuration=P;var h=v.prototype.add,p=v.prototype.subtract;v.prototype.add=function(g,o){return P(g)?J(this,g,1):h.bind(this)(g,o)},v.prototype.subtract=function(g,o){return P(g)?J(this,g,-1):p.bind(this)(g,o)}}}))})),We=Oe(),O=ot(ce(),1),Ne=ot(Te(),1),Pe=ot(pe(),1),Re=ot(be(),1),Be=ot(Ve(),1),Dt=(function(){var t=u(function(o,l,y,f){for(y=y||{},f=o.length;f--;y[o[f]]=l);return y},"o"),i=[6,8,10,12,13,14,15,16,17,18,20,21,22,23,24,25,26,27,28,29,30,31,33,35,36,38,40],a=[1,26],s=[1,27],r=[1,28],m=[1,29],x=[1,30],V=[1,31],N=[1,32],F=[1,33],I=[1,34],Y=[1,9],$=[1,10],P=[1,11],L=[1,12],_=[1,13],G=[1,14],R=[1,15],K=[1,16],B=[1,19],j=[1,20],J=[1,21],D=[1,22],v=[1,23],k=[1,25],h=[1,35],p={trace:u(function(){},"trace"),yy:{},symbols_:{error:2,start:3,gantt:4,document:5,EOF:6,line:7,SPACE:8,statement:9,NL:10,weekday:11,weekday_monday:12,weekday_tuesday:13,weekday_wednesday:14,weekday_thursday:15,weekday_friday:16,weekday_saturday:17,weekday_sunday:18,weekend:19,weekend_friday:20,weekend_saturday:21,dateFormat:22,inclusiveEndDates:23,topAxis:24,axisFormat:25,tickInterval:26,excludes:27,includes:28,todayMarker:29,title:30,acc_title:31,acc_title_value:32,acc_descr:33,acc_descr_value:34,acc_descr_multiline_value:35,section:36,clickStatement:37,taskTxt:38,taskData:39,click:40,callbackname:41,callbackargs:42,href:43,clickStatementDebug:44,$accept:0,$end:1},terminals_:{2:"error",4:"gantt",6:"EOF",8:"SPACE",10:"NL",12:"weekday_monday",13:"weekday_tuesday",14:"weekday_wednesday",15:"weekday_thursday",16:"weekday_friday",17:"weekday_saturday",18:"weekday_sunday",20:"weekend_friday",21:"weekend_saturday",22:"dateFormat",23:"inclusiveEndDates",24:"topAxis",25:"axisFormat",26:"tickInterval",27:"excludes",28:"includes",29:"todayMarker",30:"title",31:"acc_title",32:"acc_title_value",33:"acc_descr",34:"acc_descr_value",35:"acc_descr_multiline_value",36:"section",38:"taskTxt",39:"taskData",40:"click",41:"callbackname",42:"callbackargs",43:"href"},productions_:[0,[3,3],[5,0],[5,2],[7,2],[7,1],[7,1],[7,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[11,1],[19,1],[19,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,1],[9,2],[9,2],[9,1],[9,1],[9,1],[9,2],[37,2],[37,3],[37,3],[37,4],[37,3],[37,4],[37,2],[44,2],[44,3],[44,3],[44,4],[44,3],[44,4],[44,2]],performAction:u(function(l,y,f,d,T,e,c){var n=e.length-1;switch(T){case 1:return e[n-1];case 2:this.$=[];break;case 3:e[n-1].push(e[n]),this.$=e[n-1];break;case 4:case 5:this.$=e[n];break;case 6:case 7:this.$=[];break;case 8:d.setWeekday("monday");break;case 9:d.setWeekday("tuesday");break;case 10:d.setWeekday("wednesday");break;case 11:d.setWeekday("thursday");break;case 12:d.setWeekday("friday");break;case 13:d.setWeekday("saturday");break;case 14:d.setWeekday("sunday");break;case 15:d.setWeekend("friday");break;case 16:d.setWeekend("saturday");break;case 17:d.setDateFormat(e[n].substr(11)),this.$=e[n].substr(11);break;case 18:d.enableInclusiveEndDates(),this.$=e[n].substr(18);break;case 19:d.TopAxis(),this.$=e[n].substr(8);break;case 20:d.setAxisFormat(e[n].substr(11)),this.$=e[n].substr(11);break;case 21:d.setTickInterval(e[n].substr(13)),this.$=e[n].substr(13);break;case 22:d.setExcludes(e[n].substr(9)),this.$=e[n].substr(9);break;case 23:d.setIncludes(e[n].substr(9)),this.$=e[n].substr(9);break;case 24:d.setTodayMarker(e[n].substr(12)),this.$=e[n].substr(12);break;case 27:d.setDiagramTitle(e[n].substr(6)),this.$=e[n].substr(6);break;case 28:this.$=e[n].trim(),d.setAccTitle(this.$);break;case 29:case 30:this.$=e[n].trim(),d.setAccDescription(this.$);break;case 31:d.addSection(e[n].substr(8)),this.$=e[n].substr(8);break;case 33:d.addTask(e[n-1],e[n]),this.$="task";break;case 34:this.$=e[n-1],d.setClickEvent(e[n-1],e[n],null);break;case 35:this.$=e[n-2],d.setClickEvent(e[n-2],e[n-1],e[n]);break;case 36:this.$=e[n-2],d.setClickEvent(e[n-2],e[n-1],null),d.setLink(e[n-2],e[n]);break;case 37:this.$=e[n-3],d.setClickEvent(e[n-3],e[n-2],e[n-1]),d.setLink(e[n-3],e[n]);break;case 38:this.$=e[n-2],d.setClickEvent(e[n-2],e[n],null),d.setLink(e[n-2],e[n-1]);break;case 39:this.$=e[n-3],d.setClickEvent(e[n-3],e[n-1],e[n]),d.setLink(e[n-3],e[n-2]);break;case 40:this.$=e[n-1],d.setLink(e[n-1],e[n]);break;case 41:case 47:this.$=e[n-1]+" "+e[n];break;case 42:case 43:case 45:this.$=e[n-2]+" "+e[n-1]+" "+e[n];break;case 44:case 46:this.$=e[n-3]+" "+e[n-2]+" "+e[n-1]+" "+e[n];break}},"anonymous"),table:[{3:1,4:[1,2]},{1:[3]},t(i,[2,2],{5:3}),{6:[1,4],7:5,8:[1,6],9:7,10:[1,8],11:17,12:a,13:s,14:r,15:m,16:x,17:V,18:N,19:18,20:F,21:I,22:Y,23:$,24:P,25:L,26:_,27:G,28:R,29:K,30:B,31:j,33:J,35:D,36:v,37:24,38:k,40:h},t(i,[2,7],{1:[2,1]}),t(i,[2,3]),{9:36,11:17,12:a,13:s,14:r,15:m,16:x,17:V,18:N,19:18,20:F,21:I,22:Y,23:$,24:P,25:L,26:_,27:G,28:R,29:K,30:B,31:j,33:J,35:D,36:v,37:24,38:k,40:h},t(i,[2,5]),t(i,[2,6]),t(i,[2,17]),t(i,[2,18]),t(i,[2,19]),t(i,[2,20]),t(i,[2,21]),t(i,[2,22]),t(i,[2,23]),t(i,[2,24]),t(i,[2,25]),t(i,[2,26]),t(i,[2,27]),{32:[1,37]},{34:[1,38]},t(i,[2,30]),t(i,[2,31]),t(i,[2,32]),{39:[1,39]},t(i,[2,8]),t(i,[2,9]),t(i,[2,10]),t(i,[2,11]),t(i,[2,12]),t(i,[2,13]),t(i,[2,14]),t(i,[2,15]),t(i,[2,16]),{41:[1,40],43:[1,41]},t(i,[2,4]),t(i,[2,28]),t(i,[2,29]),t(i,[2,33]),t(i,[2,34],{42:[1,42],43:[1,43]}),t(i,[2,40],{41:[1,44]}),t(i,[2,35],{43:[1,45]}),t(i,[2,36]),t(i,[2,38],{42:[1,46]}),t(i,[2,37]),t(i,[2,39])],defaultActions:{},parseError:u(function(l,y){if(y.recoverable)this.trace(l);else{var f=new Error(l);throw f.hash=y,f}},"parseError"),parse:u(function(l){var y=this,f=[0],d=[],T=[null],e=[],c=this.table,n="",w=0,S=0,b=0,C=2,E=1,pt=e.slice.call(arguments,1),M=Object.create(this.lexer),Z={yy:{}};for(var vt in this.yy)Object.prototype.hasOwnProperty.call(this.yy,vt)&&(Z.yy[vt]=this.yy[vt]);M.setInput(l,Z.yy),Z.yy.lexer=M,Z.yy.parser=this,typeof M.yylloc>"u"&&(M.yylloc={});var Tt=M.yylloc;e.push(Tt);var re=M.options&&M.options.ranges;typeof Z.yy.parseError=="function"?this.parseError=Z.yy.parseError:this.parseError=Object.getPrototypeOf(this).parseError;function ae(q){f.length=f.length-2*q,T.length=T.length-q,e.length=e.length-q}u(ae,"popStack");function Nt(){var q=d.pop()||M.lex()||E;return typeof q!="number"&&(q instanceof Array&&(d=q,q=d.pop()),q=y.symbols_[q]||q),q}u(Nt,"lex");for(var W,xt,Q,z,bt,st={},dt,X,Pt,ft;;){if(Q=f[f.length-1],this.defaultActions[Q]?z=this.defaultActions[Q]:((W===null||typeof W>"u")&&(W=Nt()),z=c[Q]&&c[Q][W]),typeof z>"u"||!z.length||!z[0]){var _t="";ft=[];for(dt in c[Q])this.terminals_[dt]&&dt>C&&ft.push("'"+this.terminals_[dt]+"'");M.showPosition?_t="Parse error on line "+(w+1)+`:
`+M.showPosition()+`
Expecting `+ft.join(", ")+", got '"+(this.terminals_[W]||W)+"'":_t="Parse error on line "+(w+1)+": Unexpected "+(W==E?"end of input":"'"+(this.terminals_[W]||W)+"'"),this.parseError(_t,{text:M.match,token:this.terminals_[W]||W,line:M.yylineno,loc:Tt,expected:ft})}if(z[0]instanceof Array&&z.length>1)throw new Error("Parse Error: multiple actions possible at state: "+Q+", token: "+W);switch(z[0]){case 1:f.push(W),T.push(M.yytext),e.push(M.yylloc),f.push(z[1]),W=null,xt?(W=xt,xt=null):(S=M.yyleng,n=M.yytext,w=M.yylineno,Tt=M.yylloc,b>0&&b--);break;case 2:if(X=this.productions_[z[1]][1],st.$=T[T.length-X],st._$={first_line:e[e.length-(X||1)].first_line,last_line:e[e.length-1].last_line,first_column:e[e.length-(X||1)].first_column,last_column:e[e.length-1].last_column},re&&(st._$.range=[e[e.length-(X||1)].range[0],e[e.length-1].range[1]]),bt=this.performAction.apply(st,[n,S,w,Z.yy,z[1],T,e].concat(pt)),typeof bt<"u")return bt;X&&(f=f.slice(0,-1*X*2),T=T.slice(0,-1*X),e=e.slice(0,-1*X)),f.push(this.productions_[z[1]][0]),T.push(st.$),e.push(st._$),Pt=c[f[f.length-2]][f[f.length-1]],f.push(Pt);break;case 3:return!0}}return!0},"parse")};p.lexer=(function(){return{EOF:1,parseError:u(function(l,y){if(this.yy.parser)this.yy.parser.parseError(l,y);else throw new Error(l)},"parseError"),setInput:u(function(o,l){return this.yy=l||this.yy||{},this._input=o,this._more=this._backtrack=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this.options.ranges&&(this.yylloc.range=[0,0]),this.offset=0,this},"setInput"),input:u(function(){var o=this._input[0];return this.yytext+=o,this.yyleng++,this.offset++,this.match+=o,this.matched+=o,o.match(/(?:\r\n?|\n).*/g)?(this.yylineno++,this.yylloc.last_line++):this.yylloc.last_column++,this.options.ranges&&this.yylloc.range[1]++,this._input=this._input.slice(1),o},"input"),unput:u(function(o){var l=o.length,y=o.split(/(?:\r\n?|\n)/g);this._input=o+this._input,this.yytext=this.yytext.substr(0,this.yytext.length-l),this.offset-=l;var f=this.match.split(/(?:\r\n?|\n)/g);this.match=this.match.substr(0,this.match.length-1),this.matched=this.matched.substr(0,this.matched.length-1),y.length-1&&(this.yylineno-=y.length-1);var d=this.yylloc.range;return this.yylloc={first_line:this.yylloc.first_line,last_line:this.yylineno+1,first_column:this.yylloc.first_column,last_column:y?(y.length===f.length?this.yylloc.first_column:0)+f[f.length-y.length].length-y[0].length:this.yylloc.first_column-l},this.options.ranges&&(this.yylloc.range=[d[0],d[0]+this.yyleng-l]),this.yyleng=this.yytext.length,this},"unput"),more:u(function(){return this._more=!0,this},"more"),reject:u(function(){if(this.options.backtrack_lexer)this._backtrack=!0;else return this.parseError("Lexical error on line "+(this.yylineno+1)+`. You can only invoke reject() in the lexer when the lexer is of the backtracking persuasion (options.backtrack_lexer = true).
`+this.showPosition(),{text:"",token:null,line:this.yylineno});return this},"reject"),less:u(function(o){this.unput(this.match.slice(o))},"less"),pastInput:u(function(){var o=this.matched.substr(0,this.matched.length-this.match.length);return(o.length>20?"...":"")+o.substr(-20).replace(/\n/g,"")},"pastInput"),upcomingInput:u(function(){var o=this.match;return o.length<20&&(o+=this._input.substr(0,20-o.length)),(o.substr(0,20)+(o.length>20?"...":"")).replace(/\n/g,"")},"upcomingInput"),showPosition:u(function(){var o=this.pastInput(),l=new Array(o.length+1).join("-");return o+this.upcomingInput()+`
`+l+"^"},"showPosition"),test_match:u(function(o,l){var y,f,d;if(this.options.backtrack_lexer&&(d={yylineno:this.yylineno,yylloc:{first_line:this.yylloc.first_line,last_line:this.last_line,first_column:this.yylloc.first_column,last_column:this.yylloc.last_column},yytext:this.yytext,match:this.match,matches:this.matches,matched:this.matched,yyleng:this.yyleng,offset:this.offset,_more:this._more,_input:this._input,yy:this.yy,conditionStack:this.conditionStack.slice(0),done:this.done},this.options.ranges&&(d.yylloc.range=this.yylloc.range.slice(0))),f=o[0].match(/(?:\r\n?|\n).*/g),f&&(this.yylineno+=f.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:f?f[f.length-1].length-f[f.length-1].match(/\r?\n?/)[0].length:this.yylloc.last_column+o[0].length},this.yytext+=o[0],this.match+=o[0],this.matches=o,this.yyleng=this.yytext.length,this.options.ranges&&(this.yylloc.range=[this.offset,this.offset+=this.yyleng]),this._more=!1,this._backtrack=!1,this._input=this._input.slice(o[0].length),this.matched+=o[0],y=this.performAction.call(this,this.yy,this,l,this.conditionStack[this.conditionStack.length-1]),this.done&&this._input&&(this.done=!1),y)return y;if(this._backtrack){for(var T in d)this[T]=d[T];return!1}return!1},"test_match"),next:u(function(){if(this.done)return this.EOF;this._input||(this.done=!0);var o,l,y,f;this._more||(this.yytext="",this.match="");for(var d=this._currentRules(),T=0;T<d.length;T++)if(y=this._input.match(this.rules[d[T]]),y&&(!l||y[0].length>l[0].length)){if(l=y,f=T,this.options.backtrack_lexer){if(o=this.test_match(y,d[T]),o!==!1)return o;if(this._backtrack){l=!1;continue}else return!1}else if(!this.options.flex)break}return l?(o=this.test_match(l,d[f]),o!==!1?o:!1):this._input===""?this.EOF:this.parseError("Lexical error on line "+(this.yylineno+1)+`. Unrecognized text.
`+this.showPosition(),{text:"",token:null,line:this.yylineno})},"next"),lex:u(function(){var l=this.next();return l||this.lex()},"lex"),begin:u(function(l){this.conditionStack.push(l)},"begin"),popState:u(function(){return this.conditionStack.length-1>0?this.conditionStack.pop():this.conditionStack[0]},"popState"),_currentRules:u(function(){return this.conditionStack.length&&this.conditionStack[this.conditionStack.length-1]?this.conditions[this.conditionStack[this.conditionStack.length-1]].rules:this.conditions.INITIAL.rules},"_currentRules"),topState:u(function(l){return l=this.conditionStack.length-1-Math.abs(l||0),l>=0?this.conditionStack[l]:"INITIAL"},"topState"),pushState:u(function(l){this.begin(l)},"pushState"),stateStackSize:u(function(){return this.conditionStack.length},"stateStackSize"),options:{"case-insensitive":!0},performAction:u(function(l,y,f,d){switch(f){case 0:return this.begin("open_directive"),"open_directive";case 1:return this.begin("acc_title"),31;case 2:return this.popState(),"acc_title_value";case 3:return this.begin("acc_descr"),33;case 4:return this.popState(),"acc_descr_value";case 5:this.begin("acc_descr_multiline");break;case 6:this.popState();break;case 7:return"acc_descr_multiline_value";case 8:break;case 9:break;case 10:break;case 11:return 10;case 12:break;case 13:break;case 14:this.begin("href");break;case 15:this.popState();break;case 16:return 43;case 17:this.begin("callbackname");break;case 18:this.popState();break;case 19:this.popState(),this.begin("callbackargs");break;case 20:return 41;case 21:this.popState();break;case 22:return 42;case 23:this.begin("click");break;case 24:this.popState();break;case 25:return 40;case 26:return 4;case 27:return 22;case 28:return 23;case 29:return 24;case 30:return 25;case 31:return 26;case 32:return 28;case 33:return 27;case 34:return 29;case 35:return 12;case 36:return 13;case 37:return 14;case 38:return 15;case 39:return 16;case 40:return 17;case 41:return 18;case 42:return 20;case 43:return 21;case 44:return"date";case 45:return 30;case 46:return"accDescription";case 47:return 36;case 48:return 38;case 49:return 39;case 50:return":";case 51:return 6;case 52:return"INVALID"}},"anonymous"),rules:[/^(?:%%\{)/i,/^(?:accTitle\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*:\s*)/i,/^(?:(?!\n||)*[^\n]*)/i,/^(?:accDescr\s*\{\s*)/i,/^(?:[\}])/i,/^(?:[^\}]*)/i,/^(?:%%(?!\{)*[^\n]*)/i,/^(?:[^\}]%%*[^\n]*)/i,/^(?:%%*[^\n]*[\n]*)/i,/^(?:[\n]+)/i,/^(?:\s+)/i,/^(?:%[^\n]*)/i,/^(?:href[\s]+["])/i,/^(?:["])/i,/^(?:[^"]*)/i,/^(?:call[\s]+)/i,/^(?:\([\s]*\))/i,/^(?:\()/i,/^(?:[^(]*)/i,/^(?:\))/i,/^(?:[^)]*)/i,/^(?:click[\s]+)/i,/^(?:[\s\n])/i,/^(?:[^\s\n]*)/i,/^(?:gantt\b)/i,/^(?:dateFormat\s[^#\n;]+)/i,/^(?:inclusiveEndDates\b)/i,/^(?:topAxis\b)/i,/^(?:axisFormat\s[^#\n;]+)/i,/^(?:tickInterval\s[^#\n;]+)/i,/^(?:includes\s[^#\n;]+)/i,/^(?:excludes\s[^#\n;]+)/i,/^(?:todayMarker\s[^\n;]+)/i,/^(?:weekday\s+monday\b)/i,/^(?:weekday\s+tuesday\b)/i,/^(?:weekday\s+wednesday\b)/i,/^(?:weekday\s+thursday\b)/i,/^(?:weekday\s+friday\b)/i,/^(?:weekday\s+saturday\b)/i,/^(?:weekday\s+sunday\b)/i,/^(?:weekend\s+friday\b)/i,/^(?:weekend\s+saturday\b)/i,/^(?:\d\d\d\d-\d\d-\d\d\b)/i,/^(?:title\s[^\n]+)/i,/^(?:accDescription\s[^#\n;]+)/i,/^(?:section\s[^\n]+)/i,/^(?:[^:\n]+)/i,/^(?::[^#\n;]+)/i,/^(?::)/i,/^(?:$)/i,/^(?:.)/i],conditions:{acc_descr_multiline:{rules:[6,7],inclusive:!1},acc_descr:{rules:[4],inclusive:!1},acc_title:{rules:[2],inclusive:!1},callbackargs:{rules:[21,22],inclusive:!1},callbackname:{rules:[18,19,20],inclusive:!1},href:{rules:[15,16],inclusive:!1},click:{rules:[24,25],inclusive:!1},INITIAL:{rules:[0,1,3,5,8,9,10,11,12,13,14,17,23,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52],inclusive:!0}}}})();function g(){this.yy={}}return u(g,"Parser"),g.prototype=p,p.Parser=g,new g})();Dt.parser=Dt;var ze=Dt;O.default.extend(Ne.default);O.default.extend(Pe.default);O.default.extend(Re.default);var Ut={friday:5,saturday:6},H="",It="",Mt=void 0,At="",ct=[],lt=[],Ft=new Map,Lt=[],yt=[],at="",$t="",Kt=["active","done","crit","milestone","vert"],Ot=[],it="",ut=!1,Yt=!1,Vt="sunday",gt="saturday",St=0,qe=u(function(){Lt=[],yt=[],at="",Ot=[],mt=0,Et=void 0,kt=void 0,A=[],H="",It="",$t="",Mt=void 0,At="",ct=[],lt=[],ut=!1,Yt=!1,St=0,Ft=new Map,it="",Ae(),Vt="sunday",gt="saturday"},"clear"),He=u(function(t){it=t},"setDiagramId"),je=u(function(t){It=t},"setAxisFormat"),Xe=u(function(){return It},"getAxisFormat"),Ue=u(function(t){Mt=t},"setTickInterval"),Ge=u(function(){return Mt},"getTickInterval"),Je=u(function(t){At=t},"setTodayMarker"),Ke=u(function(){return At},"getTodayMarker"),Ze=u(function(t){H=t},"setDateFormat"),Qe=u(function(){ut=!0},"enableInclusiveEndDates"),ts=u(function(){return ut},"endDatesAreInclusive"),es=u(function(){Yt=!0},"enableTopAxis"),ss=u(function(){return Yt},"topAxisEnabled"),is=u(function(t){$t=t},"setDisplayMode"),ns=u(function(){return $t},"getDisplayMode"),rs=u(function(){return H},"getDateFormat"),as=u(function(t){ct=t.toLowerCase().split(/[\s,]+/)},"setIncludes"),os=u(function(){return ct},"getIncludes"),cs=u(function(t){lt=t.toLowerCase().split(/[\s,]+/)},"setExcludes"),ls=u(function(){return lt},"getExcludes"),us=u(function(){return Ft},"getLinks"),ds=u(function(t){at=t,Lt.push(t)},"addSection"),fs=u(function(){return Lt},"getSections"),hs=u(function(){let t=Gt();const i=10;let a=0;for(;!t&&a<i;)t=Gt(),a++;return yt=A,yt},"getTasks"),Zt=u(function(t,i,a,s){const r=t.format(i.trim()),m=t.format("YYYY-MM-DD");return s.includes(r)||s.includes(m)?!1:a.includes("weekends")&&(t.isoWeekday()===Ut[gt]||t.isoWeekday()===Ut[gt]+1)||a.includes(t.format("dddd").toLowerCase())?!0:a.includes(r)||a.includes(m)},"isInvalidDate"),ms=u(function(t){Vt=t},"setWeekday"),ks=u(function(){return Vt},"getWeekday"),ys=u(function(t){gt=t},"setWeekend"),Qt=u(function(t,i,a,s){if(!a.length||t.manualEndTime)return;let r;t.startTime instanceof Date?r=(0,O.default)(t.startTime):r=(0,O.default)(t.startTime,i,!0),r=r.add(1,"d");let m;t.endTime instanceof Date?m=(0,O.default)(t.endTime):m=(0,O.default)(t.endTime,i,!0);const[x,V]=gs(r,m,i,a,s);t.endTime=x.toDate(),t.renderEndTime=V},"checkTaskDates"),gs=u(function(t,i,a,s,r){let m=!1,x=null;for(;t<=i;)m||(x=i.toDate()),m=Zt(t,a,s,r),m&&(i=i.add(1,"d")),t=t.add(1,"d");return[i,x]},"fixTaskDates"),Ct=u(function(t,i,a){if(a=a.trim(),u(m=>{const x=m.trim();return x==="x"||x==="X"},"isTimestampFormat")(i)&&/^\d+$/.test(a))return new Date(Number(a));const s=/^after\s+(?<ids>[\d\w- ]+)/.exec(a);if(s!==null){let m=null;for(const V of s.groups.ids.split(" ")){let N=et(V);N!==void 0&&(!m||N.endTime>m.endTime)&&(m=N)}if(m)return m.endTime;const x=new Date;return x.setHours(0,0,0,0),x}let r=(0,O.default)(a,i.trim(),!0);if(r.isValid())return r.toDate();{tt.debug("Invalid date:"+a),tt.debug("With date format:"+i.trim());const m=new Date(a);if(m===void 0||isNaN(m.getTime())||m.getFullYear()<-1e4||m.getFullYear()>1e4)throw new Error("Invalid date:"+a);return m}},"getStartDate"),te=u(function(t){const i=/^(\d+(?:\.\d+)?)([Mdhmswy]|ms)$/.exec(t.trim());return i!==null?[Number.parseFloat(i[1]),i[2]]:[NaN,"ms"]},"parseDuration"),ee=u(function(t,i,a,s=!1){a=a.trim();const r=/^until\s+(?<ids>[\d\w- ]+)/.exec(a);if(r!==null){let F=null;for(const Y of r.groups.ids.split(" ")){let $=et(Y);$!==void 0&&(!F||$.startTime<F.startTime)&&(F=$)}if(F)return F.startTime;const I=new Date;return I.setHours(0,0,0,0),I}let m=(0,O.default)(a,i.trim(),!0);if(m.isValid())return s&&(m=m.add(1,"d")),m.toDate();let x=(0,O.default)(t);const[V,N]=te(a);if(!Number.isNaN(V)){const F=x.add(V,N);F.isValid()&&(x=F)}return x.toDate()},"getEndDate"),mt=0,rt=u(function(t){return t===void 0?(mt=mt+1,"task"+mt):t},"parseId"),ps=u(function(t,i){let a;i.substr(0,1)===":"?a=i.substr(1,i.length):a=i;const s=a.split(","),r={};Wt(s,r,Kt);for(let x=0;x<s.length;x++)s[x]=s[x].trim();let m="";switch(s.length){case 1:r.id=rt(),r.startTime=t.endTime,m=s[0];break;case 2:r.id=rt(),r.startTime=Ct(void 0,H,s[0]),m=s[1];break;case 3:r.id=rt(s[0]),r.startTime=Ct(void 0,H,s[1]),m=s[2];break;default:}return m&&(r.endTime=ee(r.startTime,H,m,ut),r.manualEndTime=(0,O.default)(m,"YYYY-MM-DD",!0).isValid(),Qt(r,H,lt,ct)),r},"compileData"),vs=u(function(t,i){let a;i.substr(0,1)===":"?a=i.substr(1,i.length):a=i;const s=a.split(","),r={};Wt(s,r,Kt);for(let m=0;m<s.length;m++)s[m]=s[m].trim();switch(s.length){case 1:r.id=rt(),r.startTime={type:"prevTaskEnd",id:t},r.endTime={data:s[0]};break;case 2:r.id=rt(),r.startTime={type:"getStartDate",startData:s[0]},r.endTime={data:s[1]};break;case 3:r.id=rt(s[0]),r.startTime={type:"getStartDate",startData:s[1]},r.endTime={data:s[2]};break;default:}return r},"parseData"),Et,kt,A=[],se={},Ts=u(function(t,i){const a={section:at,type:at,processed:!1,manualEndTime:!1,renderEndTime:null,raw:{data:i},task:t,classes:[]},s=vs(kt,i);a.raw.startTime=s.startTime,a.raw.endTime=s.endTime,a.id=s.id,a.prevTaskId=kt,a.active=s.active,a.done=s.done,a.crit=s.crit,a.milestone=s.milestone,a.vert=s.vert,a.order=St,St++;const r=A.push(a);kt=a.id,se[a.id]=r-1},"addTask"),et=u(function(t){const i=se[t];return A[i]},"findTaskById"),xs=u(function(t,i){const a={section:at,type:at,description:t,task:t,classes:[]},s=ps(Et,i);a.startTime=s.startTime,a.endTime=s.endTime,a.id=s.id,a.active=s.active,a.done=s.done,a.crit=s.crit,a.milestone=s.milestone,a.vert=s.vert,Et=a,yt.push(a)},"addTaskOrg"),Gt=u(function(){const t=u(function(a){const s=A[a];let r="";switch(A[a].raw.startTime.type){case"prevTaskEnd":s.startTime=et(s.prevTaskId).endTime;break;case"getStartDate":r=Ct(void 0,H,A[a].raw.startTime.startData),r&&(A[a].startTime=r);break}return A[a].startTime&&(A[a].endTime=ee(A[a].startTime,H,A[a].raw.endTime.data,ut),A[a].endTime&&(A[a].processed=!0,A[a].manualEndTime=(0,O.default)(A[a].raw.endTime.data,"YYYY-MM-DD",!0).isValid(),Qt(A[a],H,lt,ct))),A[a].processed},"compileTask");let i=!0;for(const[a,s]of A.entries())t(a),i=i&&s.processed;return i},"compileTasks"),bs=u(function(t,i){let a=i;nt().securityLevel!=="loose"&&(a=(0,We.sanitizeUrl)(i)),t.split(",").forEach(function(s){et(s)!==void 0&&(ne(s,()=>{window.open(a,"_self")}),Ft.set(s,a))}),ie(t,"clickable")},"setLink"),ie=u(function(t,i){t.split(",").forEach(function(a){let s=et(a);s!==void 0&&s.classes.push(i)})},"setClass"),_s=u(function(t,i,a){if(nt().securityLevel!=="loose"||i===void 0)return;let s=[];if(typeof a=="string"){s=a.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);for(let r=0;r<s.length;r++){let m=s[r].trim();m.startsWith('"')&&m.endsWith('"')&&(m=m.substr(1,m.length-2)),s[r]=m}}s.length===0&&s.push(t),et(t)!==void 0&&ne(t,()=>{Ye.runFunc(i,...s)})},"setClickFun"),ne=u(function(t,i){Ot.push(function(){const a=it?`${it}-${t}`:t,s=document.querySelector(`[id="${a}"]`);s!==null&&s.addEventListener("click",function(){i()})},function(){const a=it?`${it}-${t}`:t,s=document.querySelector(`[id="${a}-text"]`);s!==null&&s.addEventListener("click",function(){i()})})},"pushFun"),ws={getConfig:u(()=>nt().gantt,"getConfig"),clear:qe,setDateFormat:Ze,getDateFormat:rs,enableInclusiveEndDates:Qe,endDatesAreInclusive:ts,enableTopAxis:es,topAxisEnabled:ss,setAxisFormat:je,getAxisFormat:Xe,setTickInterval:Ue,getTickInterval:Ge,setTodayMarker:Je,getTodayMarker:Ke,setAccTitle:Ee,getAccTitle:$e,setDiagramTitle:Ie,getDiagramTitle:Ce,setDiagramId:He,setDisplayMode:is,getDisplayMode:ns,setAccDescription:Se,getAccDescription:Me,addSection:ds,getSections:fs,getTasks:hs,addTask:Ts,findTaskById:et,addTaskOrg:xs,setIncludes:as,getIncludes:os,setExcludes:cs,getExcludes:ls,setClickEvent:u(function(t,i,a){t.split(",").forEach(function(s){_s(s,i,a)}),ie(t,"clickable")},"setClickEvent"),setLink:bs,getLinks:us,bindFunctions:u(function(t){Ot.forEach(function(i){i(t)})},"bindFunctions"),parseDuration:te,isInvalidDate:Zt,setWeekday:ms,getWeekday:ks,setWeekend:ys};function Wt(t,i,a){let s=!0;for(;s;)s=!1,a.forEach(function(r){const m="^\\s*"+r+"\\s*$",x=new RegExp(m);t[0].match(x)&&(i[r]=!0,t.shift(1),s=!0)})}u(Wt,"getTaskTags");O.default.extend(Be.default);var Ds=u(function(){tt.debug("Something is calling, setConf, remove the call")},"setConf"),Jt={monday:he,tuesday:ke,wednesday:ve,thursday:me,friday:xe,saturday:ge,sunday:_e},Ss=u((t,i)=>{let a=[...t].map(()=>-1/0),s=[...t].sort((m,x)=>m.startTime-x.startTime||m.order-x.order),r=0;for(const m of s)for(let x=0;x<a.length;x++)if(m.startTime>=a[x]){a[x]=m.endTime,m.order=x+i,x>r&&(r=x);break}return r},"getMaxIntersections"),U,wt=1e4,Os={parser:ze,db:ws,renderer:{setConf:Ds,draw:u(function(t,i,a,s){const r=nt().gantt;s.db.setDiagramId(i);const m=nt().securityLevel;let x;m==="sandbox"&&(x=ht("#i"+i));const V=m==="sandbox"?ht(x.nodes()[0].contentDocument.body):ht("body"),N=m==="sandbox"?x.nodes()[0].contentDocument:document,F=N.getElementById(i);U=F.parentElement.offsetWidth,U===void 0&&(U=1200),r.useWidth!==void 0&&(U=r.useWidth);const I=s.db.getTasks();let Y=[];for(const h of I)Y.push(h.type);Y=k(Y);const $={};let P=2*r.topPadding;if(s.db.getDisplayMode()==="compact"||r.displayMode==="compact"){const h={};for(const g of I)h[g.section]===void 0?h[g.section]=[g]:h[g.section].push(g);let p=0;for(const g of Object.keys(h)){const o=Ss(h[g],p)+1;p+=o,P+=o*(r.barHeight+r.barGap),$[g]=o}}else{P+=I.length*(r.barHeight+r.barGap);for(const h of Y)$[h]=I.filter(p=>p.type===h).length}F.setAttribute("viewBox","0 0 "+U+" "+P);const L=V.select(`[id="${i}"]`),_=ye().domain([de(I,function(h){return h.startTime}),ue(I,function(h){return h.endTime})]).rangeRound([0,U-r.leftPadding-r.rightPadding]);function G(h,p){const g=h.startTime,o=p.startTime;let l=0;return g>o?l=1:g<o&&(l=-1),l}u(G,"taskCompare"),I.sort(G),R(I,U,P),Fe(L,P,U,r.useMaxWidth),L.append("text").text(s.db.getDiagramTitle()).attr("x",U/2).attr("y",r.titleTopMargin).attr("class","titleText");function R(h,p,g){const o=r.barHeight,l=o+r.barGap,y=r.topPadding,f=r.leftPadding,d=le().domain([0,Y.length]).range(["#00B9FA","#F95002"]).interpolate(De);B(l,y,f,p,g,h,s.db.getExcludes(),s.db.getIncludes()),J(f,y,p,g),K(h,l,y,f,o,d,p,g),D(l,y,f,o,d),v(f,y,p,g)}u(R,"makeGantt");function K(h,p,g,o,l,y,f){h.sort((c,n)=>c.vert===n.vert?0:c.vert?1:-1);const d=[...new Set(h.map(c=>c.order))].map(c=>h.find(n=>n.order===c));L.append("g").selectAll("rect").data(d).enter().append("rect").attr("x",0).attr("y",function(c,n){return n=c.order,n*p+g-2}).attr("width",function(){return f-r.rightPadding/2}).attr("height",p).attr("class",function(c){for(const[n,w]of Y.entries())if(c.type===w)return"section section"+n%r.numberSectionStyles;return"section section0"}).enter();const T=L.append("g").selectAll("rect").data(h).enter(),e=s.db.getLinks();if(T.append("rect").attr("id",function(c){return i+"-"+c.id}).attr("rx",3).attr("ry",3).attr("x",function(c){return c.milestone?_(c.startTime)+o+.5*(_(c.endTime)-_(c.startTime))-.5*l:_(c.startTime)+o}).attr("y",function(c,n){return n=c.order,c.vert?r.gridLineStartPadding:n*p+g}).attr("width",function(c){return c.milestone?l:c.vert?.08*l:_(c.renderEndTime||c.endTime)-_(c.startTime)}).attr("height",function(c){return c.vert?I.length*(r.barHeight+r.barGap)+r.barHeight*2:l}).attr("transform-origin",function(c,n){return n=c.order,(_(c.startTime)+o+.5*(_(c.endTime)-_(c.startTime))).toString()+"px "+(n*p+g+.5*l).toString()+"px"}).attr("class",function(c){const n="task";let w="";c.classes.length>0&&(w=c.classes.join(" "));let S=0;for(const[C,E]of Y.entries())c.type===E&&(S=C%r.numberSectionStyles);let b="";return c.active?c.crit?b+=" activeCrit":b=" active":c.done?c.crit?b=" doneCrit":b=" done":c.crit&&(b+=" crit"),b.length===0&&(b=" task"),c.milestone&&(b=" milestone "+b),c.vert&&(b=" vert "+b),b+=S,b+=" "+w,n+b}),T.append("text").attr("id",function(c){return i+"-"+c.id+"-text"}).text(function(c){return c.task}).attr("font-size",r.fontSize).attr("x",function(c){let n=_(c.startTime),w=_(c.renderEndTime||c.endTime);if(c.milestone&&(n+=.5*(_(c.endTime)-_(c.startTime))-.5*l,w=n+l),c.vert)return _(c.startTime)+o;const S=this.getBBox().width;return S>w-n?w+S+1.5*r.leftPadding>f?n+o-5:w+o+5:(w-n)/2+n+o}).attr("y",function(c,n){return c.vert?r.gridLineStartPadding+I.length*(r.barHeight+r.barGap)+60:(n=c.order,n*p+r.barHeight/2+(r.fontSize/2-2)+g)}).attr("text-height",l).attr("class",function(c){const n=_(c.startTime);let w=_(c.endTime);c.milestone&&(w=n+l);const S=this.getBBox().width;let b="";c.classes.length>0&&(b=c.classes.join(" "));let C=0;for(const[pt,M]of Y.entries())c.type===M&&(C=pt%r.numberSectionStyles);let E="";return c.active&&(c.crit?E="activeCritText"+C:E="activeText"+C),c.done?c.crit?E=E+" doneCritText"+C:E=E+" doneText"+C:c.crit&&(E=E+" critText"+C),c.milestone&&(E+=" milestoneText"),c.vert&&(E+=" vertText"),S>w-n?w+S+1.5*r.leftPadding>f?b+" taskTextOutsideLeft taskTextOutside"+C+" "+E:b+" taskTextOutsideRight taskTextOutside"+C+" "+E+" width-"+S:b+" taskText taskText"+C+" "+E+" width-"+S}),nt().securityLevel==="sandbox"){let c;c=ht("#i"+i);const n=c.nodes()[0].contentDocument;T.filter(function(w){return e.has(w.id)}).each(function(w){var S=n.querySelector("#"+CSS.escape(i+"-"+w.id)),b=n.querySelector("#"+CSS.escape(i+"-"+w.id+"-text"));const C=S.parentNode;var E=n.createElement("a");E.setAttribute("xlink:href",e.get(w.id)),E.setAttribute("target","_top"),C.appendChild(E),E.appendChild(S),E.appendChild(b)})}}u(K,"drawRects");function B(h,p,g,o,l,y,f,d){if(f.length===0&&d.length===0)return;let T,e;for(const{startTime:b,endTime:C}of y)(T===void 0||b<T)&&(T=b),(e===void 0||C>e)&&(e=C);if(!T||!e)return;if((0,O.default)(e).diff((0,O.default)(T),"year")>5){tt.warn("The difference between the min and max time is more than 5 years. This will cause performance issues. Skipping drawing exclude days.");return}const c=s.db.getDateFormat(),n=[];let w=null,S=(0,O.default)(T);for(;S.valueOf()<=e;)s.db.isInvalidDate(S,c,f,d)?w?w.end=S:w={start:S,end:S}:w&&(n.push(w),w=null),S=S.add(1,"d");L.append("g").selectAll("rect").data(n).enter().append("rect").attr("id",b=>i+"-exclude-"+b.start.format("YYYY-MM-DD")).attr("x",b=>_(b.start.startOf("day"))+g).attr("y",r.gridLineStartPadding).attr("width",b=>_(b.end.endOf("day"))-_(b.start.startOf("day"))).attr("height",l-p-r.gridLineStartPadding).attr("transform-origin",function(b,C){return(_(b.start)+g+.5*(_(b.end)-_(b.start))).toString()+"px "+(C*h+.5*l).toString()+"px"}).attr("class","exclude-range")}u(B,"drawExcludeDays");function j(h,p,g,o){if(g<=0||h>p)return 1/0;const l=p-h,y=O.default.duration({[o??"day"]:g}).asMilliseconds();return y<=0?1/0:Math.ceil(l/y)}u(j,"getEstimatedTickCount");function J(h,p,g,o){const l=s.db.getDateFormat(),y=s.db.getAxisFormat();let f;y?f=y:l==="D"?f="%d":f=r.axisFormat??"%Y-%m-%d";let d=fe(_).tickSize(-o+p+r.gridLineStartPadding).tickFormat(Bt(f));const T=/^([1-9]\d*)(millisecond|second|minute|hour|day|week|month)$/.exec(s.db.getTickInterval()||r.tickInterval);if(T!==null){const e=parseInt(T[1],10);if(isNaN(e)||e<=0)tt.warn(`Invalid tick interval value: "${T[1]}". Skipping custom tick interval.`);else{const c=T[2],n=s.db.getWeekday()||r.weekday,w=_.domain(),S=w[0],b=w[1],C=j(S,b,e,c);if(C>wt)tt.warn(`The tick interval "${e}${c}" would generate ${C} ticks, which exceeds the maximum allowed (${wt}). This may indicate an invalid date or time range. Skipping custom tick interval.`);else switch(c){case"millisecond":d.ticks(Xt.every(e));break;case"second":d.ticks(Rt.every(e));break;case"minute":d.ticks(zt.every(e));break;case"hour":d.ticks(qt.every(e));break;case"day":d.ticks(Ht.every(e));break;case"week":d.ticks(Jt[n].every(e));break;case"month":d.ticks(jt.every(e));break}}}if(L.append("g").attr("class","grid").attr("transform","translate("+h+", "+(o-50)+")").call(d).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10).attr("dy","1em"),s.db.topAxisEnabled()||r.topAxis){let e=we(_).tickSize(-o+p+r.gridLineStartPadding).tickFormat(Bt(f));if(T!==null){const c=parseInt(T[1],10);if(isNaN(c)||c<=0)tt.warn(`Invalid tick interval value: "${T[1]}". Skipping custom tick interval.`);else{const n=T[2],w=s.db.getWeekday()||r.weekday,S=_.domain(),b=S[0],C=S[1];if(j(b,C,c,n)<=wt)switch(n){case"millisecond":e.ticks(Xt.every(c));break;case"second":e.ticks(Rt.every(c));break;case"minute":e.ticks(zt.every(c));break;case"hour":e.ticks(qt.every(c));break;case"day":e.ticks(Ht.every(c));break;case"week":e.ticks(Jt[w].every(c));break;case"month":e.ticks(jt.every(c));break}}}L.append("g").attr("class","grid").attr("transform","translate("+h+", "+p+")").call(e).selectAll("text").style("text-anchor","middle").attr("fill","#000").attr("stroke","none").attr("font-size",10)}}u(J,"makeGrid");function D(h,p){let g=0;const o=Object.keys($).map(l=>[l,$[l]]);L.append("g").selectAll("text").data(o).enter().append(function(l){const y=l[0].split(Le.lineBreakRegex),f=-(y.length-1)/2,d=N.createElementNS("http://www.w3.org/2000/svg","text");d.setAttribute("dy",f+"em");for(const[T,e]of y.entries()){const c=N.createElementNS("http://www.w3.org/2000/svg","tspan");c.setAttribute("alignment-baseline","central"),c.setAttribute("x","10"),T>0&&c.setAttribute("dy","1em"),c.textContent=e,d.appendChild(c)}return d}).attr("x",10).attr("y",function(l,y){if(y>0)for(let f=0;f<y;f++)return g+=o[y-1][1],l[1]*h/2+g*h+p;else return l[1]*h/2+p}).attr("font-size",r.sectionFontSize).attr("class",function(l){for(const[y,f]of Y.entries())if(l[0]===f)return"sectionTitle sectionTitle"+y%r.numberSectionStyles;return"sectionTitle"})}u(D,"vertLabels");function v(h,p,g,o){const l=s.db.getTodayMarker();if(l==="off")return;const y=L.append("g").attr("class","today"),f=new Date,d=y.append("line");d.attr("x1",_(f)+h).attr("x2",_(f)+h).attr("y1",r.titleTopMargin).attr("y2",o-r.titleTopMargin).attr("class","today"),l!==""&&d.attr("style",l.replace(/,/g,";"))}u(v,"drawToday");function k(h){const p={},g=[];for(let o=0,l=h.length;o<l;++o)Object.prototype.hasOwnProperty.call(p,h[o])||(p[h[o]]=!0,g.push(h[o]));return g}u(k,"checkUnique")},"draw")},styles:u(t=>`
  .mermaid-main-font {
        font-family: ${t.fontFamily};
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
    font-family: ${t.fontFamily};
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
    font-family: ${t.fontFamily};
  }

  .taskTextOutsideRight {
    fill: ${t.taskTextDarkColor};
    text-anchor: start;
    font-family: ${t.fontFamily};
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

  /* Done task text displayed outside the bar sits against the diagram background,
     not against the done-task bar, so it must use the outside/contrast color. */
  .doneText0.taskTextOutsideLeft,
  .doneText0.taskTextOutsideRight,
  .doneText1.taskTextOutsideLeft,
  .doneText1.taskTextOutsideRight,
  .doneText2.taskTextOutsideLeft,
  .doneText2.taskTextOutsideRight,
  .doneText3.taskTextOutsideLeft,
  .doneText3.taskTextOutsideRight {
    fill: ${t.taskTextOutsideColor} !important;
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

  /* Done-crit task text outside the bar — same reasoning as doneText above. */
  .doneCritText0.taskTextOutsideLeft,
  .doneCritText0.taskTextOutsideRight,
  .doneCritText1.taskTextOutsideLeft,
  .doneCritText1.taskTextOutsideRight,
  .doneCritText2.taskTextOutsideLeft,
  .doneCritText2.taskTextOutsideRight,
  .doneCritText3.taskTextOutsideLeft,
  .doneCritText3.taskTextOutsideRight {
    fill: ${t.taskTextOutsideColor} !important;
  }

  .vert {
    stroke: ${t.vertLineColor};
  }

  .vertText {
    font-size: 15px;
    text-anchor: middle;
    fill: ${t.vertLineColor} !important;
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
    font-family: ${t.fontFamily};
  }
`,"getStyles")};export{Os as diagram};
