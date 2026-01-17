# Ocak Takip Sistemi - TODO

## Veritabanı ve Veri Yükleme
- [x] Ocak tablosu şeması oluştur (id, name, latitude, longitude, imageUrl, description, province, district)
- [x] 81 il merkezi koordinatları tablosu oluştur
- [x] KML verilerini veritabanına seed script ile yükle

## Backend API
- [x] Ocak listesi endpoint (quarry.list)
- [x] Ocak detay endpoint (quarry.getById)
- [x] Ocak güncelleme endpoint (quarry.update)
- [x] İl listesi endpoint (province.list)
- [x] İle göre mesafe hesaplama endpoint (quarry.getDistancesByProvince)
- [x] İki ocak arası rota endpoint (quarry.getRoute)
- [x] Haversine mesafe hesaplama fonksiyonu
- [x] Google Maps Directions API entegrasyonu

## Frontend - Harita
- [x] Google Maps entegrasyonu
- [x] Tüm ocakları marker olarak gösterme
- [x] Marker tıklandığında seçili hale getirme
- [x] Seçili marker'ı vurgulama
- [x] İki ocak arası rota çizgisi gösterme

## Frontend - UI Bileşenleri
- [x] Ana sayfa layout
- [x] Harita bileşeni
- [x] Ocak listesi paneli
- [x] Ocak detay modal/panel
- [x] İl seçim dropdown
- [x] İlçe filtreleme
- [x] Arama kutusu
- [x] Mesafe bilgisi gösterimi
- [x] Rota bilgisi paneli

## Özellikler
- [x] İl seçildiğinde mesafe hesaplama ve sıralama
- [x] İki ocak seçerek rota planlama
- [x] Ocak bilgilerini düzenleme
- [x] Fotoğraf URL güncelleme
- [x] Responsive tasarım

## Test ve Deployment
- [x] Tüm özellikleri test et
- [x] Checkpoint oluştur

## Yeni Özellikler

### Manuel ve Dosya ile Ocak Ekleme
- [x] Backend: Yeni ocak ekleme endpoint (quarry.create)
- [x] Backend: KML/KMZ dosya parse fonksiyonu
- [x] Backend: Toplu ocak ekleme endpoint (quarry.createBulk)
- [x] Frontend: Manuel ocak ekleme formu
- [x] Frontend: Harita üzerinde tıklayarak konum seçme
- [x] Frontend: KML/KMZ dosya yükleme bileşeni
- [x] Frontend: Dosyadan parse edilen ocakları önizleme

### Rota Planlama İyileştirmeleri
- [x] Frontend: Harita üzerinde başlangıç noktası seçme
- [x] Frontend: Harita üzerinde hedef noktası seçme
- [x] Frontend: Seçilen noktaları marker ile gösterme
- [x] Frontend: Seçili noktaları temizleme butonu

## Ocak Silme Özelliği
- [x] Backend: Tekil ocak silme endpoint (quarry.delete)
- [x] Backend: Toplu ocak silme endpoint (quarry.deleteBulk)
- [x] Frontend: Detay modal'ında silme butonu
- [x] Frontend: Silme onay dialog'u
- [x] Frontend: Toplu silme checkbox'ları


## KMZ Dosyası Düzeltme
- [x] KMZ dosyasını ZIP olarak açma ve KML extract etme


## Yetkilendirme - Sadece Giriş Yapanlar Düzenleyebilir
- [x] Ocak ekleme butonunu gizle (ziyaretçi için)
- [x] KML/KMZ yükleme butonunu gizle (ziyaretçi için)
- [x] Toplu sil butonunu gizle (ziyaretçi için)
- [x] Detay modal'ında düzenleme/silme butonlarını gizle (ziyaretçi için)
- [x] Giriş yap linki göster (ziyaretçi için)


## Harita Arama Özelliği
- [x] Google Places Autocomplete arama kutusu ekle
- [x] Harita üzerinde arama sonuçlarını göster
- [x] Seçilen konuma harita zoom et


