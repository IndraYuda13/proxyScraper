import { NextResponse } from 'next/server';
import { getStatus, updateStatus } from '@/lib/db';

export async function GET() {
  try {
    const status = await getStatus();
    return NextResponse.json(status);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const updateObj: any = {};
    
    if (body.check_timeout !== undefined) updateObj.check_timeout = parseInt(body.check_timeout, 10);
    if (body.check_concurrency !== undefined) updateObj.check_concurrency = parseInt(body.check_concurrency, 10);
    if (body.test_target_url !== undefined) updateObj.test_target_url = body.test_target_url.trim();
    if (body.ai_api_key !== undefined) updateObj.ai_api_key = body.ai_api_key.trim();
    if (body.ai_endpoint !== undefined) updateObj.ai_endpoint = body.ai_endpoint.trim();
    if (body.ai_enabled !== undefined) updateObj.ai_enabled = body.ai_enabled ? 1 : 0;

    await updateStatus(updateObj);
    return NextResponse.json({ success: true, updated: updateObj });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
