import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

let db: any = null;

export async function getDb() {
  if (db) return db;
  
  db = await open({
    filename: './proxies.db',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS proxies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT,
      port TEXT,
      protocol TEXT,
      country TEXT,
      anonymity TEXT,
      latency INTEGER,
      status TEXT,
      last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
      source_url TEXT,
      isp TEXT DEFAULT 'Unknown',
      asn TEXT DEFAULT 'Unknown',
      UNIQUE(ip, port, protocol)
    );
  `);

  // Ensure new columns exist on proxies table for backward compatibility
  try {
    await db.exec(`ALTER TABLE proxies ADD COLUMN isp TEXT DEFAULT 'Unknown';`).catch(() => {});
    await db.exec(`ALTER TABLE proxies ADD COLUMN asn TEXT DEFAULT 'Unknown';`).catch(() => {});
  } catch (e) {}

  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS system_status (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        current_step TEXT,
        scanned_urls INTEGER,
        proxies_found INTEGER,
        verified_live INTEGER,
        is_running BOOLEAN,
        should_stop BOOLEAN DEFAULT 0,
        check_timeout INTEGER DEFAULT 3000,
        check_concurrency INTEGER DEFAULT 200,
        test_target_url TEXT DEFAULT 'http://ip-api.com/json',
        ai_api_key TEXT DEFAULT 'sk-68b631cc8464b3ed-tbnd2g-cc2ff8e3',
        ai_endpoint TEXT DEFAULT 'https://9router.indrayuda.my.id/v1/chat/completions',
        ai_enabled BOOLEAN DEFAULT 1,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch(e) {}

  // Ensure new config columns exist on system_status table
  try {
    await db.exec(`ALTER TABLE system_status ADD COLUMN should_stop BOOLEAN DEFAULT 0;`).catch(() => {});
    await db.exec(`ALTER TABLE system_status ADD COLUMN check_timeout INTEGER DEFAULT 3000;`).catch(() => {});
    await db.exec(`ALTER TABLE system_status ADD COLUMN check_concurrency INTEGER DEFAULT 200;`).catch(() => {});
    await db.exec(`ALTER TABLE system_status ADD COLUMN test_target_url TEXT DEFAULT 'http://ip-api.com/json';`).catch(() => {});
    await db.exec(`ALTER TABLE system_status ADD COLUMN ai_api_key TEXT DEFAULT 'sk-68b631cc8464b3ed-tbnd2g-cc2ff8e3';`).catch(() => {});
    await db.exec(`ALTER TABLE system_status ADD COLUMN ai_endpoint TEXT DEFAULT 'https://9router.indrayuda.my.id/v1/chat/completions';`).catch(() => {});
    await db.exec(`ALTER TABLE system_status ADD COLUMN ai_enabled BOOLEAN DEFAULT 1;`).catch(() => {});
  } catch (e) {}

  // Create system logs table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS system_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message TEXT,
      level TEXT DEFAULT 'info',
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS source_stats (
      url TEXT PRIMARY KEY,
      proxies_found INTEGER DEFAULT 0,
      verified_live INTEGER DEFAULT 0,
      last_scraped DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await db.exec(`
    INSERT OR IGNORE INTO system_status (
      id, current_step, scanned_urls, proxies_found, verified_live, is_running, should_stop,
      check_timeout, check_concurrency, test_target_url, ai_api_key, ai_endpoint, ai_enabled
    ) 
    VALUES (1, 'Idle', 0, 0, 0, false, 0, 3000, 200, 'http://ip-api.com/json', 'sk-68b631cc8464b3ed-tbnd2g-cc2ff8e3', 'https://9router.indrayuda.my.id/v1/chat/completions', 1);
  `);

  return db;
}

export async function updateStatus(data: any) {
  const db = await getDb();
  const keys = Object.keys(data);
  if(keys.length === 0) return;
  const sets = keys.map(k => `${k} = ?`).join(', ');
  await db.run(`UPDATE system_status SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = 1`, Object.values(data));
}

export async function getStatus() {
  const db = await getDb();
  return await db.get('SELECT * FROM system_status WHERE id = 1');
}

export async function updateSourceStat(url: string, found: number, live: number = 0) {
  const db = await getDb();
  await db.run(`
    INSERT INTO source_stats (url, proxies_found, verified_live, last_scraped)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(url) DO UPDATE SET
    proxies_found = excluded.proxies_found,
    verified_live = verified_live + excluded.verified_live,
    last_scraped = CURRENT_TIMESTAMP
  `, [url, found, live]);
}

export async function getSourceStats() {
  const db = await getDb();
  return await db.all('SELECT * FROM source_stats ORDER BY proxies_found DESC');
}

export async function resetDatabase() {
  const db = await getDb();
  await db.exec(`
    DELETE FROM proxies;
    DELETE FROM source_stats;
    DELETE FROM system_logs;
    UPDATE system_status SET current_step = 'Idle', scanned_urls = 0, proxies_found = 0, verified_live = 0, is_running = 0, should_stop = 0 WHERE id = 1;
  `);
}

// Log functions
export async function logMessage(message: string, level: string = 'info') {
  const cleanMessage = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`;
  console.log(cleanMessage);
  try {
    const db = await getDb();
    await db.run('INSERT INTO system_logs (message, level) VALUES (?, ?)', [message, level]);
  } catch (e) {
    console.error('Failed to write log to DB:', e);
  }
}

export async function getLogs(limit: number = 100) {
  try {
    const db = await getDb();
    return await db.all('SELECT * FROM system_logs ORDER BY id DESC LIMIT ?', [limit]);
  } catch (e) {
    return [];
  }
}

export async function clearLogs() {
  try {
    const db = await getDb();
    await db.run('DELETE FROM system_logs');
  } catch (e) {}
}
