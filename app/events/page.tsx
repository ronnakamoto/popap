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
import { format, formatDistanceToNow } from "date-fns";
import {
  MapPin,
  Calendar,
  Users,
  Clock,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

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
  explorerUrl: string;
  status?: string;
  eventId: string; // Added to handle the numeric event ID
}

export default function EventListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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

  const handleViewDetails = (event: Event) => {
    const compositeId = `${event.chain}:${event.contractAddress}:${event.eventId}`;
    router.push(`/events/${compositeId}`);
  };

  const getChainBadgeColor = (chain: string) => {
    switch (chain.toLowerCase()) {
      case "sepolia":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "goerli":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
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
                  key={`${event.chain}:${event.contractAddress}:${event.eventId}`}
                  className="bg-gray-700 border-gray-600 overflow-hidden group hover:border-purple-500/50 transition-colors"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge
                        variant="outline"
                        className={`${getChainBadgeColor(event.chain)} capitalize`}
                      >
                        {event.chain}
                      </Badge>
                      {event.status && (
                        <Badge
                          variant="outline"
                          className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                        >
                          {event.status}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl font-semibold text-purple-300 mt-2">
                      {event.name}
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Starts{" "}
                      {formatDistanceToNow(new Date(event.startTime * 1000), {
                        addSuffix: true,
                      })}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 mb-4 line-clamp-3">
                      {event.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-400">
                        <Calendar className="mr-2 h-4 w-4" />
                        <div className="flex flex-col">
                          <span>
                            Starts:{" "}
                            {format(new Date(event.startTime * 1000), "PPP p")}
                          </span>
                          <span>
                            Ends:{" "}
                            {format(new Date(event.endTime * 1000), "PPP p")}
                          </span>
                        </div>
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
                      <div className="flex items-center text-sm">
                        {event.explorerUrl ? (
                          <Link
                            href={event.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            <span className="truncate">
                              Contract: {formatAddress(event.contractAddress)}
                            </span>
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        ) : (
                          <div className="flex items-center text-gray-400">
                            <LinkIcon className="mr-2 h-4 w-4" />
                            <span className="truncate">
                              Contract: {formatAddress(event.contractAddress)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleViewDetails(event)}
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
