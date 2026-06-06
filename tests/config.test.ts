import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

describe("resolveConfig", () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.spyOn(process, "exit").mockImplementation(() => { throw new Error("process.exit") })
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it("uses --api-key flag", async () => {
    const { resolveConfig } = await import("../src/config")
    const config = resolveConfig({ apiKey: "loid-test123" })
    expect(config.apiKey).toBe("loid-test123")
    expect(config.baseUrl).toBe("https://api.mailgent.dev")
  })

  it("uses MAILGENT_API_KEY env var", async () => {
    process.env.MAILGENT_API_KEY = "loid-fromenv"
    const { resolveConfig } = await import("../src/config")
    const config = resolveConfig({})
    expect(config.apiKey).toBe("loid-fromenv")
  })

  it("uses custom base URL from env", async () => {
    process.env.MAILGENT_API_KEY = "loid-test"
    process.env.MAILGENT_API_URL = "http://localhost:3001"
    const { resolveConfig } = await import("../src/config")
    const config = resolveConfig({})
    expect(config.baseUrl).toBe("http://localhost:3001")
  })

  it("exits if no API key provided", async () => {
    delete process.env.MAILGENT_API_KEY
    const { resolveConfig } = await import("../src/config")
    expect(() => resolveConfig({})).toThrow("process.exit")
  })
})
