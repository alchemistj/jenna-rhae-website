import {
  forwardMeasurementCollect,
  measurementCollectHealth,
  measurementHeaderValue,
} from "../server/lib/forwardMeasurementCollect.ts";

/**
 * Same-origin journey-event proxy. The browser posts here. This function
 * forwards the allowlisted payload to Reports. GET is a local health probe
 * and does not write a row.
 */
export const config = { runtime: "nodejs" };

type NodeHeaders = Record<string, string | string[] | undefined>;
type NodeRequest = {
  method?: string;
  headers?: Headers | NodeHeaders;
  body?: unknown;
} & Partial<AsyncIterable<Uint8Array | string>>;
type NodeResponse = {
  statusCode?: number;
  setHeader?(name: string, value: string): unknown;
  end?(body?: string): unknown;
};

function isNodeResponse(value: unknown): value is NodeResponse {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as NodeResponse).end === "function" &&
      typeof (value as NodeResponse).setHeader === "function",
  );
}

function headerFrom(headers: Headers | NodeHeaders | undefined, name: string): string {
  if (!headers) return "";
  if (typeof (headers as Headers).get === "function") {
    return measurementHeaderValue((headers as Headers).get(name) ?? undefined);
  }
  const record = headers as NodeHeaders;
  return measurementHeaderValue(record[name] ?? record[name.toLowerCase()]);
}

async function readNodeBody(request: NodeRequest): Promise<unknown> {
  if (request.body != null && request.body !== "") return request.body;
  if (typeof request[Symbol.asyncIterator] !== "function") return request.body;
  const chunks: Buffer[] = [];
  for await (const chunk of request as AsyncIterable<Uint8Array | string>) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk));
  }
  if (chunks.length === 0) return "";
  return Buffer.concat(chunks).toString("utf8");
}

export async function handleSiteEvents(input: {
  method?: string;
  body?: unknown;
  origin?: string;
  userAgent?: string;
  vercelEnv?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ status: number; body: string; contentType: string }> {
  const method = (input.method || "GET").toUpperCase();
  if (method === "GET") {
    return {
      status: 200,
      body: JSON.stringify(measurementCollectHealth()),
      contentType: "application/json",
    };
  }
  if (method !== "POST") {
    return {
      status: 405,
      body: JSON.stringify({ ok: false, error: "Method not allowed." }),
      contentType: "application/json",
    };
  }
  return forwardMeasurementCollect({
    body: input.body,
    origin: input.origin,
    userAgent: input.userAgent,
    vercelEnv: input.vercelEnv,
    fetchImpl: input.fetchImpl,
  });
}

export default async function handler(
  requestOrReq: Request | NodeRequest,
  res?: NodeResponse,
): Promise<Response | void> {
  const isWeb = typeof Request !== "undefined" && requestOrReq instanceof Request;
  const method = isWeb ? requestOrReq.method : (requestOrReq as NodeRequest).method;
  const origin = isWeb
    ? measurementHeaderValue(requestOrReq.headers.get("origin") ?? undefined)
    : headerFrom((requestOrReq as NodeRequest).headers, "origin");
  const userAgent = isWeb
    ? measurementHeaderValue(requestOrReq.headers.get("user-agent") ?? undefined)
    : headerFrom((requestOrReq as NodeRequest).headers, "user-agent");
  let body: unknown;
  if (isWeb && requestOrReq.method === "POST") body = await requestOrReq.text();
  else if (!isWeb && (requestOrReq as NodeRequest).method?.toUpperCase() === "POST") {
    body = await readNodeBody(requestOrReq as NodeRequest);
  }

  const result = await handleSiteEvents({
    method,
    body,
    origin,
    userAgent,
    vercelEnv: process.env.VERCEL_ENV,
  });

  if (res && isNodeResponse(res)) {
    res.statusCode = result.status;
    res.setHeader("Content-Type", result.contentType);
    res.setHeader("Cache-Control", "no-store");
    if (result.status === 405) res.setHeader("Allow", "GET, POST");
    res.end(result.body);
    return;
  }

  const headers = new Headers({
    "Content-Type": result.contentType,
    "Cache-Control": "no-store",
  });
  if (result.status === 405) headers.set("Allow", "GET, POST");
  return new Response(result.body, { status: result.status, headers });
}
