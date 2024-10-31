"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";

interface CountdownProps {
  startTime: number;
  endTime: number;
}

export function Countdown({ startTime, endTime }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const start = startTime * 1000;
      const end = endTime * 1000;
      const difference = start - now;

      if (now < start) {
        // Event hasn't started yet
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60),
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        setStatus("Starts in");
      } else if (now >= start && now < end) {
        // Event is ongoing
        const remaining = end - now;
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor(
          (remaining % (1000 * 60 * 60)) / (1000 * 60),
        );
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        setStatus("Ends in");
      } else {
        // Event has ended
        setTimeLeft("Ended");
        setStatus("");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, endTime]);

  return (
    <Badge
      variant="secondary"
      className="text-xs bg-purple-900/50 text-purple-300 border-purple-400"
    >
      {status && `${status} `}
      {timeLeft}
    </Badge>
  );
}
