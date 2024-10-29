import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon, LatLng, DivIcon } from "leaflet";
import { useEffect } from "react";

const createPulsingIcon = (iconUrl: string, color: string) => {
  return new DivIcon({
    className: "",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    html: `
      <div class="relative">
        <div class="absolute inset-0 bg-${color}-500 rounded-full animate-ping opacity-75"></div>
        <div class="relative flex items-center justify-center">
          <img src="${iconUrl}" alt="" class="w-[30px] h-[30px]" />
        </div>
      </div>
    `,
  });
};

const eventIcon = createPulsingIcon("/images/marker-icon.png", "purple");
const userIcon = createPulsingIcon("/images/user-marker-icon.png", "blue");

interface MapProps {
  center: [number, number];
  zoom: number;
  eventName: string;
  radiusMiles: number;
  userLocation: [number, number] | null;
}

function MapContent({
  center,
  eventName,
  radiusMiles,
  userLocation,
}: MapProps) {
  const map = useMap();
  const radiusMeters = radiusMiles * 1609.34; // Convert miles to meters

  useEffect(() => {
    const eventLocation = new LatLng(center[0], center[1]);
    const bounds = eventLocation.toBounds(radiusMeters);
    if (userLocation) {
      bounds.extend(new LatLng(userLocation[0], userLocation[1]));
    }
    map.fitBounds(bounds);
  }, [map, center, radiusMeters, userLocation]);

  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <Marker position={center} icon={eventIcon}>
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
      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>
            <div className="text-gray-800">
              <h3 className="font-bold">Your Location</h3>
              <p className="text-sm">
                Latitude: {userLocation[0].toFixed(6)}
                <br />
                Longitude: {userLocation[1].toFixed(6)}
              </p>
            </div>
          </Popup>
        </Marker>
      )}
    </>
  );
}

export default function Map({
  center,
  zoom,
  eventName,
  radiusMiles,
  userLocation,
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
    >
      <MapContent
        center={center}
        zoom={zoom}
        eventName={eventName}
        radiusMiles={radiusMiles}
        userLocation={userLocation}
      />
    </MapContainer>
  );
}
