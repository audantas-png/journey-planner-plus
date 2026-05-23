import { useEffect, useState } from "react";
import type { TripDay, CityGeo } from "./queries";

export function TripMap({ days, geo }: { days: TripDay[]; geo: CityGeo[] }) {
  const [Leaflet, setLeaflet] = useState<any>(null);
  useEffect(() => {
    Promise.all([import("react-leaflet"), import("leaflet")]).then(([rl, L]) => {
      // @ts-ignore
      delete L.default.Icon.Default.prototype._getIconUrl;
      L.default.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });
      setLeaflet({ ...rl, L: L.default });
    });
  }, []);

  if (!Leaflet) return <div className="h-[600px] flex items-center justify-center text-muted-foreground text-sm">Carregando mapa…</div>;
  const { MapContainer, TileLayer, Marker, Popup, Polyline } = Leaflet;

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
      <MapContainer center={[36.5, 138]} zoom={5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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