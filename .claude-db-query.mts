import postgres from 'postgres';

const sql = postgres('postgres://paperclip:paperclip@127.0.0.1:54329/paperclip');

try {
  const companies = await sql`SELECT id, name, status, issue_prefix FROM companies ORDER BY created_at`;
  console.log('Existing companies:');
  console.table(companies);

  const projects = await sql`SELECT id, company_id, name, status, target_date FROM projects ORDER BY created_at`;
  console.log('\nExisting projects:');
  console.table(projects);
} finally {
  await sql.end();
}
