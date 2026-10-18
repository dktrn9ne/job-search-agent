import fs from 'node:fs';
import path from 'node:path';

// Production must use durable Postgres. SQLite is deliberately local-only.
export async function openStore({ databaseUrl=process.env.DATABASE_URL, localFile=process.env.PORTAL_LOCAL_DB }={}) {
 let pool, sqlite, chain=Promise.resolve();
 if(databaseUrl){const {Pool}=await import('pg');pool=new Pool({connectionString:databaseUrl,max:3,ssl:databaseUrl.includes('localhost')?undefined:{rejectUnauthorized:true}});}
 else if(localFile && !process.env.VERCEL){const {DatabaseSync}=await import('node:sqlite');fs.mkdirSync(path.dirname(path.resolve(localFile)),{recursive:true});sqlite=new DatabaseSync(localFile);sqlite.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');}
 else throw Error('Persistent database is not configured');
 const run=async(sql,values=[],client=pool)=>{
  if(client)return (await client.query(sql,values)).rows;
  const statement=sqlite.prepare(sql.replace(/\$\d+/g,'?'));
  return /^(SELECT|WITH)|RETURNING/i.test(sql.trim())?statement.all(...values):(statement.run(...values),[]);
 };
 const store={query:run,async transaction(work){
  if(pool){const c=await pool.connect();try{await c.query('BEGIN');const result=await work((s,v)=>run(s,v,c));await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
  const task=chain.then(async()=>{sqlite.exec('BEGIN IMMEDIATE');try{const result=await work(run);sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}});chain=task.catch(()=>{});return task;
 },async close(){if(pool)await pool.end();else sqlite.close();}};
 for(const sql of [
  'CREATE TABLE IF NOT EXISTS portal_candidates (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password TEXT, profile TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portal_invites (token_hash TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES portal_candidates(id), expires_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portal_sessions (token_hash TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES portal_candidates(id), expires_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portal_attempts (attempt_key TEXT PRIMARY KEY, count INTEGER NOT NULL, resets_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portal_roles (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES portal_candidates(id), digest TEXT NOT NULL, payload TEXT NOT NULL, decision TEXT NOT NULL, note TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portal_packages (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES portal_candidates(id), version INTEGER NOT NULL, digest TEXT NOT NULL, payload TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE TABLE IF NOT EXISTS portal_audit (id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES portal_candidates(id), item_id TEXT, action TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL)',
  'CREATE INDEX IF NOT EXISTS portal_roles_owner ON portal_roles(candidate_id)',
  'CREATE INDEX IF NOT EXISTS portal_packages_owner ON portal_packages(candidate_id)'
 ])await run(sql);
 if(sqlite)sqlite.exec(`CREATE TRIGGER IF NOT EXISTS portal_package_immutable BEFORE UPDATE OF candidate_id,version,digest,payload ON portal_packages BEGIN SELECT RAISE(ABORT,'immutable_package'); END;
 CREATE TRIGGER IF NOT EXISTS portal_audit_no_update BEFORE UPDATE ON portal_audit BEGIN SELECT RAISE(ABORT,'append_only'); END;
 CREATE TRIGGER IF NOT EXISTS portal_audit_no_delete BEFORE DELETE ON portal_audit BEGIN SELECT RAISE(ABORT,'append_only'); END;`);
 else {
  await run("CREATE OR REPLACE FUNCTION portal_deny_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable_record'; END; $$");
  await run("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='portal_package_immutable') THEN CREATE TRIGGER portal_package_immutable BEFORE UPDATE OF candidate_id,version,digest,payload ON portal_packages FOR EACH ROW EXECUTE FUNCTION portal_deny_mutation(); END IF; IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='portal_audit_immutable') THEN CREATE TRIGGER portal_audit_immutable BEFORE UPDATE OR DELETE ON portal_audit FOR EACH ROW EXECUTE FUNCTION portal_deny_mutation(); END IF; END $$");
 }
 return store;
}
