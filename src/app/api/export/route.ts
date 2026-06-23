import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'csv';
  
  const db = await getDb();
  const proxies = await db.all('SELECT * FROM proxies WHERE status = "active" ORDER BY latency ASC');

  if (format === 'txt') {
    const txt = proxies.map((row: any) => `${row.ip}:${row.port}`).join('\n');
    return new Response(txt, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': 'attachment; filename="proxies.txt"'
      }
    });
  }

  if (format === 'json') {
    return new Response(JSON.stringify(proxies, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="proxies.json"'
      }
    });
  }

  if (format === 'clash') {
    let yaml = 'proxies:\n';
    proxies.forEach((row: any, index: number) => {
      const type = row.protocol.toLowerCase();
      const proxyType = type === 'https' ? 'http' : (type === 'socks4' ? 'socks5' : type);
      yaml += `  - { name: "Proxy-${index + 1}-${row.country}", type: ${proxyType}, server: ${row.ip}, port: ${row.port} }\n`;
    });
    return new Response(yaml, {
      headers: {
        'Content-Type': 'text/yaml',
        'Content-Disposition': 'attachment; filename="clash_proxies.yaml"'
      }
    });
  }

  // Default: CSV
  const csvRows = [];
  csvRows.push(['ip', 'port', 'protocol', 'country', 'anonymity', 'latency', 'isp', 'asn', 'last_checked'].join(','));
  
  for (const row of proxies) {
    csvRows.push([
      row.ip,
      row.port,
      row.protocol,
      row.country,
      row.anonymity,
      row.latency,
      `"${row.isp || ''}"`,
      `"${row.asn || ''}"`,
      row.last_checked
    ].join(','));
  }

  return new Response(csvRows.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="proxies.csv"'
    }
  });
}
