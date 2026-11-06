import{t as C}from"./mermaid-parser.core-BJJXvYC7.js";import{n as b,r as u}from"./chunk-AGHRB4JF-CAZMR7zq.js";import{B as $,C as S,V as D,W as T,_ as P,a as z,c as E,d as F,v as A,y as W}from"./chunk-ICPOFSXX-DopV1dwE.js";import{t as _}from"./chunk-426QAEUC-Dq1fspzx.js";import{r as w}from"./chunk-5PVQY5BW-I8kJyHeI.js";import{t as N}from"./chunk-4BX2VUAB-Bh-gg1C9.js";var m,L=F.packet,v=(m=class{constructor(){this.packet=[],this.setAccTitle=D,this.getAccTitle=A,this.setDiagramTitle=T,this.getDiagramTitle=S,this.getAccDescription=P,this.setAccDescription=$}getConfig(){const t=w({...L,...W().packet});return t.showBits&&(t.paddingY+=10),t}getPacket(){return this.packet}pushWord(t){t.length>0&&this.packet.push(t)}clear(){z(),this.packet=[]}},b(m,"PacketDB"),m),M=1e4,Y=b((t,e)=>{N(t,e);let r=-1,o=[],n=1;const{bitsPerRow:l}=e.getConfig();for(let{start:a,end:i,bits:d,label:c}of t.blocks){if(a!==void 0&&i!==void 0&&i<a)throw new Error(`Packet block ${a} - ${i} is invalid. End must be greater than start.`);if(a??=r+1,a!==r+1)throw new Error(`Packet block ${a} - ${i??a} is not contiguous. It should start from ${r+1}.`);if(d===0)throw new Error(`Packet block ${a} is invalid. Cannot have a zero bit field.`);for(i??=a+(d??1)-1,d??=i-a+1,r=i,u.debug(`Packet block ${a} - ${r} with label ${c}`);o.length<=l+1&&e.getPacket().length<M;){const[p,s]=I({start:a,end:i,bits:d,label:c},n,l);if(o.push(p),p.end+1===n*l&&(e.pushWord(o),o=[],n++),!s)break;({start:a,end:i,bits:d,label:c}=s)}}e.pushWord(o)},"populate"),I=b((t,e,r)=>{if(t.start===void 0)throw new Error("start should have been set during first phase");if(t.end===void 0)throw new Error("end should have been set during first phase");if(t.start>t.end)throw new Error(`Block start ${t.start} is greater than block end ${t.end}.`);if(t.end+1<=e*r)return[t,void 0];const o=e*r-1,n=e*r;return[{start:t.start,end:o,label:t.label,bits:o-t.start},{start:n,end:t.end,label:t.label,bits:t.end-n}]},"getNextFittingBlock"),x={parser:{yy:void 0},parse:b(async t=>{const e=await C("packet",t),r=x.parser?.yy;if(!(r instanceof v))throw new Error("parser.parser?.yy was not a PacketDB. This is due to a bug within Mermaid, please report this issue at https://github.com/mermaid-js/mermaid/issues.");u.debug(e),Y(e,r)},"parse")},O=b((t,e,r,o)=>{const n=o.db,l=n.getConfig(),{rowHeight:a,paddingY:i,bitWidth:d,bitsPerRow:c}=l,p=n.getPacket(),s=n.getDiagramTitle(),h=a+i,g=h*(p.length+1)-(s?0:a),f=d*c+2,k=_(e);k.attr("viewBox",`0 0 ${f} ${g}`),E(k,g,f,l.useMaxWidth);for(const[y,B]of p.entries())j(k,B,y,l);k.append("text").text(s).attr("x",f/2).attr("y",g-h/2).attr("dominant-baseline","middle").attr("text-anchor","middle").attr("class","packetTitle")},"draw"),j=b((t,e,r,{rowHeight:o,paddingX:n,paddingY:l,bitWidth:a,bitsPerRow:i,showBits:d})=>{const c=t.append("g"),p=r*(o+l)+l;for(const s of e){const h=s.start%i*a+1,g=(s.end-s.start+1)*a-n;if(c.append("rect").attr("x",h).attr("y",p).attr("width",g).attr("height",o).attr("class","packetBlock"),c.append("text").attr("x",h+g/2).attr("y",p+o/2).attr("class","packetLabel").attr("dominant-baseline","middle").attr("text-anchor","middle").text(s.label),!d)continue;const f=s.end===s.start,k=p-2;c.append("text").attr("x",h+(f?g/2:0)).attr("y",k).attr("class","packetByte start").attr("dominant-baseline","auto").attr("text-anchor",f?"middle":"start").text(s.start),f||c.append("text").attr("x",h+g).attr("y",k).attr("class","packetByte end").attr("dominant-baseline","auto").attr("text-anchor","end").text(s.end)}},"drawWord"),G={draw:O},H={byteFontSize:"10px",startByteColor:"black",endByteColor:"black",labelColor:"black",labelFontSize:"12px",titleColor:"black",titleFontSize:"14px",blockStrokeColor:"black",blockStrokeWidth:"1",blockFillColor:"#efefef"},J={parser:x,get db(){return new v},renderer:G,styles:b(({packet:t}={})=>{const e=w(H,t);return`
	.packetByte {
		font-size: ${e.byteFontSize};
	}
	.packetByte.start {
		fill: ${e.startByteColor};
	}
	.packetByte.end {
		fill: ${e.endByteColor};
	}
	.packetLabel {
		fill: ${e.labelColor};
		font-size: ${e.labelFontSize};
	}
	.packetTitle {
		fill: ${e.titleColor};
		font-size: ${e.titleFontSize};
	}
	.packetBlock {
		stroke: ${e.blockStrokeColor};
		stroke-width: ${e.blockStrokeWidth};
		fill: ${e.blockFillColor};
	}
	`},"styles")};export{J as diagram};
