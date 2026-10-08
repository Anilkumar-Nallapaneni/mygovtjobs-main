import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

// Read-only requests through the configured local rewrite and actual ASGI/Postgres API.
// The one explicitly labelled failure scenario injects a 503; successful data is never mocked.
const origin = process.env.STATE_UI_AUDIT_URL || 'http://127.0.0.1:3691';
const output = 'docs/audits/state-explorer-wiring-2026-10-08';
const api = JSON.parse(await readFile('docs/audits/state-api-verification-2026-10-08.json','utf8'));
await mkdir(output,{recursive:true});
const browser = await chromium.launch();
const results = [];
try {
  const page = await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});
  const optionalAnalyticsRequests=[];
  page.on('request',request=>{
    const url=request.url();
    if(url.includes('googletagmanager.com') || url.includes('/_vercel/insights/') || url.includes('/_vercel/speed-insights/')) optionalAnalyticsRequests.push(url);
  });
  for (const id of ['ap','ka','tn','up','dl','jk']) {
    const state = api.states.find(s=>s.state_id===id);
    for (const action of ['direct','refresh']) {
      const response = action === 'direct' ? await page.goto(`${origin}/india/${id}`) : await page.reload();
      assert.equal(response.status(),200);
      await page.locator('.state-explorer__fact-grid > div').filter({has:page.getByText('Verified districts',{exact:true})}).getByText(String(state.verified_district_count),{exact:true}).waitFor();
      await page.waitForFunction(count=>document.querySelectorAll('.state-explorer__district-card').length===count,state.verified_district_count);
      assert.equal(await page.getByText('Profile unavailable',{exact:true}).count(),0);
      assert.equal(await page.getByText('Unavailable',{exact:true}).count(),0);
      results.push({route:`/india/${id}`,action,status:response.status(),districts:state.verified_district_count});
    }
    await page.screenshot({path:`${output}/${id}-desktop.png`,fullPage:true});
  }
  for (const [width,height] of [[360,800],[390,844],[768,1024],[1024,768],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.goto(`${origin}/india`);
    await page.locator('.india-explorer__state-grid button').last().waitFor();
    await page.waitForFunction(()=>document.querySelector('.india-explorer__state-grid')?.textContent.includes('verified districts'));
    const dimensions = await page.evaluate(()=>{
      const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}};
      const list=document.querySelector('.india-explorer__state-grid');
      return {map:rect('.india-explorer__map-card'),panel:rect('.india-explorer__state-list'),list:rect('.india-explorer__state-grid'),
        overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        listScrollHeight:list.scrollHeight,touchHeight:Math.min(...[...list.querySelectorAll('button')].map(e=>e.getBoundingClientRect().height))};
    });
    assert.equal(await page.locator('.india-explorer__state-grid button').count(),36);
    assert.ok(dimensions.overflow<=1);
    assert.ok(dimensions.touchHeight>=44);
    assert.ok(dimensions.panel.bottom-dimensions.list.bottom<45);
    if(width>=1024){assert.ok(dimensions.map.width/dimensions.panel.width>1.7);assert.ok(dimensions.map.height<=725);}
    else {assert.ok(dimensions.panel.y>=dimensions.map.bottom-1);assert.ok(dimensions.listScrollHeight<=dimensions.list.height+2);}
    for(const state of api.states) await page.locator('.india-explorer__state-grid button').filter({has:page.getByText(state.state_name,{exact:true})}).getByText(`${state.verified_district_count} verified districts`,{exact:true}).waitFor();
    await page.screenshot({path:`${output}/india-${width}x${height}.png`,fullPage:true});
    await page.goto(`${origin}/india/ap`);
    await page.waitForFunction(count=>document.querySelectorAll('.state-explorer__district-card').length===count,api.states.find(s=>s.state_id==='ap').verified_district_count);
    await page.locator('.state-explorer__fact-grid > div').filter({has:page.getByText('Verified districts',{exact:true})}).getByText(String(api.states.find(s=>s.state_id==='ap').verified_district_count),{exact:true}).waitFor();
    assert.equal(await page.getByText('Verified cities',{exact:true}).count(),0);
    assert.ok(await page.locator('.state-explorer__map svg').isVisible());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth<=1));
    await page.screenshot({path:`${output}/ap-${width}x${height}.png`,fullPage:true});
    results.push({viewport:`${width}x${height}`,dimensions,stateMapVisible:true,horizontalOverflow:false});
  }
  await page.route('**/api/india/states/ap',route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({detail:'Audit simulated unavailable service'})}));
  await page.goto(`${origin}/india/ap`);
  await page.getByText(/India API 503/).waitFor();
  await page.screenshot({path:`${output}/ap-explicit-api-error.png`,fullPage:true});
  results.push({scenario:'simulated state-profile 503',explicitError:true});
  assert.equal(optionalAnalyticsRequests.length,0,'Optional analytics loaded before consent');
  results.push({scenario:'default analytics consent',optionalAnalyticsRequests:0});
} finally {await browser.close();}
await writeFile(`${output}/results.json`,JSON.stringify({generated_at:new Date().toISOString(),origin,mode:'local compilation + configured rewrite + real read-only API; not a release build or Vercel deployment',results},null,2));
console.log('PASS: six direct routes and refreshes; five responsive viewports; explicit API error.');
