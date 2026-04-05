import postgres from 'postgres';
const sql = postgres('postgresql://paperclip:paperclip@127.0.0.1:54329/paperclip');
const companyId = '7e17aace-a0ea-4244-8529-d4ea2437a8c3';

// Any activity in last 30 min (things moving right now)
console.log('=== Activity in last 30 min ===\n');
const recent = await sql`
  SELECT action, details, created_at, actor_id
  FROM activity_log
  WHERE company_id = ${companyId}
    AND created_at > now() - interval '30 minutes'
    AND actor_id != 'routine-scheduler'
  ORDER BY created_at DESC LIMIT 30
`;
for (const a of recent) {
  const d = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
  const ts = new Date(a.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  console.log(`[${ts}] ${a.actor_id?.substring(0,12)} → ${a.action}${d.identifier ? ` (${d.identifier})` : ''}`);
}

// My PR tickets — status check + any new comments
console.log('\n=== My session tickets — current status ===\n');
const mine = ['CUL-291','CUL-385','CUL-271','CUL-622','CUL-342','CUL-343','CUL-346','CUL-344','CUL-345','CUL-350','CUL-552','CUL-351'];
const myStatus = await sql`
  SELECT identifier, title, status, updated_at FROM issues
  WHERE identifier = ANY(${mine}) ORDER BY identifier
`;
for (const i of myStatus) {
  const updated = new Date(i.updated_at).toLocaleTimeString();
  console.log(`${i.identifier} [${i.status}] — updated ${updated}`);
}

// Critical path to go-live — is there deploy activity?
console.log('\n=== Merge / deploy signals ===\n');
const deploySignals = await sql`
  SELECT action, details, created_at FROM activity_log
  WHERE company_id = ${companyId}
    AND (action ILIKE '%merge%' OR action ILIKE '%deploy%' OR action ILIKE '%pr_%'
         OR action ILIKE '%release%' OR action ILIKE '%review%')
    AND created_at > now() - interval '12 hours'
  ORDER BY created_at DESC LIMIT 20
`;
if (deploySignals.length === 0) {
  console.log('(no merge/deploy signals in activity log)');
} else {
  for (const a of deploySignals) {
    const d = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {});
    const ts = new Date(a.created_at).toLocaleTimeString();
    console.log(`[${ts}] ${a.action} ${JSON.stringify(d).substring(0,100)}`);
  }
}

// What's blocking Laura's go-live (monday)?
console.log('\n=== Laura go-live blockers ===\n');
const laura = await sql`
  SELECT identifier, title, status, priority FROM issues
  WHERE company_id = ${companyId}
    AND status NOT IN ('done','cancelled')
    AND (description ILIKE '%Laura%' OR description ILIKE '%April 7%' OR description ILIKE '%dispatch queue%')
  ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END
  LIMIT 20
`;
for (const i of laura) {
  console.log(`${i.identifier} [${i.status}] [${i.priority}] — ${i.title?.substring(0,80)}`);
}

// CUL-552 — the Phase 1 last-mile blocker
const [c552] = await sql`SELECT identifier, title, status, description FROM issues WHERE identifier = 'CUL-552'`;
console.log(`\n=== CUL-552 [${c552.status}] ===`);
console.log(c552.title);
console.log((c552.description || '').substring(0, 1000));

await sql.end();
