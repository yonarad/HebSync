import { neon } from '@neondatabase/serverless';

const REQUIRED_ACKNOWLEDGEMENT = 'isolated-neon-branch';

const expectedColumns = {
  google_connections: {
    id: { type: 'bigint', nullable: false },
    google_user_id: { type: 'text', nullable: false },
    email: { type: 'text', nullable: true },
    display_name: { type: 'text', nullable: true },
    picture_url: { type: 'text', nullable: true },
    scope_mode: { type: 'text', nullable: false },
    encrypted_refresh_token: { type: 'text', nullable: true },
    access_token: { type: 'text', nullable: true },
    access_token_expires_at: { type: 'timestamp with time zone', nullable: true },
    created_at: { type: 'timestamp with time zone', nullable: false },
    updated_at: { type: 'timestamp with time zone', nullable: false },
  },
  user_sessions: {
    id: { type: 'bigint', nullable: false },
    session_hash: { type: 'text', nullable: false },
    google_connection_id: { type: 'bigint', nullable: false },
    expires_at: { type: 'timestamp with time zone', nullable: false },
    created_at: { type: 'timestamp with time zone', nullable: false },
  },
};

function fail(message) {
  throw new Error(message);
}

function requireSafeConfiguration() {
  const recoveryUrl = process.env.RECOVERY_DATABASE_URL;
  if (!recoveryUrl) {
    fail('RECOVERY_DATABASE_URL is required.');
  }

  if (process.env.RECOVERY_DRILL_ACK !== REQUIRED_ACKNOWLEDGEMENT) {
    fail(`Set RECOVERY_DRILL_ACK=${REQUIRED_ACKNOWLEDGEMENT} after confirming the URL belongs to a temporary recovery branch.`);
  }

  let recovery;
  try {
    recovery = new URL(recoveryUrl);
  } catch {
    fail('RECOVERY_DATABASE_URL is not a valid URL.');
  }

  if (!['postgres:', 'postgresql:'].includes(recovery.protocol)) {
    fail('RECOVERY_DATABASE_URL must use the postgres or postgresql protocol.');
  }

  if (!recovery.hostname.endsWith('.neon.tech')) {
    fail('RECOVERY_DATABASE_URL must point to a Neon host.');
  }

  if (process.env.DATABASE_URL) {
    const production = new URL(process.env.DATABASE_URL);
    if (production.hostname === recovery.hostname) {
      fail('Recovery and production URLs use the same host. Refusing to query it.');
    }
  }

  return recoveryUrl;
}

function validateColumns(rows) {
  const actual = new Map(
    rows.map((row) => [`${row.table_name}.${row.column_name}`, row]),
  );
  const errors = [];

  for (const [table, columns] of Object.entries(expectedColumns)) {
    for (const [column, expected] of Object.entries(columns)) {
      const key = `${table}.${column}`;
      const found = actual.get(key);
      if (!found) {
        errors.push(`${key} is missing`);
        continue;
      }
      if (found.data_type !== expected.type) {
        errors.push(`${key} has type ${found.data_type}; expected ${expected.type}`);
      }
      const nullable = found.is_nullable === 'YES';
      if (nullable !== expected.nullable) {
        errors.push(`${key} nullable=${nullable}; expected ${expected.nullable}`);
      }
    }
  }

  return errors;
}

function hasConstraint(rows, expected) {
  return rows.some((row) => Object.entries(expected).every(([key, value]) => row[key] === value));
}

function validateConstraints(rows) {
  const expected = [
    { table_name: 'google_connections', constraint_type: 'PRIMARY KEY', column_name: 'id' },
    { table_name: 'google_connections', constraint_type: 'UNIQUE', column_name: 'google_user_id' },
    { table_name: 'user_sessions', constraint_type: 'PRIMARY KEY', column_name: 'id' },
    { table_name: 'user_sessions', constraint_type: 'UNIQUE', column_name: 'session_hash' },
    {
      table_name: 'user_sessions',
      constraint_type: 'FOREIGN KEY',
      column_name: 'google_connection_id',
      foreign_table_name: 'google_connections',
      foreign_column_name: 'id',
      delete_rule: 'CASCADE',
    },
  ];

  return expected
    .filter((constraint) => !hasConstraint(rows, constraint))
    .map((constraint) => `${constraint.table_name}.${constraint.column_name} is missing ${constraint.constraint_type}`);
}

async function verify() {
  const recoveryUrl = requireSafeConfiguration();
  const sql = neon(recoveryUrl);

  const columns = await sql`
    SELECT table_name, column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('google_connections', 'user_sessions')
    ORDER BY table_name, ordinal_position
  `;

  const constraints = await sql`
    SELECT
      tc.table_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_catalog = kcu.constraint_catalog
      AND tc.constraint_schema = kcu.constraint_schema
      AND tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_catalog = ccu.constraint_catalog
      AND tc.constraint_schema = ccu.constraint_schema
      AND tc.constraint_name = ccu.constraint_name
    LEFT JOIN information_schema.referential_constraints rc
      ON tc.constraint_catalog = rc.constraint_catalog
      AND tc.constraint_schema = rc.constraint_schema
      AND tc.constraint_name = rc.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name IN ('google_connections', 'user_sessions')
  `;

  const indexes = await sql`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'user_sessions'
  `;

  const counts = await sql`
    SELECT
      (SELECT COUNT(*) FROM google_connections) AS google_connections,
      (SELECT COUNT(*) FROM google_connections WHERE encrypted_refresh_token IS NOT NULL) AS encrypted_refresh_tokens,
      (SELECT COUNT(*) FROM user_sessions) AS user_sessions,
      (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW()) AS active_sessions
  `;

  const errors = [
    ...validateColumns(columns),
    ...validateConstraints(constraints),
  ];

  if (!indexes.some((row) => row.indexname === 'idx_user_sessions_expires_at')) {
    errors.push('idx_user_sessions_expires_at is missing');
  }

  if (errors.length > 0) {
    console.error(JSON.stringify({ ok: false, errors }, null, 2));
    process.exitCode = 1;
    return;
  }

  console.log(JSON.stringify({
    ok: true,
    safety: 'read-only aggregate and schema checks on an acknowledged isolated Neon branch',
    schema: {
      tables: Object.keys(expectedColumns),
      requiredColumns: Object.values(expectedColumns).reduce((sum, columnsForTable) => sum + Object.keys(columnsForTable).length, 0),
      expiryIndex: true,
      sessionConnectionCascade: true,
    },
    counts: counts[0],
  }, null, 2));
}

verify().catch((error) => {
  const safeMessage = error instanceof Error
    ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[redacted database URL]')
    : 'Unknown error';
  console.error(`Recovery verification failed: ${safeMessage}`);
  process.exitCode = 1;
});
