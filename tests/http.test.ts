import { describe, it, expect, vi, afterEach } from "vitest"
import { request, ApiError } from "../src/http"

describe("http request", () => {
  afterEach(() => vi.restoreAllMocks())

  it("sends correct auth header", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ identityId: "id-123" }),
    })
    vi.stubGlobal("fetch", mockFetch)
    await request("https://api.hivekey.ai", "mgent-key", "GET", "/v0/whoami")
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.hivekey.ai/v0/whoami",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer mgent-key" }),
      }),
    )
  })

  it("throws ApiError on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({ error: "unauthorized", message: "Invalid API key" }),
    }))
    await expect(request("https://api.hivekey.ai", "bad", "GET", "/v0/whoami")).rejects.toThrow(ApiError)
  })

  it("handles 204 no content", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 204 }))
    const result = await request("https://api.hivekey.ai", "mgent-key", "DELETE", "/v0/messages/123")
    expect(result).toBeUndefined()
  })

  it("sends body as JSON for POST", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 201,
      json: () => Promise.resolve({ messageId: "msg-1" }),
    })
    vi.stubGlobal("fetch", mockFetch)
    await request("https://api.hivekey.ai", "mgent-key", "POST", "/v0/messages/send", {
      to: ["a@b.com"], subject: "Hi", text: "Hello",
    })
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({ to: ["a@b.com"], subject: "Hi", text: "Hello" }),
      }),
    )
  })
})
