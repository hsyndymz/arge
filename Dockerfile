# Base imaj olarak Node.js 20 kullan
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Gerekli sistem paketlerini yükle (patch komutu patchedDependencies için gerekli)
RUN apt-get update && apt-get install -y openssl patch git python3 make g++ && rm -rf /var/lib/apt/lists/*


# Build aşaması
FROM base AS build
WORKDIR /app

# Bağımlılık dosyalarını kopyala
# Bağımlılık dosyalarını kopyala
COPY package.json pnpm-lock.yaml ./

# Patch klasörünü manuel oluştur ve dosya içeriğini yaz (Git sync sorununu aşmak için)
RUN mkdir -p patches && \
    printf 'diff --git a/esm/index.js b/esm/index.js\n\
index c83bc63a2c10431fb62e25b7d490656a3796f301..bcae513cc20a4be6c38dc116e0b8d9bacda62b5b 100644\n\
--- a/esm/index.js\n\
+++ b/esm/index.js\n\
@@ -338,6 +338,23 @@ const Switch = ({ children, location }) => {\n\
   const router = useRouter();\n\
   const [originalLocation] = useLocationFromRouter(router);\n\
 \n\
+  // Collect all route paths to window object\n\
+  if (typeof window !== "undefined") {\n\
+    if (!window.__WOUTER_ROUTES__) {\n\
+      window.__WOUTER_ROUTES__ = [];\n\
+    }\n\
+\n\
+    const allChildren = flattenChildren(children);\n\
+    allChildren.forEach((element) => {\n\
+      if (isValidElement(element) && element.props.path) {\n\
+        const path = element.props.path;\n\
+        if (!window.__WOUTER_ROUTES__.includes(path)) {\n\
+          window.__WOUTER_ROUTES__.push(path);\n\
+        }\n\
+      }\n\
+    });\n\
+  }\n\
+\n\
   for (const element of flattenChildren(children)) {\n\
     let match = 0;\n\
 \n' > patches/wouter@3.7.1.patch

# Bağımlılıkları yükle
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
