"use client";

import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { createEvent, getDeployedContracts } from "@/app/actions/contract";
import useWalletStore from "@/app/store/useWalletStore";
import "leaflet/dist/leaflet.css";
import { Loader2, Search, MapPin, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

const customIcon = new Icon({
  iconUrl: "/images/marker-icon.png",
  iconSize: [40, 41],
  iconAnchor: [12, 41],
});

const formSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Event name must be at least 3 characters long" }),
  description: z
    .string()
    .min(10, { message: "Description must be at least 10 characters long" }),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start time",
  }),
  endTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end time" }),
  maxAttendees: z.number().min(1, { message: "Must have at least 1 attendee" }),
  minStayMinutes: z
    .number()
    .min(1, { message: "Minimum stay must be at least 1 minute" }),
  requiresVerification: z.boolean(),
  latitude: z.number(),
  longitude: z.number(),
  radiusMiles: z
    .number()
    .min(0.1, { message: "Radius must be at least 0.1 miles" }),
  contractAddress: z.string().min(1, { message: "Please select a contract" }),
});

type FormValues = z.infer<typeof formSchema>;

interface DeployedContract {
  address: string;
  chain: string;
  deployedAt: number;
}

function MapEvents({
  setPosition,
}: {
  setPosition: (pos: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.on("click", (e) => {
      setPosition([e.latlng.lat, e.latlng.lng]);
    });
  }, [map, setPosition]);

  return null;
}

