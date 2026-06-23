import { NextResponse } from 'next/server';
import { getLogs, clearLogs } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limitStr = url.searchParams.get('limit') || '100';
    const limit = parseInt(limitStr, 10);
    const logs = await getLogs(limit);
    return NextResponse.json(logs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await clearLogs();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
