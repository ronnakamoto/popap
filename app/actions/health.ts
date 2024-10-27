"use server";

import { headers } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

export interface ChainHealth {
  chain_id: number;
  healthy_nodes: number;
  total_connections: number;
  total_nodes: number;
}

export interface HealthResponse {
  chains: ChainHealth[];
  status: string;
}

export async function getHealthStatus(): Promise<HealthResponse> {
  try {
    const headersList = headers();
    const host = headersList.get("host") || "localhost:3000";
    const protocol = host.startsWith("localhost") ? "http" : "https";

    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        Host: host,
        Origin: `${protocol}://${host}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch health data");
    }

    const data: HealthResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching health status:", error);
    throw error;
  }
}
