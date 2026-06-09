#!/bin/bash
set -e

mkdir -p /opt/krylo-api/as-diff /opt/krylo-api/src/engine

cat > /opt/krylo-api/src/engine/asdiff.js << 'ENDOFFILE'
// WO-1038 — AS-DIFF (Pairwise Leverage Comparator)
const SPACE_RESOLVER = {
  finance_real_estate:'cash_flow',real_estate_finance:'cash_flow',
  finance_career:'capital_allocation',career_finance:'capital_allocation',
  sports_career:'competitive_positioning',career_sports:'competitive_positioning',
  sports_finance:'market_valuation',finance_sports:'market_valuation',
  legal_finance:'risk_adjusted_exposure',finance_legal:'risk_adjusted_exposure',
  legal_career:'path_dependency',career_legal:'path_dependency',
  health_career:'timeline_pressure',career_health:'timeline_pressure',
  health_legal:'reversibility',legal_health:'reversibility',
  real_estate_career:'long_term_compounding',career_real_estate:'long_term_compounding',
  sports_legal:'competitive_positioning',legal_sports:'competitive_positioning',
};
const SPACE_QUALITY = {
  cash_flow:{finance:1.00,real_estate:0.85,career:0.60,sports:0.45,legal:0.70,health:0.40,general:0.55},
  capital_allocation:{finance:0.90,real_estate:0.70,career:0.85,sports:0.50,legal:0.60,health:0.45,general:0.55},
  competitive_positioning:{sports:1.00,career:0.80,finance:0.65,real_estate:0.55,legal:0.60,health:0.50,general:0.55},
  market_valuation:{sports:0.85,finance:0.95,real_estate:0.75,career:0.55,legal:0.60,health:0.40,general:0.55},
  risk_adjusted_exposure:{legal:1.00,finance:0.90,real_estate:0.70,career:0.65,sports:0.55,health:0.60,general:0.55},
  path_dependency:{legal:0.85,career:0.90,finance:0.65,real_estate:0.70,sports:0.60,health:0.70,general:0.55},
  timeline_pressure:{health:0.90,career:0.85,legal:0.70,finance:0.60,sports:0.80,real_estate:0.55,general:0.55},
  reversibility:{health:0.80,legal:0.85,real_estate:0.90,finance:0.75,career:0.80,sports:0.60,general:0.55},
  long_term_compounding:{real_estate:0.90,career:0.85,finance:0.80,legal:0.65,health:0.60,sports:0.55,general:0.55},
  direct:{finance:1.00,legal:1.00,real_estate:1.00,sports:1.00,career:1.00,health:1.00,general:1.00},
};
const INCOMPARABILITY_THRESHOLD=0.88;
function resolveSharedSpace(a,b){if(a===b)return'direct';return SPACE_RESOLVER[`${a}_${b}`]??'direct';}
function projectPLI(pliResult,domain,space){const q=(SPACE_QUALITY[space]??SPACE_QUALITY.direct)[domain]??0.55;return{projected:Math.min(1,pliResult.pli*q),quality:q,velocity:pliResult.components.velocity*q,window:pliResult.components.window*q,magnitude:pliResult.pli*q};}
function computeDominantAxis(projA,projB){const axes={TRAJECTORY:{a:projA.velocity,b:projB.velocity,gap:Math.abs(projA.velocity-projB.velocity)},TIME:{a:projA.window,b:projB.window,gap:Math.abs(projA.window-projB.window)},MAGNITUDE:{a:projA.magnitude,b:projB.magnitude,gap:Math.abs(projA.magnitude-projB.magnitude)}};const dominant=Object.entries(axes).reduce((best,[name,data])=>data.gap>best.gap?{name,...data}:best,{name:'MAGNITUDE',gap:-Infinity,a:0,b:0});return{dominant_axis:dominant.name,dominant_gap:dominant.gap,axis_winner:dominant.a>=dominant.b?'A':'B',axes};}
function computeConstraintIntersection(unitA,unitB){const aBottleneck=(unitA.schema.constraints??[]).sort((x,y)=>(y.severity??0)-(x.severity??0))[0];const bAmplifier=(unitB.schema.dependencies??[]).filter(d=>d.status==='lit').sort((x,y)=>(y.coverage??0)-(x.coverage??0))[0];if(!aBottleneck||!bAmplifier)return{asymmetric_capture:false,detail:null};const capture=aBottleneck.severity>0.60&&(bAmplifier.coverage??0)>0.60;return{asymmetric_capture:capture,detail:capture?`A's bottleneck [${aBottleneck.label}] is B's amplifier [${bAmplifier.id}]. B holds structural advantage.`:null,a_bottleneck:aBottleneck,b_amplifier:bAmplifier};}
function computeLeverageMargin(projA,projB,capture,divergence){const raw=projA.projected-projB.projected;const sign=raw>=0?1:-1;return{raw,adjusted:sign*Math.max(0,Math.abs(raw)-(capture?0.12:0)-divergence*0.10)};}
function checkIncomparability(qA,qB,space){if(space==='direct')return{incomparable:false,divergence:0};const d=1-(qA*qB);return{incomparable:d>INCOMPARABILITY_THRESHOLD,divergence:d,note:d>INCOMPARABILITY_THRESHOLD?`INCOMPARABILITY FLAG: ${Math.round(d*100)}% domain divergence`:null};}
export function buildSignalUnit(schema,signal,pliResult,mathObject=null){return{schema,signal,pli:pliResult,math:mathObject};}
export function compareSignals(unitA,unitB){const domainA=unitA.schema.domain??'general';const domainB=unitB.schema.domain??'general';const sharedSpace=resolveSharedSpace(domainA,domainB);const projA=projectPLI(unitA.pli,domainA,sharedSpace);const projB=projectPLI(unitB.pli,domainB,sharedSpace);const incomp=checkIncomparability(projA.quality,projB.quality,sharedSpace);const intersection=computeConstraintIntersection(unitA,unitB);const lm=computeLeverageMargin(projA,projB,intersection.asymmetric_capture,incomp.divergence);const axisResult=computeDominantAxis(projA,projB);const PARITY_BAND=0.03;const winner=Math.abs(lm.adjusted)<=PARITY_BAND?'PARITY':lm.adjusted>0?'A':'B';return{winner,leverage_margin:parseFloat(lm.adjusted.toFixed(4)),leverage_margin_raw:parseFloat(lm.raw.toFixed(4)),dominant_axis:axisResult.dominant_axis,dominant_axis_gap:parseFloat(axisResult.dominant_gap.toFixed(4)),dominant_axis_winner:axisResult.axis_winner,axes:axisResult.axes,shared_space:sharedSpace,asymmetric_capture:intersection.asymmetric_capture,asymmetric_capture_detail:intersection.detail,incomparability_flag:incomp.incomparable,incomparability_note:incomp.note??null,divergence:parseFloat((incomp.divergence??0).toFixed(4)),unit_a:{pli:parseFloat(projA.projected.toFixed(4)),pli_raw:parseFloat(unitA.pli.pli.toFixed(4)),velocity:parseFloat(projA.velocity.toFixed(4)),window:parseFloat(projA.window.toFixed(4)),confidence:unitA.pli.confidence,fold:unitA.pli.fold,lens:unitA.pli.lens},unit_b:{pli:parseFloat(projB.projected.toFixed(4)),pli_raw:parseFloat(unitB.pli.pli.toFixed(4)),velocity:parseFloat(projB.velocity.toFixed(4)),window:parseFloat(projB.window.toFixed(4)),confidence:unitB.pli.confidence,fold:unitB.pli.fold,lens:unitB.pli.lens},legal_qualifier:'potential',generated_at:new Date().toISOString()};}
ENDOFFILE

