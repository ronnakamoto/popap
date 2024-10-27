"use server";

import { kv } from "@vercel/kv";
import { ethers } from "ethers";
import ProofOfPhysicalAttendanceABI from "@/contracts/artifacts/src/PPAP.sol/ProofOfPhysicalAttendance.json";

interface DeployContractParams {
  chain: string;
  from: string;
  index: number;
}

interface Wallet {
  chain: string;
  address: string;
  balance: string;
  index: number;
}

interface ContractData {
  chain: string;
  from: string;
  contractAddress: string;
  explorerUrl: string;
  transactionHash: string;
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

    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const signer = new ethers.Wallet(activeWallet.address, provider);
    const contract = new ethers.Contract(
      contractAddress,
      ProofOfPhysicalAttendanceABI.abi,
      signer,
    );

    const tx = await contract.createEvent(...Object.values(eventParams), {
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

export async function getDeployedContracts() {
  try {
    const keys = await kv.keys("contract:*");
    const contracts = await Promise.all(
      keys.map(async (key) => {
        const contractData = await kv.get<any>(key);
        return {
          chain: contractData.chain,
          from: contractData.from,
          address: contractData.contractAddress,
          explorerUrl: contractData?.explorerUrl,
        };
      }),
    );
    return contracts;
  } catch (error) {
    console.error("Error fetching deployed contracts:", error);
    throw error;
  }
}
