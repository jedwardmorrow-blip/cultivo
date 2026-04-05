import postgres from 'postgres';

const sql = postgres('postgres://paperclip:paperclip@127.0.0.1:54329/paperclip');

try {
  // Find tables that might be about companies/projects/organizations
  const tables = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    AND (
      table_name ILIKE '%company%' OR
      table_name ILIKE '%compan%' OR
      table_name ILIKE '%project%' OR
      table_name ILIKE '%organ%' OR
      table_name ILIKE '%workspace%' OR
      table_name ILIKE '%tenant%' OR
      table_name ILIKE '%document%' OR
      table_name ILIKE '%activity%'
    )
    ORDER BY table_name
  `;
  console.log('Matching tables:');
  console.table(tables);

  // Get schema for companies table if it exists
  for (const { table_name } of tables) {
    const cols = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${table_name}
      ORDER BY ordinal_position
    `;
    console.log(`\n=== ${table_name} ===`);
    console.table(cols);
  }
} finally {
  await sql.end();
}
