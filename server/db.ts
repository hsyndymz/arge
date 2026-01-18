import { eq, sql, and, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import { InsertUser, users, quarries, provinces, Quarry, Province, InsertQuarry } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getAllQuarries(): Promise<Quarry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quarries);
}

export async function getQuarryById(id: number): Promise<Quarry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(quarries).where(eq(quarries.id, id)).limit(1);
  return result[0];
}

export async function searchQuarries(query: string): Promise<Quarry[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(quarries).where(
    sql`${quarries.name} LIKE ${`%${query}%`} OR ${quarries.province} LIKE ${`%${query}%`} OR ${quarries.district} LIKE ${`%${query}%`}`
  );
}

export async function updateQuarry(id: number, data: Partial<Quarry>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(quarries).set(data).where(eq(quarries.id, id));
}

export async function getAllProvinces(): Promise<Province[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(provinces);
}

export async function getProvinceByName(name: string): Promise<Province | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(provinces).where(eq(provinces.name, name)).limit(1);
  return result[0];
}

// Haversine formula to calculate distance between two coordinates
export async function createQuarry(data: Omit<InsertQuarry, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const result = await db.insert(quarries).values({
    name: data.name,
    latitude: data.latitude,
    longitude: data.longitude,
    imageUrl: data.imageUrl || null,
    description: data.description || null,
    province: data.province || null,
    district: data.district || null,
  });

  return Number(result[0].insertId);
}

export async function createQuarriesBulk(data: Omit<InsertQuarry, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const values = data.map(q => ({
    name: q.name,
    latitude: q.latitude,
    longitude: q.longitude,
    imageUrl: q.imageUrl || null,
    description: q.description || null,
    province: q.province || null,
    district: q.district || null,
  }));

  await db.insert(quarries).values(values);
}

export async function deleteQuarry(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.delete(quarries).where(eq(quarries.id, id));
}

export async function deleteQuarriesBulk(ids: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  for (const id of ids) {
    await db.delete(quarries).where(eq(quarries.id, id));
  }
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function approveUser(id: number) {
  const db = await getDb();
  if (!db) return null;
  await db.update(users).set({ approved: true }).where(eq(users.id, id));
}

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.approved, false));
}

export async function createUser(data: { email: string; password: string; approved?: boolean }) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(users).values({
    openId: nanoid(),
    email: data.email,
    password: data.password,
    role: "user",
    loginMethod: "email",
    approved: data.approved ?? false,
  });
  return result;
}
