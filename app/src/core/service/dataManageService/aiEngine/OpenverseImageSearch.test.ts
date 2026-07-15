import { describe, expect, it, vi } from "vitest";
import {
  assertSafeRemoteImageUrl,
  downloadRemoteImage,
  findDownloadableOpenverseImage,
  searchOpenverseImages,
} from "./OpenverseImageSearch";

describe("OpenverseImageSearch", () => {
  it("拒绝非 HTTPS 和私有网络图片地址", () => {
    expect(() => assertSafeRemoteImageUrl("http://example.com/image.png")).toThrow("HTTPS");
    expect(() => assertSafeRemoteImageUrl("https://127.0.0.1/image.png")).toThrow("私有网络");
    expect(() => assertSafeRemoteImageUrl("https://192.168.1.2/image.png")).toThrow("私有网络");
    expect(() => assertSafeRemoteImageUrl("https://[::1]/image.png")).toThrow("私有网络");
    expect(() => assertSafeRemoteImageUrl("https://example.com/image.png")).not.toThrow();
  });

  it("解析 Openverse 搜索结果并启用安全过滤", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      Response.json({
        results: [
          {
            id: "image-1",
            title: "Mountain",
            url: "https://images.example.com/mountain.png",
            foreign_landing_url: "https://example.com/mountain",
            creator: "Author",
            license: "cc0",
            license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
            width: 1200,
            height: 800,
            mature: false,
          },
        ],
      }),
    );

    await expect(searchOpenverseImages("mountain", fetchImpl)).resolves.toHaveLength(1);
    const requestedUrl = new URL(fetchImpl.mock.calls[0][0]);
    expect(requestedUrl.searchParams.get("q")).toBe("mountain");
    expect(requestedUrl.searchParams.get("mature")).toBe("false");
    expect(requestedUrl.searchParams.get("license_type")).toBe("commercial,modification");
  });

  it("下载允许的图片格式", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(bytes, {
        headers: { "Content-Type": "image/png", "Content-Length": String(bytes.byteLength) },
      }),
    );

    const blob = await downloadRemoteImage("https://images.example.com/image.png", { fetchImpl });
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBe(bytes.byteLength);
  });

  it("拒绝重定向到私有网络", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { Location: "https://127.0.0.1/private.png" },
      }),
    );

    await expect(downloadRemoteImage("https://images.example.com/image.png", { fetchImpl })).rejects.toThrow(
      "私有网络",
    );
  });

  it("遇到临时错误时最多重试五次下载", async () => {
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(bytes, { headers: { "Content-Type": "image/png" } }));
    const retryDelay = vi.fn().mockResolvedValue(undefined);

    const blob = await downloadRemoteImage("https://images.example.com/image.png", { fetchImpl, retryDelay });

    expect(blob.type).toBe("image/png");
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(retryDelay).toHaveBeenCalledTimes(5);
    expect(retryDelay.mock.calls.map(([delayMs]) => delayMs)).toEqual([250, 500, 1000, 2000, 4000]);
  });

  it("确定性下载错误不会重试", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 404 }));
    const retryDelay = vi.fn().mockResolvedValue(undefined);

    await expect(
      downloadRemoteImage("https://images.example.com/missing.png", { fetchImpl, retryDelay }),
    ).rejects.toThrow("404");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(retryDelay).not.toHaveBeenCalled();
  });

  it("候选下载失败时自动尝试下一张", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith("https://api.openverse.org/")) {
        return Response.json({
          results: [
            { id: "bad", url: "http://unsafe.example.com/image.png", width: 100, height: 100 },
            { id: "good", url: "https://images.example.com/image.png", width: 100, height: 100 },
          ],
        });
      }
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "Content-Type": "image/png" },
      });
    });

    const result = await findDownloadableOpenverseImage("icon", { fetchImpl });
    expect(result.candidate.id).toBe("good");
  });

  it("候选图片解码失败时自动尝试下一张", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.startsWith("https://api.openverse.org/")) {
        return Response.json({
          results: [
            { id: "invalid-image", url: "https://images.example.com/invalid.png" },
            { id: "valid-image", url: "https://images.example.com/valid.png" },
          ],
        });
      }
      return new Response(new Uint8Array([137, 80, 78, 71]), {
        headers: { "Content-Type": "image/png" },
      });
    });
    const transform = vi.fn().mockRejectedValueOnce(new Error("decode failed")).mockResolvedValueOnce("prepared");

    const result = await findDownloadableOpenverseImage("icon", { fetchImpl, transform });
    expect(result.candidate.id).toBe("valid-image");
    expect(result.image).toBe("prepared");
  });
});
