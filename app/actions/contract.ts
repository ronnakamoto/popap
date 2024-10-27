"use server";

import { kv } from "@vercel/kv";
import { ethers } from "ethers";

interface DeployContractParams {
  chain: string;
  from: string;
  bytecode: string;
  abi: any[];
}

interface Wallet {
  chain: string;
  address: string;
  balance: string;
  index: number;
}

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8080";

export async function deployContract({
  chain,
  from,
  bytecode,
  abi,
}: DeployContractParams) {
  try {
    // Fetch the active wallet from KV store
    const activeWallet = await kv.get<Wallet>("activeWallet");
    if (!activeWallet) {
      throw new Error("No active wallet found");
    }

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
          bytecode,
          abi,
          index: activeWallet.index,
          json: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Store the deployed contract address in KV store
    await kv.set(`contract:${chain}:${from}`, result.contractAddress);

    return result;
  } catch (error) {
    console.error("Error deploying contract:", error);
    throw error;
  }
}

export async function getDeployedContractAddress(chain: string, from: string) {
  try {
    const contractAddress = await kv.get<string>(`contract:${chain}:${from}`);
    return contractAddress;
  } catch (error) {
    console.error("Error fetching deployed contract address:", error);
    throw error;
  }
}

export async function createEvent(contractAddress: string, eventParams: any) {
  try {
    const activeWallet = await kv.get<Wallet>("activeWallet");
    if (!activeWallet) {
      throw new Error("No active wallet found");
    }

    // Assuming you have an ABI for the ProofOfPhysicalAttendance contract
    const abi = [
      /* ... ProofOfPhysicalAttendance ABI ... */
    ];
    const contract = new ethers.Contract(
      contractAddress,
      abi,
      new ethers.JsonRpcProvider(process.env.RPC_URL),
    );

    const tx = await contract.createEvent(eventParams, {
      from: activeWallet.address,
      gasLimit: 500000, // Adjust as needed
    });

    const receipt = await tx.wait();

    // Store the event details in KV store
    const eventId = receipt.logs[0].args.eventId.toString();
    await kv.set(`event:${eventId}`, {
      ...eventParams,
      creator: activeWallet.address,
      contractAddress,
    });

    return { eventId, transactionHash: receipt.transactionHash };
  } catch (error) {
    console.error("Error creating event:", error);
    throw error;
  }
}

export async function getEvent(eventId: string) {
  try {
    const eventDetails = await kv.get<any>(`event:${eventId}`);
    if (!eventDetails) {
      throw new Error("Event not found");
    }
    return eventDetails;
  } catch (error) {
    console.error("Error fetching event details:", error);
    throw error;
  }
}
