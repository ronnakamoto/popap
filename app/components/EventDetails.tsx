"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
} from "lucide-react";
import dynamic from "next/dynamic";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getEvent,
  checkIn,
  checkOut,
  getCheckInOutStatus,
} from "@/app/actions/contract";
import useWalletStore from "@/app/store/useWalletStore";
import { Countdown } from "./Countdown";

const MapWithNoSSR = dynamic(() => import("./Map"), { ssr: false });

interface Event {
  id: string;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  latitude: number;
  longitude: number;
  maxAttendees: number;
  minStayMinutes: number;
  creator: string;
  contractAddress: string;
  chain: string;
  radiusMiles: number;
}

interface Transaction {
  hash: string;
  explorerUrl: string;
}

interface CheckInOutStatus {
  checkIn: {
    isCheckedIn: boolean;
    timestamp: number;
    transactionHash: string;
    explorerUrl: string;
  } | null;
  checkOut: {
    isCheckedOut: boolean;
    timestamp: number;
    transactionHash: string;
    explorerUrl: string;
  } | null;
}

function TransactionStatus({
  status,
  type,
}: {
  status: CheckInOutStatus["checkIn"] | CheckInOutStatus["checkOut"];
  type: "checkIn" | "checkOut";
}) {
  if (!status) return null;

  return (
    <Card className="bg-gray-700 border-gray-600 mb-4">
      <CardContent className="p-4 space-y-3">
        <h3 className="text-lg font-semibold text-purple-300">
          {type === "checkIn" ? "Check-in" : "Check-out"} Status
        </h3>
        <div className="space-y-2">
          <div className="flex items-center text-gray-300">
            <Clock className="mr-2 h-4 w-4 text-purple-400" />
            <span>
              {type === "checkIn" ? "Checked in" : "Checked out"}{" "}
              {formatDistanceToNow(status.timestamp, { addSuffix: true })}
            </span>
          </div>
          <div className="flex items-center text-sm pt-2 border-t border-gray-600 space-x-2">
            <span className="text-gray-400">Transaction:</span>
            <Button
              variant="link"
              asChild
              className="text-purple-400 hover:text-purple-300 p-0 h-auto font-mono"
            >
              <Link
                href={status.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                {`${status.transactionHash.slice(0, 6)}...${status.transactionHash.slice(-4)}`}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EventDetailsPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkInOutStatus, setCheckInOutStatus] = useState<CheckInOutStatus>({
    checkIn: null,
    checkOut: null,
  });
  const [userLocation, setUserLocation] =
    useState<GeolocationCoordinates | null>(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState<boolean | null>(
    null,
  );
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const params = useParams();
  const { activeWallet, selectedChain } = useWalletStore();

  useEffect(() => {
    async function fetchEventDetails() {
      try {
        const decodedId = decodeURIComponent(params.id as string);
        const [chain, contractAddress, eventId] = decodedId.split(":");

        if (!chain || !contractAddress || !eventId) {
          throw new Error("Invalid event ID format");
        }

        const eventDetails = await getEvent(chain, contractAddress, eventId);
        setEvent(eventDetails);

        if (activeWallet) {
          const status = await getCheckInOutStatus(
            chain,
            contractAddress,
            eventId,
            activeWallet.address,
          );
          setCheckInOutStatus(status);
        }
      } catch (err) {
        console.error("Error fetching event:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch event details",
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchEventDetails();
  }, [params.id, activeWallet]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation(position.coords);
          if (event) {
            const distance = calculateDistance(
              position.coords.latitude,
              position.coords.longitude,
              event.latitude,
              event.longitude,
            );
            setIsWithinGeofence(distance <= event.radiusMiles);
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
          toast({
            title: "Location Error",
            description:
              "Unable to get your current location. Please enable location services and try again.",
            variant: "destructive",
          });
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 },
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      toast({
        title: "Geolocation Unavailable",
        description:
          "Your browser doesn't support geolocation. Please use a modern browser to check in/out.",
        variant: "destructive",
      });
    }
  }, [event, toast]);

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) => {
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value: number) => (value * Math.PI) / 180;

  const handleCheckIn = async () => {
    if (
      !event ||
      !activeWallet ||
      !selectedChain ||
      !userLocation ||
      !isWithinGeofence
    )
      return;

    setIsCheckingIn(true);
    try {
      const result = await checkIn(
        event.chain,
        event.contractAddress,
        event.id,
        activeWallet.address,
        activeWallet.index,
        userLocation.latitude,
        userLocation.longitude,
      );
      const newStatus = await getCheckInOutStatus(
        event.chain,
        event.contractAddress,
        event.id,
        activeWallet.address,
      );
      setCheckInOutStatus(newStatus);
      toast({
        title: "Checked In",
        description: "You have successfully checked in to the event.",
      });
    } catch (error) {
      console.error("Error checking in:", error);
      toast({
        title: "Check-in Failed",
        description:
          "There was an error checking in to the event. Please ensure you're within the event's geofence.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCheckOut = async () => {
    if (
      !event ||
      !activeWallet ||
      !selectedChain ||
      !userLocation ||
      !isWithinGeofence
    )
      return;

    setIsCheckingOut(true);
    try {
      const result = await checkOut(
        event.chain,
        event.contractAddress,
        event.id,
        activeWallet.address,
        activeWallet.index,
        userLocation.latitude,
        userLocation.longitude,
      );
      const newStatus = await getCheckInOutStatus(
        event.chain,
        event.contractAddress,
        event.id,
        activeWallet.address,
      );
      setCheckInOutStatus(newStatus);
      toast({
        title: "Checked Out",
        description: "You have successfully checked out of the event.",
      });
    } catch (error) {
      console.error("Error checking out:", error);
      toast({
        title: "Check-out Failed",
        description:
          "There was an error checking out of the event. Please ensure you're within the event's geofence.",
        variant: "destructive",
      });
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full bg-gray-800 text-gray-100 border-gray-700">
          <CardHeader>
            <Skeleton className="h-8 w-2/3 bg-gray-700" />
            <Skeleton className="h-4 w-1/2 bg-gray-700" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full bg-gray-700" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-gray-800/50 text-gray-100 border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">
            Error Loading Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto py-10">
        <Card className="w-full bg-gray-800 text-gray-100 border-gray-700">
          <CardContent>
            <p className="text-center text-gray-400">Event not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full bg-gray-800 text-gray-100 border-gray-700">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-3xl font-bold text-purple-400">
                {event.name}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {format(new Date(event.startTime * 1000), "PPP")}
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              <Badge
                variant="outline"
                className="text-sm bg-gray-700 text-purple-300 border-purple-400"
              >
                {event.chain}
              </Badge>
              <Countdown startTime={event.startTime} endTime={event.endTime} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <p className="text-gray-300">{event.description}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-sm text-gray-400">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span>
                    {format(new Date(event.startTime * 1000), "PPP p")} -{" "}
                    {format(new Date(event.endTime * 1000), "PPP p")}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <MapPin className="mr-2 h-4 w-4" />
                  <span>
                    {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Max Attendees: {event.maxAttendees}</span>
                </div>
                <div className="flex items-center text-sm text-gray-400">
                  <Clock className="mr-2 h-4 w-4" />
                  <span>Min Stay: {event.minStayMinutes} minutes</span>
                </div>
              </div>
            </div>
            <div className="flex-1 h-64 rounded-lg overflow-hidden relative z-0">
              <MapWithNoSSR
                center={[event.latitude, event.longitude]}
                zoom={15}
                eventName={event.name}
                radiusMiles={event.radiusMiles}
                userLocation={
                  userLocation
                    ? [userLocation.latitude, userLocation.longitude]
                    : null
                }
              />
            </div>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-purple-300 mb-2">
              Location Status
            </h3>
            <div className="flex items-center space-x-2">
              {isWithinGeofence === null ? (
                <AlertCircle className="text-yellow-500" />
              ) : isWithinGeofence ? (
                <CheckCircle className="text-green-500" />
              ) : (
                <XCircle className="text-red-500" />
              )}
              <p className="text-gray-300">
                {isWithinGeofence === null
                  ? "Determining your location..."
                  : isWithinGeofence
                    ? "You're within the event area!"
                    : "You're outside the event area."}
              </p>
            </div>
            {!isWithinGeofence && userLocation && (
              <p className="text-sm text-gray-400 mt-2">
                Move closer to the event location to check in.
              </p>
            )}
          </div>
          <TransactionStatus status={checkInOutStatus.checkIn} type="checkIn" />
          <TransactionStatus
            status={checkInOutStatus.checkOut}
            type="checkOut"
          />
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <p className="text-sm text-gray-400">
            Created by: {event.creator.slice(0, 6)}...{event.creator.slice(-4)}
          </p>
          {!checkInOutStatus.checkIn ? (
            <Button
              onClick={handleCheckIn}
              className="bg-purple-600 text-white hover:bg-purple-700"
              disabled={
                !activeWallet ||
                !userLocation ||
                !isWithinGeofence ||
                isCheckingIn
              }
            >
              {isCheckingIn ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {isCheckingIn ? "Checking In..." : "Check In"}
            </Button>
          ) : !checkInOutStatus.checkOut ? (
            <Button
              onClick={handleCheckOut}
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!userLocation || !isWithinGeofence || isCheckingOut}
            >
              {isCheckingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              {isCheckingOut ? "Checking Out..." : "Check Out"}
            </Button>
          ) : (
            <Badge variant="secondary" className="bg-green-600 text-white">
              Attendance Completed
            </Badge>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
