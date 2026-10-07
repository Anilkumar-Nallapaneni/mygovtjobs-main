import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Read-only local UI audit. Responses come from the running verified API, not fixtures.
const phase = process.argv[2] || 'after';
const origin = process.env.INDIA_UI_AUDIT_URL || 'http://127.0.0.1:3689';
const output = 'docs/audits/india-explorer-ui-2026-10-07';
await mkdir(output, { recursive: true });
const api = new Map();
const browser = await chromium.launch();
const results = [];
try {
  for (const [width, height] of [[360,800],[390,844],[768,1024],[1024,768],[1440,900]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    await page.route('**/api/india/**', async route => {
      const url = new URL(route.request().url());
      const key = url.pathname + url.search;
      if (!api.has(key)) api.set(key, fetch(`http://127.0.0.1:8000${key}`).then(async r => ({ status: r.status, body: await r.text() })));
      await route.fulfill({ ...await api.get(key), contentType: 'application/json' });
    });
    await page.goto(`${origin}/india`);
    await page.locator('.india-explorer__state-grid button').last().waitFor();
    await page.locator('.india-explorer__map-card svg path').first().waitFor();
    await page.waitForFunction(() => ![...document.querySelectorAll('.india-explorer__state-list [role="status"]')].some(e=>e.textContent.includes('Loading')));
    const dimensions = await page.evaluate(() => {
      const rect = selector => { const e=document.querySelector(selector); const r=e.getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height }; };
      const grid=document.querySelector('.india-explorer__state-grid');
      const paths=[...document.querySelectorAll('.india-explorer__map-card svg path')];
      const bounds=paths.map(p=>p.getBoundingClientRect());
      return { mapCard:rect('.india-explorer__map-card'),map:rect('.india-explorer__map-card svg'),
        artwork:{width:Math.max(...bounds.map(r=>r.right))-Math.min(...bounds.map(r=>r.left)),height:Math.max(...bounds.map(r=>r.bottom))-Math.min(...bounds.map(r=>r.top))},
        panel:rect('.india-explorer__state-list'),list:rect('.india-explorer__state-grid'),
        listScrollHeight:grid.scrollHeight,listOverflow:getComputedStyle(grid).overflowY,
        pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        minTouchHeight:Math.min(...[...grid.querySelectorAll('button')].map(b=>b.getBoundingClientRect().height)),
        bottomGap:document.querySelector('.india-explorer__state-list').getBoundingClientRect().bottom-grid.getBoundingClientRect().bottom,
        cardCount:grid.querySelectorAll('button').length };
    });
    await page.locator('.india-explorer__map-layout').screenshot({ path:`${output}/${phase}-${width}x${height}.png` });
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({ path:`${output}/${phase}-page-${width}x${height}.png`, fullPage:true });
    if (phase === 'after') {
      assert.ok(dimensions.pageOverflow<=1, 'Horizontal overflow');
      assert.equal(dimensions.cardCount,36);
      assert.ok(dimensions.minTouchHeight>=44);
      assert.ok(dimensions.bottomGap<45, 'Empty lower state panel');
      assert.ok(dimensions.artwork.height>250, 'Map artwork too small');
      const states=JSON.parse((await api.get('/api/india/states')).body).items;
      assert.equal(states.reduce((n,s)=>n+s.district_count,0),784);
      for (const state of states) await page.locator('.india-explorer__state-grid button').filter({has:page.getByText(state.name,{exact:true})}).getByText(`${state.district_count} verified districts`,{exact:true}).waitFor();
      if (width>=1024) {
        assert.ok(Math.abs(dimensions.mapCard.height-dimensions.panel.height)<2);
        assert.ok(dimensions.mapCard.width/dimensions.panel.width>1.7);
        assert.ok(dimensions.mapCard.height<=725);
      } else {
        assert.ok(dimensions.panel.y>=dimensions.mapCard.y+dimensions.mapCard.height);
        assert.ok(dimensions.listScrollHeight<=dimensions.list.height+2,'Nested mobile scroll');
      }
      await page.getByRole('textbox',{name:'Search state or Union Territory'}).fill('Karnataka');
      assert.equal(await page.locator('.india-explorer__state-grid button').count(),1);
      await page.getByRole('textbox',{name:'Search state or Union Territory'}).fill('');
      const path=page.locator('.india-explorer__map-card path[id="IN-KA"]');
      if (width>=1024) {
        await path.hover();
        await page.getByRole('tooltip').getByText('Karnataka',{exact:true}).waitFor();
        await page.mouse.move(0,0);
      }
      await path.focus();
      await page.getByRole('tooltip').getByText('Karnataka',{exact:true}).waitFor();
      await page.getByRole('tooltip').getByText(`${states.find(s=>s.id==='ka').district_count} verified districts`,{exact:true}).waitFor();
      await path.press('Escape');
      assert.equal(await page.getByRole('tooltip').count(),0);
      await path.press('ArrowDown');
      await page.waitForFunction(()=>document.activeElement?.tagName==='path' && document.activeElement?.id!=='IN-KA');
      await path.focus();
      await path.press('Enter');
      await page.waitForURL('**/india/ka');
      await page.locator('.state-explorer__district-card').first().waitFor();
      await page.unrouteAll({behavior:'wait'});
      await page.route('**/api/india/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"detail":"Unavailable"}'}));
      await page.goto(`${origin}/india`);
      await page.getByRole('alert').filter({hasText:'State service unavailable'}).waitFor();
      assert.equal(await page.locator('.india-explorer__state-grid button').count(),36);
      assert.equal(await page.locator('.india-explorer__state-grid button small').count(),0);
      await page.locator('.india-explorer__map-card svg path').first().waitFor();
      await page.locator('.india-explorer__map-layout').screenshot({path:`${output}/error-${width}x${height}.png`});
      await page.locator('.india-explorer__state-grid button').filter({has:page.getByText('Karnataka',{exact:true})}).click();
      await page.waitForURL('**/india/ka');
    }
    results.push({width,height,...dimensions});
    await page.unrouteAll({behavior:'wait'});
    await page.close();
  }
} finally { await browser.close(); }
await writeFile(`${output}/${phase}-dimensions.json`,JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
