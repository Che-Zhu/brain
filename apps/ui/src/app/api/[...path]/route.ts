import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const TRAILING_SLASHES = /\/+$/;

function getUpstreamUrl(request: NextRequest): URL {
  const base = process.env.API_URL;
  if (!base) {
    throw new Error("API_URL is not configured");
  }

  const upstream = new URL(base);
  const prefix = upstream.pathname.replace(TRAILING_SLASHES, "");
  upstream.pathname = prefix + request.nextUrl.pathname;
  upstream.search = request.nextUrl.search;
  return upstream;
}

async function proxy(request: NextRequest) {
  let upstreamUrl: URL;
  try {
    upstreamUrl = getUpstreamUrl(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "API proxy is misconfigured";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const headers = new Headers(request.headers);
  headers.delete("host");
  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer();

  let response: Response;
  try {
    response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upstream API request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

export function GET(request: NextRequest) {
  return proxy(request);
}

export function POST(request: NextRequest) {
  return proxy(request);
}

export function PUT(request: NextRequest) {
  return proxy(request);
}

export function PATCH(request: NextRequest) {
  return proxy(request);
}

export function DELETE(request: NextRequest) {
  return proxy(request);
}
