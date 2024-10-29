"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { getEvents } from "@/app/actions/contract";
import { format } from "date-fns";
import { MapPin, Calendar, Users, Clock } from "lucide-react";

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
}

export default function EventListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    async function fetchEvents() {
      try {
        const fetchedEvents = await getEvents();
        setEvents(fetchedEvents);
      } catch (error) {
        console.error("Error fetching events:", error);
        toast({
          title: "Error",
          description: "Failed to fetch events",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchEvents();
  }, [toast]);

  const handleViewDetails = (eventId: string) => {
    router.push(`/events/${eventId}`);
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full bg-gray-800 text-gray-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-purple-400">
            Events
          </CardTitle>
          <CardDescription className="text-gray-400">
            Explore and join upcoming events
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="bg-gray-700 border-gray-600">
                  <CardHeader>
                    <Skeleton className="h-6 w-2/3 bg-gray-600" />
                    <Skeleton className="h-4 w-1/2 bg-gray-600" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full bg-gray-600" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-full bg-gray-600" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : events.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Card
                  key={event.id}
                  className="bg-gray-700 border-gray-600 overflow-hidden"
                >
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-purple-300">
                      {event.name}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      {format(new Date(event.startTime * 1000), "PPP")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                      {event.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-400">
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>
                          {format(new Date(event.startTime * 1000), "p")} -{" "}
                          {format(new Date(event.endTime * 1000), "p")}
                        </span>
                      </div>
                      <div className="flex items-center text-sm text-gray-400">
                        <MapPin className="mr-2 h-4 w-4" />
                        <span>
                          {event.latitude.toFixed(6)},{" "}
                          {event.longitude.toFixed(6)}
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
                  </CardContent>
                  <CardFooter className="flex justify-between items-center">
                    <Badge
                      variant="outline"
                      className="text-xs bg-gray-600 text-gray-300 border-gray-500"
                    >
                      {event.chain}
                    </Badge>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewDetails(event.id)}
                      className="bg-purple-600 text-white hover:bg-purple-700"
                    >
                      View Details
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400">No events found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
