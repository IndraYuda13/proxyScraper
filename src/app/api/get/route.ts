import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const protocol = url.searchParams.get('protocol');
  const country = url.searchParams.get('country');
  const anonymity = url.searchParams.get('anonymity');
  const maxLatency = url.searchParams.get('max_latency');
  const format = url.searchParams.get('format') || 'json';
  const limitStr = url.searchParams.get('limit');

  let query = 'SELECT * FROM proxies WHERE status = "active"';
  const params: any[] = [];

  if (protocol) {
    query += ' AND protocol = ?';
    params.push(protocol.toLowerCase());
  }
  if (country) {
    query += ' AND country = ?';
    params.push(country.toUpperCase());
  }
  if (anonymity) {
    query += ' AND anonymity = ?';
    params.push(anonymity.charAt(0).toUpperCase() + anonymity.slice(1).toLowerCase());
  }
  if (maxLatency) {
    query += ' AND latency <= ?';
    params.push(parseInt(maxLatency, 10));
  }

  query += ' ORDER BY latency ASC';

  if (limitStr) {
    query += ' LIMIT ?';
    params.push(parseInt(limitStr, 10));
  }

  try {
    const db = await getDb();
    const proxies = await db.all(query, params);

    if (format === 'txt') {
      const txtContent = proxies.map((p: any) => `${p.ip}:${p.port}`).join('\n');
      return new Response(txtContent, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    if (format === 'csv') {
      const csvRows = [['ip', 'port', 'protocol', 'country', 'anonymity', 'latency', 'isp', 'asn'].join(',')];
      for (const p of proxies) {
        csvRows.push([p.ip, p.port, p.protocol, p.country, p.anonymity, p.latency, p.isp, p.asn].join(','));
      }
      return new Response(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="proxies.csv"'
        }
      });
    }

    // Default JSON
    return NextResponse.json(proxies);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
