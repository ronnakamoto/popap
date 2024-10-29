"use server";

import { kv } from "@vercel/kv";
import ProofOfPhysicalAttendanceABI from "@/contracts/artifacts/src/PPAP.sol/ProofOfPhysicalAttendance.json";

interface DeployContractParams {
  chain: string;
  from: string;
  index: number;
}

interface ContractData {
  chain: string;
  from: string;
  contractAddress: string;
  explorerUrl: string;
  transactionHash: string;
  deployedAt: number;
}

interface ContractCallParams {
  chain: string;
  to: string;
  from: string;
  method: string;
  abi: any;
  index: number;
  args: (string | number | boolean)[];
}

interface CreateEventParams {
  chain: string;
  from: string;
  index: number;
  contractAddress: string;
  eventParams: any;
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

export async function deployContract({
  chain,
  from,
  index,
}: DeployContractParams) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/extensions/near-mpc-accounts/deploy-contract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chain,
          from,
          bytecode: ProofOfPhysicalAttendanceABI.bytecode,
          abi: ProofOfPhysicalAttendanceABI.abi,
          index,
          json: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    const contractData: ContractData = {
      chain,
      from,
      contractAddress: result.contractAddress,
      explorerUrl: result.explorerUrl,
      transactionHash: result.transactionHash,
      deployedAt: Date.now(),
    };

    // Store all data from the result in KV store
    const contractKey = `contract:${chain}:${from}:${result.contractAddress}`;
    await kv.set(contractKey, contractData);

    // Also store a mapping of contractAddress to the contract key for easier lookup
    await kv.set(`contractAddress:${result.contractAddress}`, contractKey);

    return contractData;
  } catch (error) {
    console.error("Error deploying contract:", error);
    throw error;
  }
}

export async function getDeployedContractAddress(chain: string, from: string) {
  try {
    const keys = await kv.keys(`contract:${chain}:${from}:*`);
    if (keys.length > 0) {
      const contractData = await kv.get<ContractData>(keys[0]);
      return contractData?.contractAddress;
    }
    return null;
  } catch (error) {
    console.error("Error fetching deployed contract address:", error);
    throw error;
  }
}

