import { useState, useCallback, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Navigation, MapPin, Plus, Upload, X, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Quarry = {
  id: number;
  name: string;
  latitude: string;
  longitude: string;
  imageUrl: string | null;
  description: string | null;
  province: string | null;
  district: string | null;
  distanceKm?: number;
};

type RoutePoint = {
  lat: number;
  lng: number;
  type: 'origin' | 'destination';
};

export default function MapPage() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuarryId, setSelectedQuarryId] = useState<number | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [originQuarryId, setOriginQuarryId] = useState<number | null>(null);
  const [destQuarryId, setDestQuarryId] = useState<number | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [editingQuarry, setEditingQuarry] = useState<Quarry | null>(null);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [newQuarry, setNewQuarry] = useState({
    name: "",
    latitude: "",
    longitude: "",
    imageUrl: "",
    description: "",
    province: "",
    district: "",
  });
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [routePoints, setRoutePoints] = useState<RoutePoint[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [selectedForDelete, setSelectedForDelete] = useState<Set<number>>(new Set());
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'single' | 'bulk' | null>(null);
  const [quarryToDelete, setQuarryToDelete] = useState<Quarry | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [placesSearchInput, setPlacesSearchInput] = useState("");
  const [placesResults, setPlacesResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showPlacesSuggestions, setShowPlacesSuggestions] = useState(false);
  
  const markersRef = useRef<Map<number, google.maps.Marker>>(new Map());
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const placesAutocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);
  const routeMarkersRef = useRef<google.maps.Marker[]>([]);
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const { data: allQuarries = [], refetch: refetchQuarries } = trpc.quarry.list.useQuery();
  const { data: provinces = [] } = trpc.province.list.useQuery();
  const { data: searchResults = [] } = trpc.quarry.search.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length > 0 }
  );
  const { data: distanceResults = [] } = trpc.quarry.getDistancesByProvince.useQuery(
    { provinceName: selectedProvince },
    { enabled: !!selectedProvince }
  );
  
  const originLat = routePoints.find(p => p.type === 'origin')?.lat || 
    (originQuarryId ? parseFloat(allQuarries.find(q => q.id === originQuarryId)?.latitude || "0") : 0);
  const originLng = routePoints.find(p => p.type === 'origin')?.lng || 
    (originQuarryId ? parseFloat(allQuarries.find(q => q.id === originQuarryId)?.longitude || "0") : 0);
  const destLat = routePoints.find(p => p.type === 'destination')?.lat || 
    (destQuarryId ? parseFloat(allQuarries.find(q => q.id === destQuarryId)?.latitude || "0") : 0);
  const destLng = routePoints.find(p => p.type === 'destination')?.lng || 
    (destQuarryId ? parseFloat(allQuarries.find(q => q.id === destQuarryId)?.longitude || "0") : 0);

  const { data: routeData } = trpc.quarry.getRoute.useQuery(
    {
      originLat,
      originLng,
      destLat,
      destLng,
    },
    { enabled: (!!originQuarryId || routePoints.some(p => p.type === 'origin')) && 
               (!!destQuarryId || routePoints.some(p => p.type === 'destination')) }
  );

  const createMutation = trpc.quarry.create.useMutation({
    onSuccess: () => {
      toast.success("Ocak başarıyla eklendi");
      setIsAddingManual(false);
      setNewQuarry({
        name: "",
        latitude: "",
        longitude: "",
        imageUrl: "",
        description: "",
        province: "",
        district: "",
      });
      refetchQuarries();
    },
    onError: (error) => {
      toast.error("Ocak eklenirken hata oluştu: " + error.message);
    },
  });

  const createBulkMutation = trpc.quarry.createBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} ocak başarıyla eklendi`);
      setIsUploadingFile(false);
      refetchQuarries();
    },
    onError: (error) => {
      toast.error("Ocaklar eklenirken hata oluştu: " + error.message);
    },
  });

  const updateMutation = trpc.quarry.update.useMutation({
    onSuccess: () => {
      toast.success("Ocak başarıyla güncellendi");
      setEditingQuarry(null);
      refetchQuarries();
    },
  });

  const deleteMutation = trpc.quarry.delete.useMutation({
    onSuccess: () => {
      toast.success("Ocak başarıyla silindi");
      setQuarryToDelete(null);
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      setSelectedQuarryId(null);
      refetchQuarries();
    },
    onError: (error) => {
      toast.error("Ocak silinirken hata oluştu: " + error.message);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setLocation('/login');
    },
  });

  const deleteBulkMutation = trpc.quarry.deleteBulk.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.count} ocak başarıyla silindi`);
      setSelectedForDelete(new Set());
      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      refetchQuarries();
    },
    onError: (error) => {
      toast.error("Ocaklar silinirken hata oluştu: " + error.message);
    },
  });

  const displayQuarries = selectedProvince
    ? distanceResults
    : searchQuery.length > 0
    ? searchResults
    : allQuarries;

  const selectedQuarry = allQuarries.find(q => q.id === selectedQuarryId);

  const handleMapReady = useCallback((map: google.maps.Map) => {
    setMapInstance(map);
    placesServiceRef.current = new google.maps.places.PlacesService(map);
    placesAutocompleteRef.current = new google.maps.places.AutocompleteService();
  }, []);

  const handlePlacesSearch = async (input: string) => {
    setPlacesSearchInput(input);
    if (input.length < 2) {
      setPlacesResults([]);
      return;
    }
    
    try {
      if (placesAutocompleteRef.current) {
        const predictions = await placesAutocompleteRef.current.getPlacePredictions({
          input: input,
          componentRestrictions: { country: 'tr' },
        });
        setPlacesResults(predictions.predictions || []);
        setShowPlacesSuggestions(true);
      }
    } catch (error) {
      console.error("Places arama hatası:", error);
    }
  };

  const handlePlaceSelect = (placeId: string, description: string) => {
    if (placesServiceRef.current && mapInstance) {
      placesServiceRef.current.getDetails(
        { placeId, fields: ['geometry', 'formatted_address', 'name'] },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const location = place.geometry.location;
            mapInstance.setCenter(location);
            mapInstance.setZoom(15);
            setPlacesSearchInput("");
            setShowPlacesSuggestions(false);
            setPlacesResults([]);
            toast.success(`${description} konumuna gidildi`);
          }
        }
      );
    }
  };

  const createMarker = useCallback((quarry: Quarry, map: google.maps.Map) => {
    const marker = new google.maps.Marker({
      position: {
        lat: parseFloat(quarry.latitude),
        lng: parseFloat(quarry.longitude),
      },
      map,
      title: quarry.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      },
    });

    marker.addListener("click", () => {
      setSelectedQuarryId(quarry.id);
      highlightMarker(quarry.id);
    });

    return marker;
  }, []);

  const highlightMarker = useCallback((quarryId: number) => {
    markersRef.current.forEach((marker, id) => {
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: id === quarryId ? 12 : 8,
        fillColor: id === quarryId ? "#ef4444" : "#3b82f6",
        fillOpacity: 0.9,
        strokeColor: "#ffffff",
        strokeWeight: 2,
      });
    });
  }, []);

  const drawRoute = useCallback((polylineString: string) => {
    if (!mapInstance) return;

    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
    }

    const path = google.maps.geometry.encoding.decodePath(polylineString);
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: "#ef4444",
      strokeOpacity: 0.8,
      strokeWeight: 4,
      map: mapInstance,
    });

    routePolylineRef.current = polyline;

    const bounds = new google.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    mapInstance.fitBounds(bounds);
  }, [mapInstance]);

  const handleSaveEdit = () => {
    if (!editingQuarry) return;
    updateMutation.mutate({
      id: editingQuarry.id,
      name: editingQuarry.name,
      description: editingQuarry.description || undefined,
      imageUrl: editingQuarry.imageUrl || undefined,
      province: editingQuarry.province || undefined,
      district: editingQuarry.district || undefined,
    });
  };

  const handleAddQuarry = () => {
    if (!newQuarry.name || !newQuarry.latitude || !newQuarry.longitude) {
      toast.error("Lütfen en az isim ve koordinatları girin");
      return;
    }
    createMutation.mutate(newQuarry);
  };

  const handleDeleteQuarry = (quarry: Quarry) => {
    setQuarryToDelete(quarry);
    setDeleteTarget('single');
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteSelected = () => {
    if (selectedForDelete.size === 0) {
      toast.error("Lütfen silmek için ocak seçin");
      return;
    }
    setDeleteTarget('bulk');
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (deleteTarget === 'single' && quarryToDelete) {
      deleteMutation.mutate({ id: quarryToDelete.id });
    } else if (deleteTarget === 'bulk') {
      deleteBulkMutation.mutate({ ids: Array.from(selectedForDelete) });
    }
  };

  const toggleSelectQuarry = (id: number) => {
    const newSet = new Set(selectedForDelete);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedForDelete(newSet);
  };

  const startMapSelection = () => {
    if (!mapInstance) return;
    
    setIsSelectingOnMap(true);
    toast.info("Harita üzerinde bir nokta seçin");

    if (mapClickListenerRef.current) {
      google.maps.event.removeListener(mapClickListenerRef.current);
    }

    mapClickListenerRef.current = mapInstance.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setNewQuarry(prev => ({
          ...prev,
          latitude: e.latLng!.lat().toFixed(7),
          longitude: e.latLng!.lng().toFixed(7),
        }));
        setIsSelectingOnMap(false);
        if (mapClickListenerRef.current) {
          google.maps.event.removeListener(mapClickListenerRef.current);
          mapClickListenerRef.current = null;
        }
        toast.success("Konum seçildi");
      }
    });
  };

  const handleRoutePointSelection = (type: 'origin' | 'destination') => {
    if (!mapInstance) return;
    
    toast.info(`${type === 'origin' ? 'Başlangıç' : 'Hedef'} noktasını haritada seçin`);

    if (mapClickListenerRef.current) {
      google.maps.event.removeListener(mapClickListenerRef.current);
    }

    mapClickListenerRef.current = mapInstance.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newPoint: RoutePoint = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
          type,
        };

        setRoutePoints(prev => {
          const filtered = prev.filter(p => p.type !== type);
          return [...filtered, newPoint];
        });

        if (type === 'origin') {
          setOriginQuarryId(null);
        } else {
          setDestQuarryId(null);
        }

        const marker = new google.maps.Marker({
          position: e.latLng,
          map: mapInstance,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: type === 'origin' ? "#22c55e" : "#ef4444",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: type === 'origin' ? 'Başlangıç' : 'Hedef',
        });

        routeMarkersRef.current.push(marker);

        if (mapClickListenerRef.current) {
          google.maps.event.removeListener(mapClickListenerRef.current);
          mapClickListenerRef.current = null;
        }
        
        toast.success(`${type === 'origin' ? 'Başlangıç' : 'Hedef'} noktası seçildi`);
      }
    });
  };

  const clearRoutePoints = () => {
    setRoutePoints([]);
    setOriginQuarryId(null);
    setDestQuarryId(null);
    
    routeMarkersRef.current.forEach(marker => marker.setMap(null));
    routeMarkersRef.current = [];
    
    if (routePolylineRef.current) {
      routePolylineRef.current.setMap(null);
      routePolylineRef.current = null;
    }
    
    toast.success("Rota temizlendi");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.kml') && !fileName.endsWith('.kmz')) {
      toast.error("Lütfen KML veya KMZ dosyası seçin");
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      let kmlText: string;

      if (fileName.endsWith('.kmz')) {
        const JSZip = (await import('jszip')).default;
        const zip = new JSZip();
        await zip.loadAsync(buffer);
        
        let kmlFile: any = null;
        zip.forEach((relativePath, file) => {
          if (relativePath.toLowerCase().endsWith('.kml')) {
            kmlFile = file;
          }
        });

        if (!kmlFile) {
          toast.error("KMZ dosyasında KML dosyası bulunamadı");
          return;
        }

        kmlText = await kmlFile.async('text');
      } else {
        kmlText = new TextDecoder().decode(buffer);
      }
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(kmlText, "text/xml");
      const placemarks = xmlDoc.getElementsByTagName("Placemark");
      
      const quarries = [];
      for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];
        const nameEl = placemark.getElementsByTagName("name")[0];
        const coordsEl = placemark.getElementsByTagName("coordinates")[0];
        
        if (nameEl && coordsEl) {
          const name = nameEl.textContent || `Ocak ${i + 1}`;
          const coords = coordsEl.textContent?.trim().split(',');
          
          if (coords && coords.length >= 2) {
            quarries.push({
              name,
              longitude: coords[0].trim(),
              latitude: coords[1].trim(),
            });
          }
        }
      }

      if (quarries.length === 0) {
        toast.error("Dosyada geçerli ocak verisi bulunamadı");
        return;
      }

      createBulkMutation.mutate({ quarries });
    } catch (error) {
      toast.error("Dosya okunurken hata oluştu");
      console.error(error);
    }
  };

  if (mapInstance && allQuarries.length > 0 && markersRef.current.size === 0) {
    allQuarries.forEach(quarry => {
      const marker = createMarker(quarry, mapInstance);
      markersRef.current.set(quarry.id, marker);
    });

    const bounds = new google.maps.LatLngBounds();
    allQuarries.forEach(q => {
      bounds.extend({ lat: parseFloat(q.latitude), lng: parseFloat(q.longitude) });
    });
    mapInstance.fitBounds(bounds);
  }

  if (routeData?.polyline) {
    drawRoute(routeData.polyline);
  }

  if (selectedQuarryId) {
    highlightMarker(selectedQuarryId);
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Ocak Takip Sistemi</h1>
            <p className="text-sm text-gray-600">{allQuarries.length} Ocak Konumu</p>
          </div>
          
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="İl, ilçe, köy ara..."
                value={placesSearchInput}
                onChange={(e) => handlePlacesSearch(e.target.value)}
                onFocus={() => placesResults.length > 0 && setShowPlacesSuggestions(true)}
                className="pl-10 pr-4"
              />
              {showPlacesSuggestions && placesResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {placesResults.map((result) => (
                    <button
                      key={result.place_id}
                      onClick={() => handlePlaceSelect(result.place_id, result.description)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 text-sm"
                    >
                      <p className="font-medium text-gray-900">{result.description?.split(',')[0]}</p>
                      <p className="text-xs text-gray-600">{result.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isAuthenticated && user?.role === 'admin' && (
              <>
                {isSelectMode && selectedForDelete.size > 0 && (
                  <Button 
                    onClick={handleDeleteSelected} 
                    variant="destructive" 
                    size="sm"
                    disabled={deleteBulkMutation.isPending}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {selectedForDelete.size} Sil
                  </Button>
                )}
                <Button 
                  onClick={() => setIsSelectMode(!isSelectMode)} 
                  variant={isSelectMode ? "default" : "outline"}
                  size="sm"
                >
                  {isSelectMode ? "Seçim Bitti" : "Toplu Sil"}
                </Button>
                <Button onClick={() => setIsAddingManual(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Ocak Ekle
                </Button>
                <Button onClick={() => setIsUploadingFile(true)} variant="outline" size="sm">
                  <Upload className="mr-2 h-4 w-4" />
                  KML/KMZ Yükle
                </Button>
              </>
            )}
            {isAuthenticated && (
              <div className="flex gap-2">
                {user?.role === 'admin' && (
                  <Button 
                    onClick={() => setLocation('/admin')} 
                    variant="outline" 
                    size="sm"
                  >
                    Admin Paneli
                  </Button>
                )}
                {user?.role === 'user' && (
                  <div className="text-sm text-gray-600 px-3 py-2">Harita Goruntuleme Modu</div>
                )}
                <Button 
                  onClick={() => logoutMutation.mutate()} 
                  variant="outline" 
                  size="sm"
                >
                  Çıkış Yap
                </Button>
              </div>
            )}
            {!isAuthenticated && (
              <Button asChild>
                <a href="/login">
                  Giriş Yap
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1">
          <MapView
            onMapReady={handleMapReady}
            initialCenter={{ lat: 39, lng: 35 }}
            initialZoom={6}
            className="h-full w-full"
          />
        </div>

        <div className="w-96 border-l bg-white">
          <Tabs defaultValue="list" className="h-full flex flex-col">
            <TabsList className="w-full rounded-none border-b">
              <TabsTrigger value="list" className="flex-1">
                <MapPin className="mr-2 h-4 w-4" />
                Ocaklar
              </TabsTrigger>
              <TabsTrigger value="route" className="flex-1">
                <Navigation className="mr-2 h-4 w-4" />
                Rota
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="flex-1 overflow-hidden m-0 p-4 space-y-4">
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Ocak ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>İl Seçin</Label>
                  <Select value={selectedProvince || "all"} onValueChange={(v) => setSelectedProvince(v === "all" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tüm İller" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm İller</SelectItem>
                      {provinces.map((p) => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-2">
                  {displayQuarries.map((quarry) => (
                    <Card
                      key={quarry.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedQuarryId === quarry.id ? "ring-2 ring-blue-500" : ""
                      }`}
                      onClick={() => {
                        if (!isSelectMode) {
                          setSelectedQuarryId(quarry.id);
                          if (mapInstance) {
                            mapInstance.panTo({
                              lat: parseFloat(quarry.latitude),
                              lng: parseFloat(quarry.longitude),
                            });
                            mapInstance.setZoom(12);
                          }
                        }
                      }}
                    >
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm flex-1">{quarry.name}</CardTitle>
                          {isSelectMode && (
                            <Checkbox
                              checked={selectedForDelete.has(quarry.id)}
                              onCheckedChange={() => toggleSelectQuarry(quarry.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <p className="text-xs text-gray-600">
                          {quarry.province && `${quarry.province}, `}
                          {quarry.district}
                        </p>
                        {('distanceKm' in quarry && typeof (quarry as any).distanceKm === 'number') && (
                          <p className="text-xs font-semibold text-blue-600 mt-1">
                            {(quarry as any).distanceKm} km
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="route" className="flex-1 overflow-hidden m-0 p-4 space-y-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Başlangıç Noktası</Label>
                  <div className="flex gap-2">
                    <Select
                      value={originQuarryId?.toString() || "none"}
                      onValueChange={(v) => {
                        if (v === "none") {
                          setOriginQuarryId(null);
                        } else {
                          setOriginQuarryId(parseInt(v));
                          setRoutePoints(prev => prev.filter(p => p.type !== 'origin'));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ocak seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ocak seçin...</SelectItem>
                        {allQuarries.map((q) => (
                          <SelectItem key={q.id} value={q.id.toString()}>
                            {q.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => handleRoutePointSelection('origin')}
                      title="Haritadan seç"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  {routePoints.find(p => p.type === 'origin') && (
                    <p className="text-xs text-green-600">
                      Haritadan seçildi: {routePoints.find(p => p.type === 'origin')?.lat.toFixed(4)}, {routePoints.find(p => p.type === 'origin')?.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Hedef Noktası</Label>
                  <div className="flex gap-2">
                    <Select
                      value={destQuarryId?.toString() || "none"}
                      onValueChange={(v) => {
                        if (v === "none") {
                          setDestQuarryId(null);
                        } else {
                          setDestQuarryId(parseInt(v));
                          setRoutePoints(prev => prev.filter(p => p.type !== 'destination'));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Ocak seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Ocak seçin...</SelectItem>
                        {allQuarries.map((q) => (
                          <SelectItem key={q.id} value={q.id.toString()}>
                            {q.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button 
                      size="icon" 
                      variant="outline"
                      onClick={() => handleRoutePointSelection('destination')}
                      title="Haritadan seç"
                    >
                      <MapPin className="h-4 w-4" />
                    </Button>
                  </div>
                  {routePoints.find(p => p.type === 'destination') && (
                    <p className="text-xs text-red-600">
                      Haritadan seçildi: {routePoints.find(p => p.type === 'destination')?.lat.toFixed(4)}, {routePoints.find(p => p.type === 'destination')?.lng.toFixed(4)}
                    </p>
                  )}
                </div>

                {(routePoints.length > 0 || originQuarryId || destQuarryId) && (
                  <Button variant="outline" size="sm" onClick={clearRoutePoints} className="w-full">
                    <X className="mr-2 h-4 w-4" />
                    Rotayı Temizle
                  </Button>
                )}
              </div>

              {routeData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Rota Bilgileri</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-600">Mesafe</p>
                      <p className="font-semibold">{routeData.distance}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Süre</p>
                      <p className="font-semibold">{routeData.duration}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Quarry Detail Dialog */}
      <Dialog open={!!selectedQuarry && !editingQuarry} onOpenChange={() => setSelectedQuarryId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedQuarry?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isAuthenticated && selectedQuarry?.imageUrl && (
              <img
                src={selectedQuarry.imageUrl}
                alt={selectedQuarry.name}
                className="w-full h-64 object-cover rounded-lg"
              />
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Koordinatlar</p>
                <p className="font-mono text-sm">
                  {selectedQuarry?.latitude}, {selectedQuarry?.longitude}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Konum</p>
                <p className="text-sm">
                  {selectedQuarry?.province && `${selectedQuarry.province}, `}
                  {selectedQuarry?.district}
                </p>
              </div>
            </div>
            {isAuthenticated && selectedQuarry?.description && (
              <div>
                <p className="text-sm text-gray-600">Açıklama</p>
                <p className="text-sm">{selectedQuarry.description}</p>
              </div>
            )}
            {isAuthenticated && user?.role === 'admin' && (
              <div className="flex gap-2">
                <Button onClick={() => setEditingQuarry(selectedQuarry || null)} className="flex-1">
                  Düzenle
                </Button>
                <Button 
                  onClick={() => handleDeleteQuarry(selectedQuarry!)} 
                  variant="destructive" 
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Sil
                </Button>
              </div>
            )}
            {isAuthenticated && user?.role === 'user' && (
              <div className="text-sm text-gray-600 text-center py-2">Sadece goruntuleme modu</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Quarry Dialog */}
      <Dialog open={!!editingQuarry} onOpenChange={() => setEditingQuarry(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Ocak Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ocak Adı</Label>
              <Input
                value={editingQuarry?.name || ""}
                onChange={(e) =>
                  setEditingQuarry(editingQuarry ? { ...editingQuarry, name: e.target.value } : null)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={editingQuarry?.description || ""}
                onChange={(e) =>
                  setEditingQuarry(
                    editingQuarry ? { ...editingQuarry, description: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Fotoğraf URL</Label>
              <Input
                value={editingQuarry?.imageUrl || ""}
                onChange={(e) =>
                  setEditingQuarry(
                    editingQuarry ? { ...editingQuarry, imageUrl: e.target.value } : null
                  )
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>İl</Label>
                <Input
                  value={editingQuarry?.province || ""}
                  onChange={(e) =>
                    setEditingQuarry(
                      editingQuarry ? { ...editingQuarry, province: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>İlçe</Label>
                <Input
                  value={editingQuarry?.district || ""}
                  onChange={(e) =>
                    setEditingQuarry(
                      editingQuarry ? { ...editingQuarry, district: e.target.value } : null
                    )
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} className="flex-1" disabled={updateMutation.isPending}>
                Kaydet
              </Button>
              <Button variant="outline" onClick={() => setEditingQuarry(null)} className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Quarry Dialog */}
      <Dialog open={isAddingManual} onOpenChange={setIsAddingManual}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Ocak Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ocak Adı *</Label>
              <Input
                value={newQuarry.name}
                onChange={(e) => setNewQuarry({ ...newQuarry, name: e.target.value })}
                placeholder="Örn: Maden Ocağı 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Enlem (Latitude) *</Label>
                <Input
                  value={newQuarry.latitude}
                  onChange={(e) => setNewQuarry({ ...newQuarry, latitude: e.target.value })}
                  placeholder="39.123456"
                />
              </div>
              <div className="space-y-2">
                <Label>Boylam (Longitude) *</Label>
                <Input
                  value={newQuarry.longitude}
                  onChange={(e) => setNewQuarry({ ...newQuarry, longitude: e.target.value })}
                  placeholder="35.123456"
                />
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={startMapSelection}
              disabled={isSelectingOnMap}
              className="w-full"
            >
              <MapPin className="mr-2 h-4 w-4" />
              {isSelectingOnMap ? "Haritadan nokta seçin..." : "Haritadan Konum Seç"}
            </Button>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea
                value={newQuarry.description}
                onChange={(e) => setNewQuarry({ ...newQuarry, description: e.target.value })}
                placeholder="Ocak hakkında bilgi..."
              />
            </div>
            <div className="space-y-2">
              <Label>Fotoğraf URL</Label>
              <Input
                value={newQuarry.imageUrl}
                onChange={(e) => setNewQuarry({ ...newQuarry, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>İl</Label>
                <Input
                  value={newQuarry.province}
                  onChange={(e) => setNewQuarry({ ...newQuarry, province: e.target.value })}
                  placeholder="Ankara"
                />
              </div>
              <div className="space-y-2">
                <Label>İlçe</Label>
                <Input
                  value={newQuarry.district}
                  onChange={(e) => setNewQuarry({ ...newQuarry, district: e.target.value })}
                  placeholder="Çankaya"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddQuarry} className="flex-1" disabled={createMutation.isPending}>
                Ekle
              </Button>
              <Button variant="outline" onClick={() => setIsAddingManual(false)} className="flex-1">
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Upload Dialog */}
      <Dialog open={isUploadingFile} onOpenChange={setIsUploadingFile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>KML/KMZ Dosyası Yükle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              KML veya KMZ dosyanızı seçin. Dosyadaki tüm ocaklar otomatik olarak sisteme eklenecektir.
            </p>
            <Input
              type="file"
              accept=".kml,.kmz"
              onChange={handleFileUpload}
              disabled={createBulkMutation.isPending}
            />
            {createBulkMutation.isPending && (
              <p className="text-sm text-blue-600">Dosya işleniyor...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Silmeyi Onayla</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'single' 
                ? `"${quarryToDelete?.name}" ocağını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
                : `${selectedForDelete.size} ocağı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending || deleteBulkMutation.isPending}
            >
              Sil
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
