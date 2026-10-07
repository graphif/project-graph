/**
 * AI SDK 传给 fetch 的 body 可能是 ReadableStream 等类型，
 * 而 @tauri-apps/plugin-http 只稳定支持字符串/二进制 body，
 * 遇到不支持的 body 会发送空 body（服务端会因此返回 400）。
 * 这里统一转换成字符串，保证请求体不丢失。
 */
export async function resolveHttpRequestBody(body: unknown): Promise<string | undefined> {
  if (body == null) return undefined;
  if (typeof body === "string") return body;
  if (body instanceof ReadableStream) return await new Response(body).text();
  if (body instanceof Blob) return await body.text();
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
  if (ArrayBuffer.isView(body)) return new TextDecoder().decode(body as ArrayBufferView);
  if (body instanceof FormData) {
    throw new Error("AI 请求暂不支持 FormData 请求体");
  }
  return String(body);
}
