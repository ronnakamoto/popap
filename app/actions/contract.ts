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
    const requestBody = {
      chain,
      from,
      bytecode: ProofOfPhysicalAttendanceABI.bytecode,
      abi: ProofOfPhysicalAttendanceABI.abi,
      index,
      json: true,
    };
    console.log("requestBody: ", requestBody);
    const response = await fetch(
      `${API_BASE_URL}/extensions/near-mpc-accounts/deploy-contract`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

async function getNextEventId(
  contractAddress: string,
  chain: string,
): Promise<any> {
  const key = `nextEventId:${chain}:${contractAddress}`;
  const eventId = await kv.get<number>(key);
  if (!eventId) {
    throw new Error("Could not get the Event ID");
  }
  // const nextId = await kv.incr(key);
  return { eventId, key };
}

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

    // Get the next event ID for this contract
    const { eventId, key } = await getNextEventId(contractAddress, chain);

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
    await kv.set(`event:${chain}:${contractAddress}:${eventId}`, {
      ...eventParams,
      eventId,
      creator: from,
      contractAddress,
      chain,
      explorerUrl,
      txHash,
    });

    await kv.incr(key);

    return { contractAddress, transactionHash: txHash, explorerUrl, eventId };
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

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
        if (!event) return null;

        return {
          id: event.eventId, // Use eventId from the event object
          ...event,
          // Convert coordinates from stored format (already in event object with correct values)
          latitude: event.latitude / 1e6,
          longitude: event.longitude / 1e6,
          radiusMiles: event.radiusMiles / 1e6,
          // These fields are already in the event object, no need to parse from key
          chain: event.chain,
          contractAddress: event.contractAddress,
        };
      }),
    );

    // Filter out any null events and return
    return events.filter(Boolean);
  } catch (error) {
    console.error("Error fetching events:", error);
    throw error;
  }
}

export async function getEvent(
  chain: string,
  contractAddress: string,
  eventId: string,
) {
  try {
    const event = await kv.get(`event:${chain}:${contractAddress}:${eventId}`);
    if (!event) throw new Error("Event not found");
    return {
      id: eventId,
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
  chain: string,
  contractAddress: string,
  eventId: string,
  userAddress: string,
  index: number,
  latitude: number,
  longitude: number,
) {
  try {
    const event = await getEvent(chain, contractAddress, eventId);
    if (!event) throw new Error("Event not found");

    const latitudeAbs = Math.abs(Math.floor(latitude * 1e6));
    const longitudeAbs = Math.abs(Math.floor(longitude * 1e6));

    const result = await callContractMethod({
      chain,
      to: contractAddress,
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

    console.log("Check-in result:", result);

    const checkInKey = `checkin:${chain}:${contractAddress}:${eventId}:${userAddress}`;
    await kv.set(checkInKey, Date.now());

    return result;
  } catch (error) {
    console.error("Error checking in:", error);
    throw error;
  }
}

export async function checkOut(
  chain: string,
  contractAddress: string,
  eventId: string,
  userAddress: string,
  index: number,
  latitude: number,
  longitude: number,
) {
  try {
    const event = await getEvent(chain, contractAddress, eventId);
    if (!event) throw new Error("Event not found");

    const latitudeAbs = Math.abs(Math.floor(latitude * 1e6));
    const longitudeAbs = Math.abs(Math.floor(longitude * 1e6));

    const result = await callContractMethod({
      chain,
      to: contractAddress,
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

    console.log("Check-out result:", result);

    const checkInKey = `checkin:${chain}:${contractAddress}:${eventId}:${userAddress}`;
    await kv.del(checkInKey);

    return result;
  } catch (error) {
    console.error("Error checking out:", error);
    throw error;
  }
}
