// Solid-background text contrast audit for the rendered export. SVG artwork and disabled
// controls are excluded. This supplements, rather than claims, a full accessibility audit.
export async function measureContrast(page) {
 return page.evaluate(()=>{
  const rgba=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const v=m[1].split(/[ ,/]+/).filter(Boolean).map(Number);return [...v.slice(0,3),v[3]??1];};
  const over=(a,b)=>a.slice(0,3).map((n,i)=>n*a[3]+b[i]*(1-a[3])).concat(1);
  const luminance=c=>{const v=c.slice(0,3).map(n=>{n/=255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const failed=[];let measured=0;let minimum=100;let minimumPair;
  for(const el of document.querySelectorAll('body *')){
   const own=[...el.childNodes].filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' ').trim();
   if(!own||!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})||el.closest('svg,script,style,noscript,option,[disabled]'))continue;
   let partial=false;const layers=[];for(let p=el;p;p=p.parentElement){const s=getComputedStyle(p);if(Number(s.opacity)<1){partial=true;break;}if(s.backgroundImage!=='none'){partial=true;break;}const c=rgba(s.backgroundColor);if(c&&c[3]>0)layers.push(c);if(c?.[3]===1)break;}
   if(partial)continue;
   let bg=[255,255,255,1];for(const c of layers.reverse())bg=over(c,bg);
   const cs=getComputedStyle(el);let fg=rgba(cs.color);if(!fg)continue;fg=over(fg,bg);
   const lum=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);const ratio=(lum[0]+.05)/(lum[1]+.05);
   const large=parseFloat(cs.fontSize)>=24||(parseFloat(cs.fontSize)>=18.66&&Number(cs.fontWeight)>=700);const required=large?3:4.5;
   const info={text:own.slice(0,70),class:el.className,ratio:+ratio.toFixed(3),required,foreground:cs.color,background:bg};measured++;
   if(ratio<minimum){minimum=ratio;minimumPair=info;}
   if(ratio+.005<required)failed.push(info);
  }
  return {measured,minimumPair,failed};
 });
}
