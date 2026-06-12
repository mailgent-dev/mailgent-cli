import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import { vaultCommand } from "../src/commands/vault"

function stubFetch() {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({
      credentialId: "cred-1",
      name: "test",
      type: "API_KEY",
      metadata: null,
      createdAt: "2026-04-16T00:00:00Z",
    }),
  })
  vi.stubGlobal("fetch", mockFetch)
  return mockFetch
}

function lastBody(mockFetch: ReturnType<typeof stubFetch>) {
  const call = mockFetch.mock.calls.at(-1)!
  const init = call[1] as { body: string }
  return JSON.parse(init.body)
}

function lastUrl(mockFetch: ReturnType<typeof stubFetch>) {
  return String(mockFetch.mock.calls.at(-1)![0])
}

describe("vault store helpers", () => {
  beforeEach(() => {
    process.env.MAILGENT_API_KEY = "mgnt-test"
    vi.spyOn(console, "log").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.MAILGENT_API_KEY
  })

  it("store-api-key with --secret only sends legacy { key } shape", async () => {
    const mockFetch = stubFetch()
    await vaultCommand.parseAsync(
      ["store-api-key", "stripe", "--secret", "sk_live_abc123"],
      { from: "user" },
    )
    expect(lastUrl(mockFetch)).toContain("/v0/vault/stripe")
    const body = lastBody(mockFetch)
    expect(body.type).toBe("API_KEY")
    expect(body.data).toEqual({ key: "sk_live_abc123" })
    expect(body.metadata.clientId).toBeUndefined()
  })

  it("store-api-key with --client-id sends OAuth-style pair", async () => {
    const mockFetch = stubFetch()
    await vaultCommand.parseAsync(
      ["store-api-key", "twitter", "--client-id", "abc123", "--secret", "def456"],
      { from: "user" },
    )
    const body = lastBody(mockFetch)
    expect(body.data).toEqual({ clientId: "abc123", secret: "def456" })
    expect(body.metadata.clientId).toBe("abc123")
  })

  it("store-card builds CARD payload with last4 metadata", async () => {
    const mockFetch = stubFetch()
    await vaultCommand.parseAsync([
      "store-card", "personal-visa",
      "--cardholder", "Jane Doe",
      "--number", "4242 4242 4242 4242",
      "--exp-month", "12",
      "--exp-year", "2029",
      "--cvc", "123",
      "--zip", "94103",
      "--brand", "Visa",
    ], { from: "user" })
    const body = lastBody(mockFetch)
    expect(body.type).toBe("CARD")
    expect(body.data.cardholder).toBe("Jane Doe")
    expect(body.data.cvc).toBe("123")
    expect(body.metadata.last4).toBe("4242")
    expect(body.metadata.brand).toBe("Visa")
  })

  it("store-address builds SHIPPING_ADDRESS payload and uppercases country", async () => {
    const mockFetch = stubFetch()
    await vaultCommand.parseAsync([
      "store-address", "home",
      "--recipient", "Autonomous Agent",
      "--line1", "1 Demo Way",
      "--city", "San Francisco",
      "--state", "CA",
      "--postcode", "94103",
      "--country", "us",
      "--phone", "+1-555-0100",
    ], { from: "user" })
    const body = lastBody(mockFetch)
    expect(body.type).toBe("SHIPPING_ADDRESS")
    expect(body.data.line1).toBe("1 Demo Way")
    expect(body.data.country).toBe("US")
    expect(body.data.phone).toBe("+1-555-0100")
  })
})

describe("vault totp + backup codes", () => {
  beforeEach(() => {
    process.env.MAILGENT_API_KEY = "mgnt-test"
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.MAILGENT_API_KEY
  })

  it("totp prints code, expiry, and backup-codes-remaining when present", async () => {
    const logs: string[] = []
    vi.spyOn(console, "log").mockImplementation((m) => { logs.push(String(m)) })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "123456", remaining: 22, backupCodesRemaining: 4 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    await vaultCommand.parseAsync(["totp", "github-2fa"], { from: "user" })

    expect(lastUrl(mockFetch)).toContain("/v0/vault/github-2fa/totp")
    expect(logs.join("\n")).toContain("Code: 123456")
    expect(logs.join("\n")).toContain("expires in 22s")
    expect(logs.join("\n")).toContain("Backup codes remaining: 4")
  })

  it("totp omits backup-codes line when field is absent (older API)", async () => {
    const logs: string[] = []
    vi.spyOn(console, "log").mockImplementation((m) => { logs.push(String(m)) })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "654321", remaining: 17 }),
    }))

    await vaultCommand.parseAsync(["totp", "github-2fa"], { from: "user" })

    expect(logs.join("\n")).toContain("Code: 654321")
    expect(logs.join("\n")).not.toContain("Backup codes remaining")
  })

  it("totp-use-backup POSTs and prints the consumed backup code", async () => {
    const logs: string[] = []
    vi.spyOn(console, "log").mockImplementation((m) => { logs.push(String(m)) })
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "bk-aaaa-1111", remaining: 3 }),
    })
    vi.stubGlobal("fetch", mockFetch)

    await vaultCommand.parseAsync(["totp-use-backup", "github-2fa"], { from: "user" })

    const call = mockFetch.mock.calls.at(-1)!
    const init = call[1] as { method: string }
    expect(call[0]).toContain("/v0/vault/github-2fa/totp/backup")
    expect(init.method).toBe("POST")
    expect(logs.join("\n")).toContain("Backup code: bk-aaaa-1111")
    expect(logs.join("\n")).toContain("Backup codes remaining: 3")
  })

  it("totp-use-backup --json prints raw response", async () => {
    const logs: string[] = []
    vi.spyOn(console, "log").mockImplementation((m) => { logs.push(String(m)) })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true, status: 200,
      json: () => Promise.resolve({ code: "letters-and-digits-OK", remaining: 0 }),
    }))

    await vaultCommand.parseAsync(["totp-use-backup", "x", "--json"], { from: "user" })

    const out = JSON.parse(logs[0])
    expect(out.code).toBe("letters-and-digits-OK")
    expect(out.remaining).toBe(0)
  })

  it("totp-use-backup propagates 4xx as ApiError", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 400,
      json: () => Promise.resolve({ error: "bad_request", message: "No unused backup codes remaining", status: 400 }),
    }))

    await expect(
      vaultCommand.parseAsync(["totp-use-backup", "drained"], { from: "user" }),
    ).rejects.toThrow()
  })

  it("totp-use-backup propagates 404 as ApiError", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, status: 404,
      json: () => Promise.resolve({ error: "not_found", message: "Credential not found", status: 404 }),
    }))

    await expect(
      vaultCommand.parseAsync(["totp-use-backup", "missing"], { from: "user" }),
    ).rejects.toThrow()
  })
})
