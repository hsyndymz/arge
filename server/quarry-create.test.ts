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

describe("quarry create operations", () => {
  it("should create a new quarry", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.quarry.create({
      name: "Test Ocağı",
      latitude: "39.123456",
      longitude: "35.654321",
      description: "Test açıklaması",
      province: "Ankara",
      district: "Çankaya",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("should create multiple quarries in bulk", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const quarries = [
      {
        name: "Toplu Ocak 1",
        latitude: "40.123456",
        longitude: "36.654321",
      },
      {
        name: "Toplu Ocak 2",
        latitude: "41.123456",
        longitude: "37.654321",
      },
    ];

    const result = await caller.quarry.createBulk({ quarries });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
  });

  it("should update an existing quarry", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    // First create a quarry
    const created = await caller.quarry.create({
      name: "Güncellenecek Ocak",
      latitude: "39.5",
      longitude: "35.5",
    });

    // Then update it
    const result = await caller.quarry.update({
      id: created.id,
      name: "Güncellenmiş Ocak",
      description: "Yeni açıklama",
    });

    expect(result.success).toBe(true);

    // Verify the update
    const updated = await caller.quarry.getById({ id: created.id });
    expect(updated?.name).toBe("Güncellenmiş Ocak");
    expect(updated?.description).toBe("Yeni açıklama");
  });
});

describe("quarry delete operations", () => {
  it("should delete a single quarry", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.quarry.create({
      name: "Silinecek Ocak",
      latitude: "39.5",
      longitude: "35.5",
    });

    const result = await caller.quarry.delete({ id: created.id });
    expect(result.success).toBe(true);

    const deleted = await caller.quarry.getById({ id: created.id });
    expect(deleted).toBeUndefined();
  });

  it("should delete multiple quarries in bulk", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const q1 = await caller.quarry.create({
      name: "Toplu Silinecek 1",
      latitude: "40.5",
      longitude: "36.5",
    });

    const q2 = await caller.quarry.create({
      name: "Toplu Silinecek 2",
      latitude: "41.5",
      longitude: "37.5",
    });

    const result = await caller.quarry.deleteBulk({ ids: [q1.id, q2.id] });
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    const deleted1 = await caller.quarry.getById({ id: q1.id });
    const deleted2 = await caller.quarry.getById({ id: q2.id });
    expect(deleted1).toBeUndefined();
    expect(deleted2).toBeUndefined();
  });
});
