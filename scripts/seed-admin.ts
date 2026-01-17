
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users } from "../drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

console.log("Seed script baslatiliyor...");
console.log("Database URL:", process.env.DATABASE_URL ? "Mevcut" : "Eksik");

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL bulunamadı!");
    }

    const connection = await mysql.createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);

    console.log("Veritabani baglantisi basarili.");

    const email = "huseyin.duymaz@kgm.gov.tr";
    const password = "deneme.21";

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Mevcut kullanıcıyı kontrol et
    const existingUser = await db.select().from(users).where(eq(users.email, email));

    if (existingUser.length > 0) {
        console.log("Kullanıcı zaten var, şifresi güncelleniyor...");
        await db.update(users).set({
            password: hashedPassword,
            approved: true,
            role: 'admin',
            openId: 'admin_manual_1', // Login sorununu aşmak için fake openId
            loginMethod: 'email',
        }).where(eq(users.email, email));
    } else {
        console.log("Yeni admin kullanıcısı oluşturuluyor...");
        await db.insert(users).values({
            email,
            password: hashedPassword,
            name: "Admin",
            role: 'admin',
            approved: true,
            openId: 'admin_manual_1', // Login sorununu aşmak için fake openId
            loginMethod: 'email',
            lastSignedIn: new Date(),
        });
    }

    console.log("Admin kullanıcısı başarıyla eklendi/güncellendi! ✅");
    await connection.end();
}

main().catch((err) => {
    console.error("Hata oluştu:", err);
    process.exit(1);
});
