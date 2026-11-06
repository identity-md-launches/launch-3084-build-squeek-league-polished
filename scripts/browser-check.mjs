import { chromium, webkit } from 'playwright';
import { Interface, AbiCoder, id } from 'ethers';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { preview } from './preview.mjs';
import { measureContrast } from './contrast.mjs';

// Deterministic test-only fixtures. No sample players or rounds are bundled into the application.
const league = '0xaDEA9907bAA30D7B54E7B9Eb6F6551B9A0088e08';
const core = '0xFD6C166D4B8E2962E65746a13e5a0797CD4dE0c4';
const deploy = 12079298;
const dayZero = Date.parse('2026-11-08T00:00:00Z') / 1000;
const source = await readFile('src/config.ts','utf8');
const { LEAGUE_ABI, CORE_ABI } = await import('../src/config.ts');
const li = new Interface(LEAGUE_ABI), ci = new Interface(CORE_ABI);
const log = (name,args,index) => ({ ...li.encodeEventLog(li.getEvent(name),args), address: league, blockNumber: '0x'+(deploy+4+index).toString(16), logIndex:'0x'+index.toString(16), transactionHash: '0x'+String(index+1).padStart(64,'0'), blockHash:'0x'+'41'.repeat(32), removed:false });
const empty = () => Array(24).fill(0);
const counts = empty(); counts[2]=3; counts[3]=4;
const fixtureLogs = [log('DaySettled',[0,empty()],0),log('DaySettled',[1,empty()],1),log('PicksLocked',[2,league,[2,3,4],false],2),log('PicksLocked',[2,core,[0,0,0],true],3),log('DaySettled',[2,counts],4),log('Scored',[2,league,38],5)];
const report = { engines: {}, checks: [], consoleErrors: [], resourceErrors: [], externalHosts: [], contrast: [] };
const hosts = new Set();
const check = (name) => { report.checks.push(name); console.log('PASS',name); };
const server = await preview();
await mkdir('test/scratch/interaction-shots',{recursive:true});
async function mock(context,{ mismatch=false, apiFailure=false, noApi=false, offline=false, wallet=false, network=11155111, next=3, frontier=1200, time='2026-11-11T12:00:00Z', alreadyScored=false }={}) {
  const sends=[];
  await context.addInitScript(({time,wallet,league,network}) => {
    const clock = new Date(time).valueOf(); const NativeDate=Date;
    window.Date=class extends NativeDate { constructor(...args){ super(...(args.length?args:[clock])); } static now(){return clock;} };
    if(wallet){
      window.__walletRequests=[];
      const listeners={};let chain=network;
      window.ethereum={on:(event,fn)=>(listeners[event]??=[]).push(fn),removeListener:()=>{},request:async ({method,params})=>{
        window.__walletRequests.push({method,params});
        if(method==='eth_requestAccounts'||method==='eth_accounts')return [league];
        if(method==='eth_chainId')return '0x'+chain.toString(16);
        if(method==='wallet_switchEthereumChain'){chain=11155111;listeners.chainChanged?.forEach(f=>f('0xaa36a7'));return null;}
        if(method==='eth_getBalance')return '0x0';
        if(method==='eth_blockNumber')return '0xb85100';
        if(method==='eth_estimateGas')return '0x2dc6c0';
        if(method==='eth_sendTransaction')throw {code:4001,message:'Test-only user rejection'};
        return null;
      }};
    }
  },{time,wallet,league,network});
  await context.route('https://**/*',async route=>{
    const req=route.request();const url=new URL(req.url());hosts.add(url.hostname);
    assert.ok(['api.squeekchain.com','ethereum-sepolia-rpc.publicnode.com','sepolia.gateway.tenderly.co'].includes(url.hostname),'Unexpected host: '+url.hostname);
    if(offline)return route.abort();
    if(url.hostname==='api.squeekchain.com'){
      if(apiFailure||noApi)return route.abort();
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(url.pathname.includes('/status')?{measurement:{freshness:'online',rpmMilli:0}}:{deployment:{components:{core:{address:mismatch?league:core}}}})});
    }
    const payload=req.postDataJSON();const requests=Array.isArray(payload)?payload:[payload];
    const responses=requests.map(p=>{
      let result;
      if(p.method==='eth_blockNumber')result='0x'+(deploy+50).toString(16);
      else if(p.method==='eth_getLogs'){
        assert.equal(url.hostname,'sepolia.gateway.tenderly.co');const q=p.params[0];const a=Number(q.fromBlock),b=Number(q.toBlock);assert.ok(b-a+1<=5000);assert.ok(a>=deploy);
        result=fixtureLogs.filter(l=>Number(l.blockNumber)>=a&&Number(l.blockNumber)<=b);
      }else if(p.method==='eth_call'){
        const q=p.params[0];
        if(q.to.toLowerCase()===core.toLowerCase()){
          if(q.data===id('state()').slice(0,10))result=AbiCoder.defaultAbiCoder().encode(['uint64'],[frontier]);
          else{
            const fn=ci.parseTransaction({data:q.data});const [a,b]=fn.args.map(Number);assert.ok(b-a<=16&&b<=frontier);
            // Pre-league activity and the seven certified active rounds in match 3.
            const active=[25,26,27,169,170,901,902,903,907,908,909,910].filter(r=>r>a&&r<=b);
            result=ci.encodeFunctionResult('roundPage',[[b,[0,0,0],[0,0,0],active.map(r=>[r,1,1,1,'0x'+'11'.repeat(32)])]]);
          }
        }else{
          const fn=li.parseTransaction({data:q.data});const args=fn.args;let values;
          switch(fn.name){
            case 'core':values=[core];break;
            case 'nextDayToSettle':values=[next];break;
            case 'lockWindow':values=[dayZero+(Number(args[0])-1)*86400+1200,dayZero+Number(args[0])*86400-600];break;
            case 'dayStartTime':values=[dayZero+Number(args[0])*86400];break;
            case 'sleepPoints':values=[25];break;
            case 'streamId':values=['0x'+'22'.repeat(32)];break;
            case 'isSettled':values=[Number(args[0])<next];break;
            case 'botDraft':assert.ok(Number(args[0])>=2,'bot preview must be hidden before day 2');values=[[2,3,4],false];break;
            case 'slotCounts':values=[Number(args[0])===2?counts:empty()];break;
            case 'pickOf':{
              const locked=Number(args[0])===2;
              const sleep=args[1].toLowerCase()===core.toLowerCase();
              values=[locked,sleep,locked&&(!sleep||alreadyScored),...(sleep?[0,0,0]:[2,3,4])];break;
            }
            case 'seasonPoints':values=[args[1].toLowerCase()===league.toLowerCase()?38:0];break;
            case 'botPoints':values=[38];break;
            case 'topScore':values=[38];break;
            case 'leaders':values=[[league]];break;
            case 'pendingPicks':values=[alreadyScored?0:1];break;
            case 'crowned':values=[false];break;
            default:throw new Error('Unhandled fixture read: '+fn.name);
          }
          result=li.encodeFunctionResult(fn.name,values);
        }
      }else if(p.method==='eth_sendTransaction'){sends.push(p);throw new Error('Test transport must not broadcast');}
      else throw new Error('Unhandled fixture method: '+p.method);
      return {jsonrpc:'2.0',id:p.id,result};
    });
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(Array.isArray(payload)?responses:responses[0])});
  });
  return sends;
}
async function fresh(browser,settings={}){
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Australia/Sydney',colorScheme:'light',acceptDownloads:true});
  await mock(context,settings);const page=await context.newPage();
  page.on('pageerror',e=>report.consoleErrors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(server.url)&&r.status()>=400)report.resourceErrors.push(r.url());});
  await page.goto(server.url);return {context,page};
}
async function run(engine,name){
 let browser;
 try{browser=await engine.launch({headless:true,args:name==='chromium'?['--no-sandbox']:[]});report.engines[name]='Launched';}
 catch(e){report.engines[name]='Unavailable: '+e.message.slice(0,900);console.log(name,report.engines[name]);return;}
 try{
  {
   const {context,page}=await fresh(browser);
   await page.getByText('Draft open',{exact:true}).waitFor();
   const action=page.getByRole('button',{name:'Lock my picks',exact:true});
   assert.ok((await action.boundingBox()).y+(await action.boundingBox()).height<=844,'Primary action must be on first screen');
   for(const h of [2,3,4])await page.locator(`[data-picker="draft"][data-hour="${h}"]`).click();
   assert.equal(await page.locator('[data-picker="draft"][aria-pressed="true"]').count(),3);
   await page.locator('[data-picker="draft"][data-hour="5"]').click();assert.equal(await page.locator('[data-picker="draft"][aria-pressed="true"]').count(),3);
   await action.click();await page.getByRole('dialog',{name:'Connect a wallet'}).waitFor();
   await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
   assert.equal(await action.evaluate(el=>el===document.activeElement),true,'Dialog restores focus to lock button');
   check(`${name}: three-tap selection, fourth-slot guard, lock opens wallet dialog, Escape closes`);
   await page.reload();await page.getByText('Draft open',{exact:true}).waitFor();assert.equal(await page.locator('[data-picker="draft"][aria-pressed="true"]').count(),3);
   check(`${name}: unsigned draft survives reload`);
   await page.getByRole('button',{name:'Switch to dark theme'}).click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
   const contrast=await measureContrast(page);report.contrast.push({engine:name,screen:'selected-draft-dark',...contrast});assert.equal(contrast.failed.length,0,JSON.stringify(contrast.failed));
   await page.screenshot({path:`test/scratch/interaction-shots/${name}-390-dark.png`,fullPage:true});
   await page.getByRole('button',{name:'Switch to light theme'}).click();
   const lightContrast=await measureContrast(page);report.contrast.push({engine:name,screen:'selected-draft-light',...lightContrast});assert.equal(lightContrast.failed.length,0,JSON.stringify(lightContrast.failed));
   await page.screenshot({path:`test/scratch/interaction-shots/${name}-390-draft.png`,fullPage:true});
   for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow at ${width}`);}
   await page.screenshot({path:`test/scratch/interaction-shots/${name}-1440-draft.png`,fullPage:true});
   check(`${name}: light/dark themes and no overflow at 320, 390, 768, 1440`);
   await page.setViewportSize({width:390,height:844});
   await page.getByRole('button',{name:'Clear',exact:true}).click();
   await page.locator('[data-picker="draft"][data-hour="0"]').focus();
   await page.keyboard.press('Space'); await page.keyboard.press('Tab'); await page.keyboard.press('Space'); await page.keyboard.press('Tab'); await page.keyboard.press('Space');
   assert.equal(await page.locator('[data-picker="draft"][aria-pressed="true"]').count(),3,'Keyboard can select three hours');
   for(let n=0;n<24;n++) await page.keyboard.press('Tab');
   assert.equal(await action.evaluate(el=>el===document.activeElement),true,'Tab order reaches lock after hours, Sleep and Clear');
   await page.keyboard.press('Enter'); await page.getByRole('dialog',{name:'Connect a wallet'}).waitFor();
   await page.keyboard.press('Tab');
   assert.equal(await page.locator('dialog[open]').evaluate(el=>el.contains(document.activeElement)),true,'Modal contains keyboard focus');
   await page.keyboard.press('Escape');
   assert.equal(await action.evaluate(el=>el===document.activeElement&&getComputedStyle(el).outlineStyle!=='none'),true,'Keyboard focus returns visibly to lock');
   await page.screenshot({path:`test/scratch/interaction-shots/${name}-keyboard-focus.png`,fullPage:true});
   assert.equal(await page.evaluate(()=>document.fonts.check('16px "DM Sans"')&&document.fonts.check('28px "Pixelify Sans"')),true,'Local fonts loaded');
   await page.getByRole('link',{name:'What-if',exact:true}).click();
   for(const h of [0,1,2])await page.locator(`[data-picker="backtest"][data-hour="${h}"]`).click();
   await page.locator('.result-row').first().waitFor();assert.ok(await page.locator('.result-row').count()>=6);
   const prior=await page.locator('.result-points strong').allTextContents();
   await page.getByRole('button',{name:'Sleep call',exact:true}).click();const sleepScores=await page.locator('.result-points strong').allTextContents();assert.notDeepEqual(prior,sleepScores);
   await page.getByRole('button',{name:/Share what-if result/}).first().click();await page.getByRole('dialog',{name:'Share your result'}).waitFor();
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download',exact:true}).click();const downloaded=await download;assert.ok(downloaded.suggestedFilename().endsWith('.png'));
   await page.keyboard.press('Escape');check(`${name}: wallet-free backtest, Sleep recalculation, share card and PNG download`);
   await page.getByRole('link',{name:'Activity',exact:true}).click();await page.locator('.heat-cell').first().waitFor();
   const before=await page.locator('.heatmap-row').count();await page.getByLabel('Completed days only').check();assert.ok(await page.locator('.heatmap-row').count()<before);
   await page.locator('.heat-cell:not([disabled])').first().click();assert.ok((await page.locator('.heatmap-footer').innerText()).includes('active of 6 rounds'));
   const csv=page.waitForEvent('download');await page.getByRole('button',{name:'Export CSV'}).click();assert.ok((await csv).suggestedFilename().endsWith('.csv'));
   check(`${name}: all-history heatmap filter, exact cell details and CSV export`);
   await page.goto(server.url+'#replay/2');await page.locator('.replay-hour').first().waitFor();await page.locator('.round-active').first().waitFor();
   assert.equal(await page.locator('.replay-hour').count(),24);assert.equal(await page.locator('.rounds-six span').count(),144);
   assert.ok((await page.locator('.replay-players').innerText()).includes('38'));assert.ok((await page.locator('.replay-players').innerText()).includes('Sleep call'));
   await page.screenshot({path:`test/scratch/interaction-shots/${name}-390-replay.png`,fullPage:true});
   await page.locator('.address-details>summary').first().click();
   assert.equal(await page.locator('.address-details[open]>.full-address').innerText(),league,'Full address expands in the row');
   assert.ok(await page.locator('.address-details[open]>.full-address').isVisible());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Address disclosure does not widen page');
   await page.screenshot({path:`test/scratch/interaction-shots/${name}-address-open.png`,fullPage:true});
   await page.locator('.address-details>summary').first().click();
   check(`${name}: settled replay deep link, 144 rounds, public picks, scored player and House Bot`);
   await page.getByRole('link',{name:'League',exact:true}).click();await page.locator('.leaderboard').waitFor();
   assert.ok((await page.locator('.leaderboard').innerText()).includes('38'));
   await page.getByRole('button',{name:'Score picks',exact:true}).click();await page.locator('.batch-preview').waitFor();
   assert.equal(await page.locator('.batch-preview li').count(),1);assert.ok((await page.locator('.batch-preview').innerText()).includes(core));
   check(`${name}: contract standings and score batch filters already-scored player`);
   for(const screen of ['activity','backtest','replay/2','standings','rules']) {
    await page.goto(server.url+'#'+screen);
    for(const width of [320,390,768,1440]) { await page.setViewportSize({width,height:900}); await page.waitForTimeout(70); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow on ${screen} at ${width}`); }
   }
   check(`${name}: all six screens reflow without page overflow at 320, 390, 768, 1440`);
   await page.getByRole('link',{name:'Read the rules'}).click();await page.getByRole('heading',{name:'A league of tiny paws.'}).waitFor();
   assert.ok((await page.locator('.rules-copy').innerText()).includes('not made by the Squeekchain team'));
   await context.close();
  }
  {
   const {context,page}=await fresh(browser,{mismatch:true});await page.locator('.redeploy-banner').waitFor();assert.ok(await page.getByRole('button',{name:'Lock my picks',exact:true}).isDisabled());
   check(`${name}: API/core mismatch displays exact full-width closure banner and disables locking`);await context.close();
  }
  {
   const {context,page}=await fresh(browser,{apiFailure:true});await page.getByText(/current Squeekchain deployment could not be checked/).waitFor();assert.ok(await page.getByRole('button',{name:'Lock my picks',exact:true}).isDisabled());
   await page.goto(server.url+'#replay/2');await page.locator('.replay-hour').first().waitFor();assert.equal(await page.locator('.replay-hour').count(),24);
   check(`${name}: API failure pauses locking; settled replay works from RPC alone`);await context.close();
  }
  {
   const {context,page}=await fresh(browser,{wallet:true,network:1});await page.getByRole('button',{name:'Connect',exact:true}).click();await page.getByRole('button',{name:'Browser wallet',exact:true}).click();
   await page.waitForFunction(()=>window.__walletRequests.some(r=>r.method==='wallet_switchEthereumChain'));
   await page.getByText('Draft open',{exact:true}).waitFor();for(const h of [2,3,4])await page.locator(`[data-picker="draft"][data-hour="${h}"]`).click();
   await page.getByRole('button',{name:'Lock my picks',exact:true}).click();await page.getByText(/Wallet request declined/).waitFor();
   const requests=await page.evaluate(()=>window.__walletRequests);const sent=requests.find(r=>r.method==='eth_sendTransaction');assert.ok(sent);assert.equal(sent.params[0].to.toLowerCase(),league.toLowerCase());
   assert.equal(sent.params[0].gas,'0x2dc6c0','Gas must be the wallet estimate');assert.equal(li.parseTransaction({data:sent.params[0].data}).name,'lockPicks');
   assert.ok(await page.locator('#main .faucets').isVisible());assert.equal(await page.locator('[data-picker="draft"][aria-pressed="true"]').count(),3);
   check(`${name}: injected connect, automatic Sepolia switch, wallet gas estimate, translated rejection, draft retained and faucet links`);await context.close();
  }
  {
   const {context,page}=await fresh(browser,{next:2});await page.getByText(/Waiting for Squeekchain to certify the previous day, or press Settle/).waitFor();assert.ok(await page.getByRole('button',{name:'Lock my picks',exact:true}).isDisabled());
   assert.equal(await page.locator('.bot-picks').count(),0);
   await page.getByRole('button',{name:/Settle day/}).click();await page.getByRole('dialog',{name:'Connect a wallet'}).waitFor();
   check(`${name}: certification/settlement waiting state, hidden premature bot pick, and Settle action`);await context.close();
  }
  report.engines[name]='Passed';
 }finally{await browser.close();}
}
try {
 assert.ok(source.includes('11155111'));
 await run(chromium,'chromium');await run(webkit,'webkit');
 assert.equal(report.consoleErrors.length,0,report.consoleErrors.join('\n'));assert.equal(report.resourceErrors.length,0,report.resourceErrors.join('\n'));
 report.externalHosts=[...hosts];await writeFile('test/scratch/browser-results.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}finally{await server.close();}