export async function callContractMethod({
  chain,
  to,
  from,
  method,
  abi,
  index,
  args,
}: ContractCallParams) {
  try {
    const requestBody = {
      chain,
      to,
      from,
      method,
      abi,
      index,
      args,
      json: true,
    };
    console.log("Request payload:", JSON.stringify(requestBody, null, 2));
    const response = await fetch(
      `${API_BASE_URL}/extensions/near-mpc-accounts/contract-call`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      // Get the error details from response
      const errorText = await response.text();
      console.error("Response status:", response.status);
      console.error("Response body:", errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, details: ${errorText}`,
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`Error calling contract method ${method}:`, error);
    throw error;
  }
}

// function escapeAndQuote(str: string): string {
//   return `'${str.replace(/'/g, "\\'")}'`;
// }

export async function createEvent({
  chain,
  from,
  index,
  contractAddress,
  eventParams,
}: CreateEventParams) {
  try {
    const {
      name,
      description,
      startTime,
      endTime,
      latitude,
      longitude,
      radiusMiles,
      maxAttendees,
      minStayMinutes,
    } = eventParams;

    const latitudeAbs = Math.abs(Math.floor(latitude * 1e6));
    const longitudeAbs = Math.abs(Math.floor(longitude * 1e6));

    // Find the createEvent ABI
    const createEventABI = ProofOfPhysicalAttendanceABI.abi.find(
      (item) => item.type === "function" && item.name === "createEvent",
    );

    if (!createEventABI) {
      throw new Error("createEvent ABI not found");
    }

    const result = await callContractMethod({
      chain,
      to: contractAddress,
      from,
      method: "createEvent",
      abi: JSON.stringify([createEventABI]),
      index,
      args: [
        name,
        description,
        Math.floor(startTime).toString(),
        Math.floor(endTime).toString(),
        latitudeAbs.toString(),
        latitude < 0,
        longitudeAbs.toString(),
        longitude < 0,
        Math.floor(radiusMiles * 1e6).toString(),
        maxAttendees.toString(),
        minStayMinutes.toString(),
      ],
    });

    // Store the event details in KV store
    const txHash = result.data.hash;
    const explorerUrl = result.data.explorerUrl;
    await kv.set(`event:${txHash}`, {
      ...eventParams,
      creator: from,
      contractAddress,
      chain,
      explorerUrl,
    });

    return { contractAddress, transactionHash: txHash, explorerUrl };
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

// export async function getEvent(eventId: string) {
//   try {
//     const eventDetails = await kv.get<any>(`event:${eventId}`);
//     if (!eventDetails) {
//       throw new Error("Event not found");
//     }
//     return eventDetails;
//   } catch (error) {
//     console.error("Error fetching event details:", error);
//     throw error;
//   }
// }

export async function getDeployedContracts() {
  try {
    const keys = await kv.keys("contract:*");
    const contracts = await Promise.all(
      keys.map(async (key) => {
        const contractData = await kv.get<ContractData>(key);
        return {
          chain: contractData?.chain,
          from: contractData?.from,
          address: contractData?.contractAddress,
          explorerUrl: contractData?.explorerUrl,
          deployedAt: contractData?.deployedAt || Date.now(),
        };
      }),
    );
    contracts.sort((a, b) => b.deployedAt - a.deployedAt);
    return contracts;
  } catch (error) {
    console.error("Error fetching deployed contracts:", error);
    throw error;
  }
}

export async function getEvents() {
  try {
    const keys = await kv.keys("event:*");
    const events = await Promise.all(
      keys.map(async (key) => {
        const event = await kv.get(key);
        return {
          id: key.split(":")[1],
          ...event,
          latitude: event.latitude / 1e6,
          longitude: event.longitude / 1e6,
          radiusMiles: event.radiusMiles / 1e6,
        };
      }),
    );
    return events;
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

export async function getEvent(id: string) {
  try {
    const event = await kv.get(`event:${id}`);
    if (!event) throw new Error("Event not found");
    return {
      id,
      ...event,
      latitude: event.latitude / 1e6,
      longitude: event.longitude / 1e6,
      radiusMiles: event.radiusMiles / 1e6,
    };
  } catch (error) {
    console.error("Error fetching event:", error);
    throw error;
  }
}

export async function checkIn(
  eventId: string,
  userAddress: string,
  chain: string,
  index: number,
  latitude: number,
  longitude: number,
) {
  try {
    const event = await getEvent(eventId);
    if (!event) throw new Error("Event not found");

    const latitudeAbs = Math.abs(Math.floor(latitude * 1e6));
    const longitudeAbs = Math.abs(Math.floor(longitude * 1e6));

    const result = await callContractMethod({
      chain,
      to: event.contractAddress,
      from: userAddress,
      method: "checkIn",
      abi: JSON.stringify([
        {
          inputs: [
            { name: "eventId", type: "uint256" },
            { name: "latitude", type: "uint128" },
            { name: "latitudeIsNegative", type: "bool" },
            { name: "longitude", type: "uint128" },
            { name: "longitudeIsNegative", type: "bool" },
          ],
          name: "checkIn",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ]),
      index,
      args: [
        eventId,
        latitudeAbs.toString(),
        latitude < 0,
        longitudeAbs.toString(),
        longitude < 0,
      ],
    });

    console.log("result: ", result);

    const checkInKey = `checkin:${eventId}:${userAddress}`;
    await kv.set(checkInKey, Date.now());

    return result;
  } catch (error) {
    console.error("Error checking in:", error);
    throw error;
  }
}

export async function checkOut(
  eventId: string,
  userAddress: string,
  chain: string,
  index: number,
  latitude: number,
  longitude: number,
) {
  try {
    const event = await getEvent(eventId);
    if (!event) throw new Error("Event not found");

    const latitudeAbs = Math.abs(Math.floor(latitude * 1e6));
    const longitudeAbs = Math.abs(Math.floor(longitude * 1e6));

    const result = await callContractMethod({
      chain,
      to: event.contractAddress,
      from: userAddress,
      method: "checkOut",
      abi: JSON.stringify([
        {
          inputs: [
            { name: "eventId", type: "uint256" },
            { name: "latitude", type: "uint128" },
            { name: "latitudeIsNegative", type: "bool" },
            { name: "longitude", type: "uint128" },
            { name: "longitudeIsNegative", type: "bool" },
          ],
          name: "checkOut",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ]),
      index,
      args: [
        eventId,
        latitudeAbs.toString(),
        latitude < 0,
        longitudeAbs.toString(),
        longitude < 0,
      ],
    });

    console.log("result: ", result);

    const checkInKey = `checkin:${eventId}:${userAddress}`;
    await kv.del(checkInKey);

    return result;
  } catch (error) {
    console.error("Error checking out:", error);
    throw error;
  }
}
