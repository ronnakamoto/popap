"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { getEvent, checkIn, checkOut } from "@/app/actions/contract";
import { format, formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import useWalletStore from "@/app/store/useWalletStore";
import dynamic from "next/dynamic";

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

export default function EventDetailsPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [checkInTime, setCheckInTime] = useState<number | null>(null);
  const [userLocation, setUserLocation] =
    useState<GeolocationCoordinates | null>(null);
  const { toast } = useToast();
  const params = useParams();
  const { activeWallet, selectedChain } = useWalletStore();

  useEffect(() => {
    async function fetchEvent() {
      if (typeof params.id !== "string") return;

      try {
        const fetchedEvent = await getEvent(params.id);
        setEvent(fetchedEvent);
      } catch (error) {
        console.error("Error fetching event:", error);
        toast({
          title: "Error",
          description: "Failed to fetch event details",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvent();
  }, [params.id, toast]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => setUserLocation(position.coords),
        (error) => {
          console.error("Error getting user location:", error);
          toast({
            title: "Location Error",
            description:
              "Unable to get your current location. Please enable location services and try again.",
            variant: "destructive",
          });
        },
      );
    } else {
      toast({
        title: "Geolocation Unavailable",
        description:
          "Your browser doesn't support geolocation. Please use a modern browser to check in/out.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCheckIn = async () => {
    if (!event || !activeWallet || !selectedChain || !userLocation) return;

    try {
      await checkIn(
        event.id,
        activeWallet.address,
        selectedChain,
        activeWallet.index,
        userLocation.latitude,
        userLocation.longitude,
      );
      setIsCheckedIn(true);
      setCheckInTime(Date.now());
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
    }
  };

  const handleCheckOut = async () => {
    if (!event || !activeWallet || !selectedChain || !userLocation) return;

    try {
      await checkOut(
        event.id,
        activeWallet.address,
        selectedChain,
        activeWallet.index,
        userLocation.latitude,
        userLocation.longitude,
      );
      setIsCheckedIn(false);
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
            <Badge
              variant="outline"
              className="text-sm bg-gray-700 text-purple-300 border-purple-400"
            >
              {event.chain}
            </Badge>
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
            <div className="flex-1 h-64 rounded-lg overflow-hidden">
              <MapWithNoSSR
                center={[event.latitude, event.longitude]}
                zoom={15}
                eventName={event.name}
                radiusMiles={event.radiusMiles}
              />
            </div>
          </div>
          {isCheckedIn && checkInTime && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-300 mb-2">
                Check-in Status
              </h3>
              <p className="text-gray-300">
                Checked in{" "}
                {formatDistanceToNow(checkInTime, { addSuffix: true })}
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <p className="text-sm text-gray-400">
            Created by: {event.creator.slice(0, 6)}...{event.creator.slice(-4)}
          </p>
          {!isCheckedIn ? (
            <Button
              onClick={handleCheckIn}
              className="bg-purple-600 text-white hover:bg-purple-700"
              disabled={!activeWallet || !userLocation}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Check In
            </Button>
          ) : (
            <Button
              onClick={handleCheckOut}
              variant="destructive"
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={!userLocation}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Check Out
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
