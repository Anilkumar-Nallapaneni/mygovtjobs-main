import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';

const origin=(process.env.INDIA_API_AUDIT_URL || 'http://127.0.0.1:8001').replace(/\/$/,'');
const mapping=JSON.parse(await readFile('data/india/lgd-state-mapping.json','utf8'));
assert.equal(mapping.length,36);
const read=async path=>{
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(30000)});
  const payload=await response.json();
  return {status:response.status,payload};
};
const rows=[];
const probes=[];
for(const path of ['/api/india/health','/api/india/states','/api/india/districts','/api/india/districts?state_id=ap','/api/india/districts?state_id=ka']){
  const {status,payload}=await read(path);
  probes.push({path,status,items:payload.items?.length,total:payload.total,health:payload.status});
  assert.equal(status,200,path);
}
let total=0;
for(const state of mapping){
  const {status,payload}=await read(`/api/india/districts?state_id=${state.state_id}&limit=1000`);
  assert.equal(status,200,state.state_id);
  assert.equal(payload.total,payload.items.length);
  assert.ok(payload.items.every(d=>d.state_id===state.state_id&&d.verification_status==='verified'));
  const profile=await read(`/api/india/states/${state.state_id}`);
  assert.equal(profile.status,200);
  assert.equal(profile.payload.id,state.state_id);
  assert.equal(profile.payload.counts.districts,payload.total);
  rows.push({state_id:state.state_id,state_name:profile.payload.name,status,verified_district_count:payload.total,
    capital:profile.payload.capital,region:profile.payload.region,counts:profile.payload.counts});
  total+=payload.total;
}
assert.equal(total,784);
await mkdir('docs/audits',{recursive:true});
await writeFile('docs/audits/state-api-verification-2026-10-08.json',JSON.stringify({generated_at:new Date().toISOString(),origin,
  database_writes:0,success:rows.length,unknown_state_mappings:0,total_verified_districts:total,probes,states:rows},null,2));
console.table(rows.map(({state_id,state_name,status,verified_district_count})=>({state_id,state_name,status,verified_district_count})));
console.log(`PASS: ${rows.length}/36 states; ${total} verified districts; zero writes`);
