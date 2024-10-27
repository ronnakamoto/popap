"use client";

import { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
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
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import "leaflet/dist/leaflet.css";

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
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateEventPage() {
  const [position, setPosition] = useState<[number, number]>([51.505, -0.09]);
  const { toast } = useToast();

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
    },
  });

  function MapEvents() {
    useMapEvents({
      click(e) {
        setPosition([e.latlng.lat, e.latlng.lng]);
        form.setValue("latitude", e.latlng.lat);
        form.setValue("longitude", e.latlng.lng);
      },
    });
    return null;
  }

  async function onSubmit(data: FormValues) {
    try {
      // Here you would interact with your smart contract
      console.log(data);
      toast({
        title: "Event Created",
        description: "Your event has been successfully created!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          "There was an error creating your event. Please try again.",
        variant: "destructive",
      });
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
                  Click on the map to set the event location
                </FormDescription>
                <div className="h-[400px] rounded-md overflow-hidden">
                  <MapContainer
                    center={position}
                    zoom={13}
                    scrollWheelZoom={false}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={position} icon={customIcon} />
                    <MapEvents />
                  </MapContainer>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                Create Event
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