export default function CreateEventPage() {
  const [position, setPosition] = useState<[number, number]>([51.505, -0.09]);
  const [isLoading, setIsLoading] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<
    DeployedContract[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const mapRef = useRef(null);
  const { toast } = useToast();
  const { activeWallet, selectedChain } = useWalletStore();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      startTime: "",
      endTime: "",
      maxAttendees: 100,
      minStayMinutes: 30,
      requiresVerification: false,
      latitude: position[0],
      longitude: position[1],
      radiusMiles: 0.1,
      contractAddress: "",
    },
  });

  useEffect(() => {
    async function fetchDeployedContracts() {
      try {
        const contracts = await getDeployedContracts();
        setDeployedContracts(contracts);
      } catch (error) {
        console.error("Error fetching deployed contracts:", error);
        toast({
          title: "Error",
          description: "Failed to fetch deployed contracts",
          variant: "destructive",
        });
      }
    }
    fetchDeployedContracts();
  }, [toast]);

  const handlePositionChange = (newPosition: [number, number]) => {
    setPosition(newPosition);
    form.setValue("latitude", newPosition[0]);
    form.setValue("longitude", newPosition[1]);
  };

  const handleSearch = async () => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        handlePositionChange([parseFloat(lat), parseFloat(lon)]);
        mapRef.current?.flyTo([lat, lon], 13);
      } else {
        toast({
          title: "Location not found",
          description: "Please try a different search query.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching for location:", error);
      toast({
        title: "Search Error",
        description: "An error occurred while searching for the location.",
        variant: "destructive",
      });
    }
  };

  const handleCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          handlePositionChange([latitude, longitude]);
          mapRef.current?.flyTo([latitude, longitude], 13);
        },
        (error) => {
          console.error("Error getting current location:", error);
          toast({
            title: "Location Error",
            description:
              "Unable to get your current location. Please ensure you've granted permission.",
            variant: "destructive",
          });
        },
      );
    } else {
      toast({
        title: "Geolocation Unavailable",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
    }
  };

  async function onSubmit(data: FormValues) {
    if (!activeWallet || !selectedChain) {
      toast({
        title: "Error",
        description: "No active wallet or chain selected",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await createEvent({
        chain: selectedChain,
        from: activeWallet.address,
        index: activeWallet.index,
        contractAddress: data.contractAddress,
        eventParams: {
          name: data.name,
          description: data.description,
          startTime: Math.floor(new Date(data.startTime).getTime() / 1000),
          endTime: Math.floor(new Date(data.endTime).getTime() / 1000),
          maxAttendees: data.maxAttendees,
          minStayMinutes: data.minStayMinutes,
          requiresVerification: data.requiresVerification,
          latitude: data.latitude,
          longitude: data.longitude,
          radiusMiles: Math.floor(data.radiusMiles),
        },
      });

      toast({
        title: "Event Created Successfully! 🎉",
        description: (
          <div className="space-y-2">
            <div className="flex flex-col space-y-1">
              <p className="font-medium text-base">{data.name}</p>
              <p className="text-sm text-muted-foreground">
                Created on {selectedChain} network
              </p>
            </div>
            <div className="flex flex-col space-y-1">
              <div className="flex items-center space-x-2">
                <Badge
                  variant="outline"
                  className="bg-purple-500/10 text-purple-500"
                >
                  Event ID: {result.eventId}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-emerald-500/10 text-emerald-500"
                >
                  {data.maxAttendees} attendees max
                </Badge>
              </div>
            </div>
            <Link
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              View on Explorer
              <ExternalLink className="ml-1 h-4 w-4" />
            </Link>
          </div>
        ),
        duration: 8000,
      });
    } catch (error) {
      console.error("Error creating event:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "There was an error creating your event. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full max-w-4xl mx-auto bg-gray-800 text-gray-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-purple-400">
            Create New Event
          </CardTitle>
          <CardDescription className="text-gray-400">
            Set up your event details and location
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="contractAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">
                      Select Contract
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-gray-700 text-gray-100 border-gray-600">
                          <SelectValue placeholder="Select a deployed contract" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-gray-800 text-gray-100 border-gray-600">
                        {deployedContracts.map((contract, index) => (
                          <SelectItem
                            key={contract.address}
                            value={contract.address}
                            className="focus:bg-gray-700 focus:text-gray-100"
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>
                                {contract.address.slice(0, 6)}...
                                {contract.address.slice(-4)} ({contract.chain})
                              </span>
                              <div className="ml-2 flex items-center space-x-2">
                                <Badge
                                  variant="outline"
                                  className="text-xs bg-gray-700 text-gray-300 border-gray-600"
                                >
                                  {formatDistanceToNow(contract.deployedAt, {
                                    addSuffix: true,
                                  })}
                                </Badge>
                                {index === 0 && (
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-purple-600 text-white"
                                  >
                                    Latest
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Event Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter event name"
                        {...field}
                        className="bg-gray-700 text-gray-100 border-gray-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your event"
                        {...field}
                        className="bg-gray-700 text-gray-100 border-gray-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">
                        Start Time
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          className="bg-gray-700 text-gray-100 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">End Time</FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          {...field}
                          className="bg-gray-700 text-gray-100 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">
                        Max Attendees
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                          className="bg-gray-700 text-gray-100 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="minStayMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-200">
                        Minimum Stay (minutes)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(parseInt(e.target.value))
                          }
                          className="bg-gray-700 text-gray-100 border-gray-600"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="requiresVerification"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-600 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base text-gray-200">
                        Requires Verification
                      </FormLabel>
                      <FormDescription className="text-gray-400">
                        Toggle if attendance requires manual verification
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="radiusMiles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-200">
                      Geofence Radius (miles)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value))
                        }
                        className="bg-gray-700 text-gray-100 border-gray-600"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                <FormLabel className="text-gray-200">Event Location</FormLabel>
                <FormDescription className="text-gray-400">
                  Search for a location, use your current location, or click on
                  the map to set the event location
                </FormDescription>
                <div className="flex space-x-2 mb-2">
                  <Input
                    type="text"
                    placeholder="Search for a location"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-700 text-gray-100 border-gray-600"
                  />
                  <Button
                    onClick={handleSearch}
                    type="button"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </Button>
                  <Button
                    onClick={handleCurrentLocation}
                    type="button"
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Current Location
                  </Button>
                </div>
                <div className="h-[400px] rounded-md overflow-hidden relative z-0">
                  <MapContainer
                    center={position}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                    ref={mapRef}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={position} icon={customIcon}>
                      <Popup>
                        <div className="text-gray-800">
                          <h3 className="font-bold">Event Location</h3>
                          <p>Latitude: {position[0].toFixed(6)}</p>
                          <p>Longitude: {position[1].toFixed(6)}</p>
                        </div>
                      </Popup>
                    </Marker>
                    <MapEvents setPosition={handlePositionChange} />
                  </MapContainer>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Event...
                  </>
                ) : (
                  "Create Event"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
