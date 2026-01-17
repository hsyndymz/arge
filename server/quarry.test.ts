import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("quarry router", () => {
  it("should list all quarries", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const quarries = await caller.quarry.list();

    expect(Array.isArray(quarries)).toBe(true);
    expect(quarries.length).toBeGreaterThan(0);
    expect(quarries[0]).toHaveProperty("id");
    expect(quarries[0]).toHaveProperty("name");
    expect(quarries[0]).toHaveProperty("latitude");
    expect(quarries[0]).toHaveProperty("longitude");
  });

  it("should get quarry by id", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const quarries = await caller.quarry.list();
    const firstQuarry = quarries[0];

    if (firstQuarry) {
      const quarry = await caller.quarry.getById({ id: firstQuarry.id });
      expect(quarry).toBeDefined();
      expect(quarry?.id).toBe(firstQuarry.id);
      expect(quarry?.name).toBe(firstQuarry.name);
    }
  });

  it("should calculate distances to province", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quarry.getDistancesByProvince({
      provinceName: "Ankara",
    });

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty("distanceKm");
    expect(typeof result[0].distanceKm).toBe("number");

    // Check if sorted by distance
    for (let i = 1; i < result.length; i++) {
      expect(result[i].distanceKm).toBeGreaterThanOrEqual(result[i - 1].distanceKm);
    }
  });
});

describe("province router", () => {
  it("should list all provinces", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const provinces = await caller.province.list();

    expect(Array.isArray(provinces)).toBe(true);
    expect(provinces.length).toBe(81);
    expect(provinces[0]).toHaveProperty("id");
    expect(provinces[0]).toHaveProperty("name");
    expect(provinces[0]).toHaveProperty("latitude");
    expect(provinces[0]).toHaveProperty("longitude");
  });
});
