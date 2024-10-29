import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon, LatLng, LatLngBounds } from "leaflet";
import { useEffect } from "react";

const customIcon = new Icon({
  iconUrl: "/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

interface MapProps {
  center: [number, number];
  eventName: string;
  radiusMiles: number;
}

function MapContent({ center, eventName, radiusMiles }: MapProps) {
  const map = useMap();
  const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters

  useEffect(() => {
    const eventLocation = new LatLng(center[0], center[1]);
    const bounds = eventLocation.toBounds(radiusMeters);
    map.fitBounds(bounds);
  }, [map, center, radiusMeters]);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={center} icon={customIcon}>
        <Popup>
          <div className="text-gray-800">
            <h3 className="font-bold">{eventName}</h3>
            <p className="text-sm">
              Latitude: {center[0].toFixed(6)}
              <br />
              Longitude: {center[1].toFixed(6)}
              <br />
              Radius: {radiusMiles.toFixed(2)} miles
            </p>
          </div>
        </Popup>
      </Marker>
      <Circle
        center={center}
        radius={radiusMeters}
        pathOptions={{
          color: "purple",
          fillColor: "purple",
          fillOpacity: 0.1,
          weight: 2,
        }}
      />
    </>
  );
}

export default function Map({ center, eventName, radiusMiles }: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <MapContent
        center={center}
        eventName={eventName}
        radiusMiles={radiusMiles}
      />
    </MapContainer>
  );
}
