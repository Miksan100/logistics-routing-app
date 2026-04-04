import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000';

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const { search } = new URL(req.url);
  const targetUrl = `${BACKEND}/api/${path}${search}`;

  const headers = new Headers();
  const auth = req.headers.get('authorization');
  const ct = req.headers.get('content-type');
  if (auth) headers.set('authorization', auth);
  if (ct) headers.set('content-type', ct);

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  const res = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: hasBody ? req.body : undefined,
    // @ts-ignore — needed for streaming body in Node 18+
    duplex: hasBody ? 'half' : undefined,
  });

  const resHeaders = new Headers();
  const resCt = res.headers.get('content-type');
  if (resCt) resHeaders.set('content-type', resCt);

  return new NextResponse(res.body, { status: res.status, headers: resHeaders });
}

export const GET     = handler;
export const POST    = handler;
export const PUT     = handler;
export const PATCH   = handler;
export const DELETE  = handler;
