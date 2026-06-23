import { NextResponse } from 'next/server';
import { getDb, getStatus, getSourceStats, updateStatus, resetDatabase } from '@/lib/db';
import { runScraperCycle, cancelActiveSearch } from '@/lib/scraper';

export async function GET() {
  const db = await getDb();
  const proxies = await db.all('SELECT * FROM proxies ORDER BY latency ASC');
  const status = await getStatus();
  const sourceStats = await getSourceStats();
  return NextResponse.json({ proxies, status, sourceStats });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.action === 'stop') {
    await updateStatus({ should_stop: true, current_step: 'Stopping...' });
    cancelActiveSearch();
    return NextResponse.json({ status: 'stopping' });
  }
  if (body.action === 'reset') {
    const status = await getStatus();
    if (status?.is_running) {
      return NextResponse.json({ error: 'Cannot reset while running' }, { status: 400 });
    }
    await resetDatabase();
    return NextResponse.json({ status: 'reset' });
  }
  
  // Prevent duplicate runs
  const status = await getStatus();
  if (status?.is_running) {
    return NextResponse.json({ error: 'Scraper is already running' }, { status: 400 });
  }

  await updateStatus({ should_stop: false });
  runScraperCycle().catch(console.error);
  return NextResponse.json({ status: 'triggered' });
}
