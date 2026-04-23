import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) =>
      index === 0 ? part.replace(/\/+$/g, "") : part.replace(/^\/+|\/+$/g, "")
    )
    .filter(Boolean)
    .join("/");
}

function getUpstreamUrl(path: string[], search: string): URL {
  const base = process.env.API_URL;
  if (!base) {
    throw new Error("API_URL is not configured");
  }

  const upstream = new URL(base);
  upstream.pathname = `/${joinPath(upstream.pathname, "api", ...path)}`;
  upstream.search = search;
  return upstream;
}

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path } = await context.params;

  let upstreamUrl: URL;
  try {
    upstreamUrl = getUpstreamUrl(path, request.nextUrl.search);
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

export function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}

export function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return proxy(request, context);
}
