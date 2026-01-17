import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { 
  getAllQuarries, 
  getQuarryById, 
  searchQuarries, 
  updateQuarry,
  getAllProvinces,
  getProvinceByName,
  calculateDistance,
  createQuarry,
  createQuarriesBulk,
  deleteQuarry,
  deleteQuarriesBulk,
  getUserByEmail,
  createUser,
  approveUser,
  getPendingUsers
} from "./db";
import { makeRequest } from "./_core/map";
import { getAllUsers, updateUserRole, deleteUser } from "./userManagement";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "@shared/const";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),


    approveUserRegistration: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error("Sadece yöneticiler kullanıcı onaylayabilir");
        }
        await approveUser(input.userId);
        return { success: true };
      }),

    getPendingRegistrations: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error("Sadece yöneticiler bunu görebilir");
        }
        return await getPendingUsers();
      }),

    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.password) {
          throw new Error("Geçersiz email veya şifre");
        }

        const isValid = await bcrypt.compare(input.password, user.password);
        if (!isValid) {
          throw new Error("Geçersiz email veya şifre");
        }

        if (!user.approved) {
          throw new Error("Hesabınız henüz yönetici tarafından onaylanmamış");
        }
        
        if (!user.openId) {
             throw new Error("Kullanıcı kimliği bulunamadı");
        }

        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

        return { success: true, user };
      }),
  }),

  quarry: router({
    list: publicProcedure.query(async () => {
      return await getAllQuarries();
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await getQuarryById(input.id);
      }),

    search: publicProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await searchQuarries(input.query);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string(),
        latitude: z.string(),
        longitude: z.string(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
        province: z.string().optional(),
        district: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await createQuarry(input);
        return { id, success: true };
      }),

    createBulk: publicProcedure
      .input(z.object({
        quarries: z.array(z.object({
          name: z.string(),
          latitude: z.string(),
          longitude: z.string(),
          imageUrl: z.string().optional(),
          description: z.string().optional(),
          province: z.string().optional(),
          district: z.string().optional(),
        }))
      }))
      .mutation(async ({ input }) => {
        await createQuarriesBulk(input.quarries);
        return { success: true, count: input.quarries.length };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        province: z.string().optional(),
        district: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateQuarry(id, data);
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteQuarry(input.id);
        return { success: true };
      }),

    deleteBulk: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        await deleteQuarriesBulk(input.ids);
        return { success: true, count: input.ids.length };
      }),

    getDistancesByProvince: publicProcedure
      .input(z.object({ provinceName: z.string() }))
      .query(async ({ input }) => {
        const province = await getProvinceByName(input.provinceName);
        if (!province) {
          throw new Error("Province not found");
        }

        const allQuarries = await getAllQuarries();
        const quarriesWithDistance = allQuarries.map(quarry => {
          const distance = calculateDistance(
            parseFloat(province.latitude.toString()),
            parseFloat(province.longitude.toString()),
            parseFloat(quarry.latitude.toString()),
            parseFloat(quarry.longitude.toString())
          );
          return {
            ...quarry,
            distanceKm: distance,
          };
        });

        return quarriesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
      }),

    getRoute: publicProcedure
      .input(z.object({
        originLat: z.number(),
        originLng: z.number(),
        destLat: z.number(),
        destLng: z.number(),
      }))
      .query(async ({ input }) => {
        const response = await makeRequest(
          "/routes/directions/json",
          {
            origin: `${input.originLat},${input.originLng}`,
            destination: `${input.destLat},${input.destLng}`,
            mode: "driving",
          }
        );
        return response;
      }),
  }),

  province: router({
    list: publicProcedure.query(async () => {
      return await getAllProvinces();
    }),
  }),

  admin: router({
    getAllUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user?.role !== 'admin') {
        throw new Error("Sadece yöneticiler bunu görebilir");
      }
      return await getAllUsers();
    }),

    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error("Sadece yöneticiler bunu yapabilir");
        }
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    deleteUser: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error("Sadece yöneticiler bunu yapabilir");
        }
        await deleteUser(input.userId);
        return { success: true };
      }),

    createUser: protectedProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== 'admin') {
          throw new Error("Sadece yöneticiler kullanıcı oluşturabilir");
        }
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new Error("Bu email zaten kayıtlı");
        }
        const hashedPassword = await bcrypt.hash(input.password, 10);
        await createUser({ email: input.email, password: hashedPassword, approved: true });
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
