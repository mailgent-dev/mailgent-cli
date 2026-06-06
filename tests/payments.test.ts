import { describe, it, expect, vi, afterEach, beforeEach } from "vitest"
import {
  payCommand,
  activityCommand,
  mandateCommand,
} from "../src/commands/payments"

function stubFetch(response: { status?: number; body?: any } = {}) {
  const mockFetch = vi.fn().mockResolvedValue({
    ok: (response.status ?? 200) < 400,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.body ?? {}),
  })
  vi.stubGlobal("fetch", mockFetch)
  return mockFetch
}

function lastUrl(mockFetch: ReturnType<typeof stubFetch>) {
  return String(mockFetch.mock.calls.at(-1)![0])
}

function lastBody(mockFetch: ReturnType<typeof stubFetch>) {
  const init = mockFetch.mock.calls.at(-1)![1] as { body?: string }
  return init.body ? JSON.parse(init.body) : null
}

beforeEach(() => {
  process.env.MAILGENT_API_KEY = "loid-test"
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.MAILGENT_API_KEY
})

describe("mailgent pay", () => {
  it("POSTs to /v0/payments/pay with the url", async () => {
    const mockFetch = stubFetch({
      status: 200,
      body: {
        ok: true,
        status: 200,
        cost: { amountUsdc: "0.05", amountUsdcRaw: "50000", network: "base" },
        txHash: "0xabc",
        payer: "0xpayer",
        recipient: "0xrecipient",
        resource: "https://seller.example.com/search",
        balanceAfter: { usdc: "0.95", usdcRaw: "950000" },
        mandate: {
          mandateId: "m_1",
          spentTodayUsdcRaw: "50000",
          dailyCapUsdcRaw: "1000000",
          remainingTodayUsdcRaw: "950000",
          validUntil: "2027-01-01T00:00:00Z",
        },
        content: { ok: true },
      },
    })
    await payCommand.parseAsync(["https://seller.example.com/search"], { from: "user" })

    expect(lastUrl(mockFetch)).toContain("/v0/payments/pay")
    expect(lastBody(mockFetch)).toEqual({ url: "https://seller.example.com/search" })
  })

  it("forwards --dry-run as dryRun", async () => {
    const mockFetch = stubFetch({
      status: 200,
      body: {
        ok: true,
        status: 200,
        cost: { amountUsdc: "0.05", amountUsdcRaw: "50000", network: "base" },
        txHash: null,
        payer: "0xpayer",
        recipient: "0xrecipient",
        resource: "https://x",
        balanceAfter: { usdc: "1.00", usdcRaw: "1000000" },
        mandate: {
          mandateId: "m_1",
          spentTodayUsdcRaw: "0",
          dailyCapUsdcRaw: "1000000",
          remainingTodayUsdcRaw: "1000000",
          validUntil: "2027-01-01T00:00:00Z",
        },
      },
    })
    await payCommand.parseAsync(["https://x", "--dry-run"], { from: "user" })
    expect(lastBody(mockFetch)?.dryRun).toBe(true)
  })

  it("exits 1 on ok=false failure", async () => {
    stubFetch({
      status: 402,
      body: {
        ok: false,
        code: "mandate_per_call_exceeded",
        message: "Price too high",
      },
    })
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`exit ${code}`)
    }) as never)

    await expect(payCommand.parseAsync(["https://x"], { from: "user" })).rejects.toThrow(/exit 1/)
    expect(exitSpy).toHaveBeenCalledWith(1)
  })
})

describe("mailgent activity", () => {
  it("GETs /v0/payments/activity with default limit", async () => {
    const mockFetch = stubFetch({
      status: 200,
      body: { activity: [], count: 0 },
    })
    await activityCommand.parseAsync([], { from: "user" })

    expect(lastUrl(mockFetch)).toContain("/v0/payments/activity?limit=50")
  })

  it("forwards --limit", async () => {
    const mockFetch = stubFetch({ status: 200, body: { activity: [], count: 0 } })
    await activityCommand.parseAsync(["--limit", "25"], { from: "user" })
    expect(lastUrl(mockFetch)).toContain("limit=25")
  })
})

describe("mailgent mandate", () => {
  it("create POSTs to /v0/payments/mandates with the caps", async () => {
    const mockFetch = stubFetch({
      status: 200,
      body: {
        mandateId: "m_new",
        identityId: "id-1",
        network: "base",
        maxPerCallUsdc: "0.10",
        dailyCapUsdc: "1.00",
        validUntil: "2027-01-01T00:00:00Z",
        sessionKeyAddress: "0xsession",
        onchainInstalled: true,
        installTxHash: "0xinstall",
        installError: null,
        spentTodayUsdc: "0",
        remainingTodayUsdc: "1.00",
        totalSpentUsdc: "0",
        callCount: 0,
        revokedAt: null,
        createdAt: "2026-05-12T00:00:00Z",
      },
    })
    await mandateCommand.parseAsync(["create"], { from: "user" })

    expect(lastUrl(mockFetch)).toContain("/v0/payments/mandates")
    const body = lastBody(mockFetch)
    expect(body.maxPerCallUsdc).toBe("0.10")
    expect(body.dailyCapUsdc).toBe("1.00")
  })

  it("list calls GET /v0/payments/mandates", async () => {
    const mockFetch = stubFetch({
      status: 200,
      body: { mandates: [] },
    })
    await mandateCommand.parseAsync(["list"], { from: "user" })
    expect(lastUrl(mockFetch)).toContain("/v0/payments/mandates")
  })

  it("get url-encodes the id", async () => {
    const mockFetch = stubFetch({
      status: 200,
      body: {
        mandateId: "m/abc",
        identityId: "id-1",
        network: "base",
        maxPerCallUsdc: "0.10",
        dailyCapUsdc: "1.00",
        validUntil: "2027-01-01T00:00:00Z",
        sessionKeyAddress: "0xsession",
        onchainInstalled: true,
        installTxHash: null,
        installError: null,
        spentTodayUsdc: "0",
        remainingTodayUsdc: "1.00",
        totalSpentUsdc: "0",
        callCount: 0,
        revokedAt: null,
        createdAt: "2026-05-12T00:00:00Z",
      },
    })
    await mandateCommand.parseAsync(["get", "m/abc"], { from: "user" })
    expect(lastUrl(mockFetch)).toContain("/v0/payments/mandates/m%2Fabc")
  })

  it("revoke calls DELETE", async () => {
    const mockFetch = stubFetch({ status: 204 })
    await mandateCommand.parseAsync(["revoke", "m_abc"], { from: "user" })
    expect(lastUrl(mockFetch)).toContain("/v0/payments/mandates/m_abc")
    const init = mockFetch.mock.calls.at(-1)![1] as { method: string }
    expect(init.method).toBe("DELETE")
  })
})
