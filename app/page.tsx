import Link from "next/link";
import { MapPin, Calendar, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="space-y-24 py-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tighter">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Proof of Physical Attendance Protocol
          </span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto">
          Create, manage, and verify physical attendance for your events using
          blockchain technology.
        </p>
        <div className="flex justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
          >
            <Link href="/create-event">Create Event</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300"
          >
            <Link href="/events">Explore Events</Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            icon: MapPin,
            title: "Geolocation Verification",
            description:
              "Ensure attendees are physically present at your event location.",
          },
          {
            icon: Calendar,
            title: "Flexible Scheduling",
            description:
              "Create and manage events with customizable start and end times.",
          },
          {
            icon: Shield,
            title: "Blockchain Security",
            description:
              "Leverage blockchain technology for tamper-proof attendance records.",
          },
          {
            icon: Users,
            title: "NFT Certificates",
            description:
              "Issue unique NFTs as proof of attendance for participants.",
          },
        ].map((feature, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-purple-500/20 transition-shadow duration-300"
          >
            <feature.icon className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-400">{feature.description}</p>
          </div>
        ))}
      </section>

      {/* How It Works Section */}
      <section className="space-y-12">
        <h2 className="text-3xl md:text-4xl font-bold text-center">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              step: 1,
              title: "Create Event",
              description:
                "Set up your event with details, location, and attendance requirements.",
            },
            {
              step: 2,
              title: "Attendees Check-In",
              description:
                "Participants use the app to check in when they arrive at the event location.",
            },
            {
              step: 3,
              title: "Verify & Mint NFT",
              description:
                "After the event, attendees check out and receive a unique NFT as proof of attendance.",
            },
          ].map((step, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-purple-500 flex items-center justify-center text-2xl font-bold mb-4">
                {step.step}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-purple-800 to-pink-700 rounded-lg p-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Ready to revolutionize event attendance?
        </h2>
        <p className="text-xl mb-8">
          Join PPAP today and start creating blockchain-verified events!
        </p>
        <Button
          asChild
          size="lg"
          className="bg-white text-purple-700 hover:bg-gray-100"
        >
          <Link href="/create-event">Get Started Now</Link>
        </Button>
      </section>
    </div>
  );
}