cat > /opt/krylo-api/as-diff/db.js << 'ENDOFFILE'
import pg from 'pg';
const { Pool } = pg;
if (!process.env.DATABASE_URL) console.warn('[db] DATABASE_URL not set — persistence disabled');
export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) : null;
export async function migrate() {
  if (!pool) return;
  await pool.query(`CREATE TABLE IF NOT EXISTS execution_plans (id SERIAL PRIMARY KEY, plan_id UUID NOT NULL UNIQUE, timestamp TIMESTAMPTZ NOT NULL, version TEXT NOT NULL, payload JSONB NOT NULL, signature TEXT NOT NULL, source TEXT NOT NULL, commit_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_execution_plans_plan_id ON execution_plans (plan_id); CREATE INDEX IF NOT EXISTS idx_execution_plans_created ON execution_plans (created_at DESC);`);
  console.log('[db] migration complete');
}
ENDOFFILE

cat > /opt/krylo-api/as-diff/engine.js << 'ENDOFFILE'
import http from 'http';
import { randomUUID } from 'crypto';
import { compareSignals } from '../src/engine/asdiff.js';
import { pool, migrate } from './db.js';
const PORT = 4000;
function applyCORS(res){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
function parseBody(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',chunk=>{raw+=chunk;});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('Invalid JSON'));}});req.on('error',reject);});}
function send(res,status,payload){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(payload));}
async function handleCompare(req,res){let body;try{body=await parseBody(req);}catch{return send(res,400,{error:'Invalid JSON body'});}const{unitA,unitB}=body;if(!unitA||!unitB)return send(res,400,{error:'unitA and unitB required'});try{send(res,200,compareSignals(unitA,unitB));}catch(err){send(res,500,{error:err.message});}}
function handleHealth(_req,res){send(res,200,{status:'ok',port:PORT,engine:'as-diff',ts:new Date().toISOString()});}
async function handlePersistExecutionPlan(req,res){let body;try{body=await parseBody(req);}catch{return send(res,400,{status:'DB_WRITE_FAILED',error:'Invalid JSON body'});}const{header,payload,metadata}=body;if(!header?.plan_id||!payload?.execution_plan||!payload?.signature||!metadata?.commit_hash)return send(res,422,{status:'DB_WRITE_FAILED',error:'Missing required fields'});if(!pool)return send(res,201,{status:'DB_WRITE_SUCCESS',receipt_id:randomUUID().replace(/-/g,''),latency_ms:0});const t0=Date.now();try{await pool.query(`INSERT INTO execution_plans (plan_id,timestamp,version,payload,signature,source,commit_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (plan_id) DO NOTHING`,[header.plan_id,header.timestamp,header.version,JSON.stringify(payload),payload.signature,metadata.source,metadata.commit_hash]);send(res,201,{status:'DB_WRITE_SUCCESS',receipt_id:randomUUID().replace(/-/g,''),latency_ms:Date.now()-t0});}catch(err){console.error('[db] write failed:',err.message);send(res,500,{status:'DB_WRITE_FAILED',error:err.message});}}
function handleNotFound(_req,res){send(res,404,{error:'Not found'});}
function routeRequest(req,res){applyCORS(res);if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}const url=req.url?.split('?')[0];if(req.method==='POST'&&url==='/compare')return handleCompare(req,res);if(req.method==='POST'&&url==='/api/v1/persistence/execution-plan')return handlePersistExecutionPlan(req,res);if(req.method==='GET'&&url==='/health')return handleHealth(req,res);handleNotFound(req,res);}
const server=http.createServer(routeRequest);
server.listen(PORT,async()=>{console.log(`[AS-DIFF] live on port ${PORT}`);await migrate();});
ENDOFFILE

cat > /opt/krylo-api/package.json << 'ENDOFFILE'
{"type":"module","dependencies":{"pg":"^8.21.0"}}
ENDOFFILE

cat > /opt/krylo-api/ecosystem.config.cjs << 'ENDOFFILE'
module.exports={apps:[{name:'krylo-api',script:'as-diff/engine.js',cwd:'/opt/krylo-api',env:{NODE_ENV:'production',DATABASE_URL:'postgresql://postgres:6CifNNSz1NTkE747@db.qgoyyxjyecpxoeqpibgv.supabase.co:5432/postgres'}}]}
ENDOFFILE

cd /opt/krylo-api && npm install pg

pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -1 | bash

cat > /etc/nginx/conf.d/krylo-api.conf << 'ENDOFFILE'
server {
    listen 80;
    server_name 216.250.119.104;
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        add_header Cache-Control no-store;
        proxy_buffering off;
    }
}
ENDOFFILE

systemctl enable nginx && systemctl start nginx
firewall-cmd --permanent --add-service=http && firewall-cmd --reload

curl http://127.0.0.1:4000/health
