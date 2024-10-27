"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getHealthStatus, HealthResponse } from "@/app/actions/health";
import { Loader2, AlertTriangle } from "lucide-react";

export function StatusIndicator() {
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        setIsLoading(true);
        const data = await getHealthStatus();
        setHealthData(data);
        setError(null);
      } catch (err) {
        setError("Bunsan server is currently unavailable");
        setHealthData(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, []);

  const isServerRunning = healthData?.status === "ok";
  const totalHealthyNodes =
    healthData?.chains.reduce((sum, chain) => sum + chain.healthy_nodes, 0) ||
    0;
  const totalNodes =
    healthData?.chains.reduce((sum, chain) => sum + chain.total_nodes, 0) || 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 px-3 py-2 hover:bg-gray-700 flex items-center space-x-2"
          aria-label="View Bunsan Status"
        >
          <div
            className={cn(
              "w-3 h-3 rounded-full",
              isServerRunning ? "bg-green-500" : "bg-red-500",
              isServerRunning && "animate-pulse",
            )}
            aria-hidden="true"
          />
          <span className="text-sm font-medium text-gray-300">
            Bunsan Status
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 bg-gray-800 border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h4 className="text-lg font-semibold text-gray-100 mb-2">
            Bunsan Status
          </h4>
          {isLoading ? (
            <div className="flex items-center text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <p className="text-sm">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex items-center text-red-400">
              <AlertTriangle className="mr-2 h-4 w-4" />
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-300">
                Status:{" "}
                <span
                  className={
                    isServerRunning ? "text-green-400" : "text-red-400"
                  }
                >
                  {isServerRunning ? "Online" : "Offline"}
                </span>
              </p>
              <p className="text-sm text-gray-300">
                Healthy Nodes:{" "}
                <span className="font-semibold">{totalHealthyNodes}</span> /{" "}
                {totalNodes}
              </p>
            </>
          )}
        </div>
        {healthData && (
          <ScrollArea className="h-[300px]">
            <div className="p-4">
              <h5 className="text-sm font-semibold text-gray-200 mb-3">
                Chain Details
              </h5>
              <div className="space-y-3">
                {healthData.chains.map((chain) => (
                  <div
                    key={chain.chain_id}
                    className="bg-gray-700 p-3 rounded-lg"
                  >
                    <p className="text-sm font-medium text-gray-200">
                      Chain ID: {chain.chain_id}
                    </p>
                    <p className="text-sm text-gray-300">
                      Healthy Nodes:{" "}
                      <span className="font-semibold">
                        {chain.healthy_nodes}
                      </span>{" "}
                      / {chain.total_nodes}
                    </p>
                    <div className="mt-2 bg-gray-600 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${(chain.healthy_nodes / chain.total_nodes) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
