# Base imaj olarak Node.js 20 kullan
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Gerekli sistem paketlerini yükle (patch komutu patchedDependencies için gerekli)
# Gerekli sistem paketlerini yükle (patch komutu ve dos2unix hatasız kurulum için)
RUN apt-get update && apt-get install -y openssl patch git python3 make g++ dos2unix && rm -rf /var/lib/apt/lists/*


# Build aşaması
FROM base AS build
WORKDIR /app

# Bağımlılık dosyalarını kopyala
# Bağımlılık dosyalarını kopyala
# Bağımlılık dosyalarını kopyala
COPY package.json ./

# Bağımlılıkları yükle (Lockfile olmadan taze kurulum yap)
RUN pnpm install

# Kaynak kodları kopyala
COPY . .

# Uygulamayı derle (Client ve Server)
RUN pnpm run build

# Production imajı
FROM base AS production
WORKDIR /app

# Sadece gerekli dosyaları kopyala
COPY --from=build /app/package.json ./
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
# Drizzle şemalarını da kopyalamak gerekebilir (migrate için)
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./

# Portu dışarı aç
ENV PORT=3000
EXPOSE 3000

# Uygulamayı başlat
CMD ["node", "dist/index.js"]
