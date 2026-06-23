import axios from 'axios';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getDb, updateStatus, getStatus, updateSourceStat, logMessage } from './db';

// Prevent process crashes due to unhandled socket errors from unstable proxies
if (typeof process !== 'undefined') {
  process.on('uncaughtException', (err: any) => {
    const msg = err?.message || '';
    if (
      msg.includes('ECONNRESET') || 
      msg.includes('socket') || 
      msg.includes('TLS') || 
      msg.includes('connection') ||
      err?.code === 'ECONNRESET'
    ) {
      // Ignore silently
      return;
    }
    console.error('Unhandled Exception:', err);
  });

  process.on('unhandledRejection', (reason: any) => {
    // Ignore silently
  });
}

export interface ProxyItem {
  ip: string;
  port: string;
  protocol: string;
  source: string;
}

export async function testProxy(
  ip: string,
  port: string,
  protocol: string,
  timeout: number = 3000,
  targetUrl: string = 'http://ip-api.com/json'
): Promise<{
  working: boolean;
  latency?: number;
  anonymity?: string;
  country?: string;
  isp?: string;
  asn?: string;
}> {
  const proxyUrl = `${protocol}://${ip}:${port}`;
  let agent: any;

  try {
    if (protocol.startsWith('socks')) {
      agent = new SocksProxyAgent(proxyUrl);
    } else if (protocol === 'https') {
      agent = new HttpsProxyAgent(proxyUrl);
    } else {
      agent = new HttpProxyAgent(proxyUrl);
    }
  } catch (e) {
    return { working: false };
  }

  const start = Date.now();
  const isDefaultTarget = targetUrl.includes('ip-api.com');
  
  try {
    const response = await axios.get(targetUrl, {
      httpAgent: agent,
      httpsAgent: agent,
      timeout: timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const latency = Date.now() - start;
    if (isDefaultTarget) {
      if (response.data && response.data.status === 'success') {
        const data = response.data;
        const anonymity = data.query === ip ? 'Elite' : 'Anonymous';
        return {
          working: true,
          latency,
          anonymity,
          country: data.countryCode || 'Unknown',
          isp: data.isp || 'Unknown',
          asn: data.as || 'Unknown'
        };
      }
    } else {
      if (response.status >= 200 && response.status < 400) {
        return {
          working: true,
          latency,
          anonymity: 'Anonymous',
          country: 'Unknown',
          isp: 'Unknown',
          asn: 'Unknown'
        };
      }
    }
  } catch (err) {
    if (isDefaultTarget) {
      try {
        const startFallback = Date.now();
        await axios.get('http://www.google.com', {
          httpAgent: agent,
          httpsAgent: agent,
          timeout: timeout
        });
        return {
          working: true,
          latency: Date.now() - startFallback,
          anonymity: 'Transparent',
          country: 'Unknown',
          isp: 'Unknown',
          asn: 'Unknown'
        };
      } catch (e) {
        // failed
      }
    }
  }

  return { working: false };
}

export async function checkAndSaveProxies(proxies: ProxyItem[]) {
  const db = await getDb();
  
  const uniqueProxies = Array.from(
    new Map(proxies.map(p => [`${p.ip}:${p.port}:${p.protocol}`, p])).values()
  );

  const sysConfig = await getStatus();
  const timeout = sysConfig?.check_timeout || 3000;
  const concurrencyLimit = sysConfig?.check_concurrency || 200;
  const targetUrl = sysConfig?.test_target_url || 'http://ip-api.com/json';

  await logMessage(`Starting verification of ${uniqueProxies.length} unique proxies...`, 'info');
  await logMessage(`Check Configuration: Timeout=${timeout}ms, Concurrency=${concurrencyLimit}, Target=${targetUrl}`, 'info');

  await updateStatus({ current_step: 'Multi-Thread Check', proxies_found: uniqueProxies.length });

  // Optimize: Load existing proxies into a memory Set to avoid redundant database DELETE locks
  const existingProxies = await db.all('SELECT ip, port, protocol FROM proxies').catch(() => []);
  const existingSet = new Set(existingProxies.map((ep: any) => `${ep.ip}:${ep.port}:${ep.protocol}`));

  let liveCount = 0;
  let processed = 0;
  
  const sourceSuccess: Record<string, number> = {};
  const activePromises = new Set<Promise<void>>();
  let isStopped = false;

  for (const p of uniqueProxies) {
    if (isStopped) {
      break;
    }

    const task = testProxy(p.ip, p.port, p.protocol, timeout, targetUrl).then(async testResult => {
      if (testResult.working) {
        liveCount++;
        sourceSuccess[p.source] = (sourceSuccess[p.source] || 0) + 1;
        await db.run(
          `INSERT INTO proxies (ip, port, protocol, country, anonymity, latency, status, last_checked, source_url, isp, asn)
           VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?, ?)
           ON CONFLICT(ip, port, protocol) DO UPDATE SET
           country = excluded.country,
           anonymity = excluded.anonymity,
           latency = excluded.latency,
           status = excluded.status,
           last_checked = CURRENT_TIMESTAMP,
           isp = excluded.isp,
           asn = excluded.asn`,
          [
            p.ip,
            p.port,
            p.protocol,
            testResult.country,
            testResult.anonymity,
            testResult.latency,
            'active',
            p.source,
            testResult.isp || 'Unknown',
            testResult.asn || 'Unknown'
          ]
        );
      } else {
        const key = `${p.ip}:${p.port}:${p.protocol}`;
        if (existingSet.has(key)) {
          await db.run(
            `DELETE FROM proxies WHERE ip = ? AND port = ? AND protocol = ?`,
            [p.ip, p.port, p.protocol]
          );
        }
      }
    }).catch(() => {
    }).finally(() => {
      processed++;
      if (processed % 50 === 0) {
        getDb().then(database => {
          database.get('SELECT COUNT(*) as count FROM proxies WHERE status = "active"').then((row: any) => {
            updateStatus({ verified_live: row?.count || 0 }).catch(() => {});
          });
        });
      }
    });

    const promiseObj: any = task.finally(() => activePromises.delete(promiseObj));
    activePromises.add(promiseObj);

    if (activePromises.size >= concurrencyLimit) {
      await Promise.race(activePromises);
      
      // Asynchronously fetch status when concurrency limit is reached to check for stop signal
      const status = await getStatus();
      if (status?.should_stop) {
        await logMessage('Stop signal detected. Aborting checking process.', 'warn');
        isStopped = true;
        break;
      }
    }
  }

  // Await any remaining active in-flight promises before finishing, preventing SQLite locks
  await Promise.all(activePromises).catch(() => {});

  const liveInDb = await db.get('SELECT COUNT(*) as count FROM proxies WHERE status = "active"');
  await updateStatus({ verified_live: liveInDb?.count || 0 });
  await logMessage(`Verification finished. Chunk live proxies found: ${liveCount}/${uniqueProxies.length}. Total active pool: ${liveInDb?.count || 0}`, 'info');

  for (const [sourceUrl, successCount] of Object.entries(sourceSuccess)) {
    await updateSourceStat(sourceUrl, 0, successCount);
  }
}