## Email/Şifre Giriş Sistemi
- [x] Frontend'de giriş formu ekle
- [x] Frontend'de kayıt formu ekle
- [x] Backend'e email/şifre giriş endpoint'leri ekle
- [x] Veritabanı şemasına password alanı ekle
- [x] Ziyaretçiler için ocak detay bilgilerini gizle (açıklama, fotoğraf)
- [x] Giriş yapanlar için tüm bilgileri göster


## Ziyaretçi Girişi
- [x] Giriş sayfasına "Ziyaretçi Olarak Devam Et" butonu ekle
- [x] Ziyaretçiler doğrudan harita sayfasına erişebilsin


## Ocak Detay Modal Gizleme
- [x] Ziyaretçiler ocak marker'ına tıkladığında sadece ad ve konum görsün
- [x] Açıklama ve resim sadece giriş yapanlara gösterilsin
- [x] Düzenleme ve silme butonları sadece giriş yapanlara gösterilsin


## Üye Yönetim Sistemi
- [x] Admin paneli sayfası ekle
- [x] Kullanıcı listesi göster
- [x] Kullanıcı yetkilendirme (admin/user) değiştir
- [x] Kullanıcı silme özelliği ekle
- [x] Yetkilendirme kontrolleri (sadece admin erişebilsin)


## Admin Paneline Kullanıcı Ekleme
- [x] Backend'e createUser endpoint'i ekle (admin tarafından)
- [x] Admin paneline kullanıcı ekleme formu ekle
- [x] Email ve şifre validasyonu
- [x] admin.createUser endpoint'ini router'a ekle

## Manus OAuth Kaldırma
- [x] Giriş sayfasından Manus OAuth butonunu kaldır
- [x] Ziyaretçi Olarak Devam Et seçeneği ekle
- [x] MapPage'de Giriş Yap linkini /login'e yönlendir (Manus OAuth yerine)


## Google Maps API Hatasını Düzeltme
- [x] Google Maps script'ini bir kez yüklemek için kontrol mekanizması ekle
- [x] Mevcut yükleme promise'ini cache et
- [x] window.google.maps kontrolü ekle
- [x] Hata durumunda retry mekanizması ekle


## Admin Onayı Sistemi
- [x] Veritabanı şemasına 'approved' alanı ekle
- [x] emailRegister endpoint'inde onay bekleyen kullanıcı oluştur
- [x] emailLogin endpoint'inde onay kontrolü ekle
- [x] Admin onayı endpoint'i ekle (approveUserRegistration)
- [x] Onay bekleyen kullanıcıları listele endpoint'i ekle (getPendingRegistrations)
- [x] Yeni kayıt sırasında admin'e bildirim gönder (notifyOwner)
- [x] Frontend'de kayıt başarı mesajını güncelle


## Auth State Sorunları Düzeltme
- [x] LoginPage'de giriş başarılı olduğunda auth cache'i invalidate et
- [x] AdminPage'de getAllUsers endpoint adını düzelt (getUsers yerine)
- [x] AdminPage'de createUser ve deleteUser sonrası refetch'i setTimeout ile geciktur


## Session Cookie Düzeltme
- [x] emailLogin endpoint'inde session cookie'si ayarla
- [x] sdk.createSessionToken kullanarak token oluştur
- [x] res.cookie ile cookie'yi set et


## Rol Tabanlı Buton Gösterimi
- [x] MapPage header'ında admin butonlarını (KML/KMZ, Ocak Ekle, Toplu Sil) sadece admin'e göster
- [x] MapPage header'ında user için "Harita Goruntuleme Modu" mesajı göster
- [x] Quarry detail dialog'unda Düzenle ve Sil butonlarını sadece admin'e göster
- [x] Quarry detail dialog'unda user için "Sadece goruntuleme modu" mesajı göster
