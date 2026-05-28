import { useEffect, useState } from "react";
import type { TripDay, CityGeo } from "./queries";

export function TripMap({ days, geo }: { days: TripDay[]; geo: CityGeo[] }) {
  const [Leaflet, setLeaflet] = useState<any>(null);
  useEffect(() => {
    // Inject Leaflet CSS once (avoids Tailwind v4 @import ordering issues)
    const cssId = "leaflet-css";
    if (!document.getElementById(cssId)) {
      const link = document.createElement("link");
      link.id = cssId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }
    Promise.all([import("react-leaflet"), import("leaflet")]).then(([rl, L]) => {
      // @ts-ignore
      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeaflet({ ...rl, L: L.default });
    }).catch((err) => console.error("[Map] load failed", err));
  }, []);

  if (!Leaflet) return <div className="h-[600px] flex items-center justify-center text-muted-foreground text-sm">Carregando mapa…</div>;
  const { MapContainer, TileLayer, Marker, Popup, Polyline } = Leaflet;
  const L = Leaflet.L;
  // Bounding box do arquipélago japonês (SW → NE)
  const JAPAN_BOUNDS = L.latLngBounds(
    L.latLng(24.0, 122.0),  // sudoeste (Okinawa / Yonaguni)
    L.latLng(45.7, 146.0),  // nordeste (Hokkaido / Nemuro)
  );

  const geoMap = new Map(geo.map(g => [g.city, g]));
  const points = days
    .map(d => ({ day: d, g: geoMap.get(d.city) }))
    .filter(p => p.g) as { day: TripDay; g: CityGeo }[];

  const path: [number, number][] = [];
  points.forEach((p, i) => {
    const prev = points[i - 1];
    if (!prev || prev.g.city !== p.g.city) path.push([p.g.lat, p.g.lng]);
  });

  return (
    <div className="h-[600px] border border-foreground/15">
      <MapContainer
        center={[36.5, 138]}
        zoom={5}
        minZoom={5}
        maxZoom={18}
        maxBounds={JAPAN_BOUNDS}
        maxBoundsViscosity={1.0}
        worldCopyJump={false}
        style={{ height: "100%", width: "100%", background: "var(--background)" }}
      >
        {/* Base dark detalhada — Esri World Dark Gray (sem rótulos) */}
        <TileLayer
          attribution='Tiles &copy; Esri'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          bounds={JAPAN_BOUNDS}
          noWrap={true}
          maxZoom={20}
          maxNativeZoom={16}
        />
        {/* Rótulos em inglês — Esri Reference */}
        <TileLayer
          attribution=''
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          bounds={JAPAN_BOUNDS}
          noWrap={true}
          maxZoom={20}
          maxNativeZoom={16}
          pane="markerPane"
        />
        <Polyline positions={path} pathOptions={{ color: "#9B2C2C", weight: 2, dashArray: "6 4" }} />
        {Array.from(new Set(points.map(p => p.g.city))).map(city => {
          const g = geoMap.get(city)!;
          const cityDays = points.filter(p => p.g.city === city).map(p => p.day);
          return (
            <Marker key={city} position={[g.lat, g.lng]}>
              <Popup>
                <div className="font-serif text-base">{city}</div>
                <div className="text-xs text-gray-600">{g.region}</div>
                <div className="text-xs mt-1">
                  Dias: {cityDays.map(d => d.day_number).join(", ")}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}