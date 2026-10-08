/** @vitest-environment happy-dom */
import { afterEach, expect, it, vi } from 'vitest';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.resetModules();});
it('uses the same-origin canonical state endpoint and preserves successful zero counts',async()=>{
  vi.stubEnv('VITE_API_URL','');vi.resetModules();
  const payload={id:'ap',capital:null,region:'south',counts:{districts:0,cities:0,places:0,jobs:0}};
  const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify(payload),{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetch);
  const {fetchIndiaState}=await import('@/lib/indiaApi');
  expect(await fetchIndiaState('ap')).toEqual(payload);
  expect(fetch.mock.calls[0][0]).toBe('/api/india/states/ap');
});
it('fails explicitly when a rewrite returns the SPA HTML with HTTP200',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>SPA</html>',{headers:{'Content-Type':'text/html'}})));
  const {fetchIndiaState}=await import('@/lib/indiaApi');
  await expect(fetchIndiaState('ap')).rejects.toThrow('check API routing');
});
it('preserves HTTP status and endpoint in request failures',async()=>{
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('',{status:404})));
  const {fetchIndiaState}=await import('@/lib/indiaApi');
  await expect(fetchIndiaState('ap')).rejects.toThrow('India API 404 (/api/india/states/ap)');
});
