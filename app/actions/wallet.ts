"use server";

import { ethers } from "ethers";
import { kv } from "@vercel/kv";

const chainConfigs = {
  ethereum: {
    rpcUrl: "http://localhost:8080/eth",
    chainId: 1,
  },
  sepolia: {
    rpcUrl: "http://localhost:8080/sepolia",
    chainId: 11155111,
  },
  // "bitcoin-testnet": {
  //   rpcUrl: "https://blockstream.info/testnet/api",
  // },
  aurora: {
    rpcUrl: "https://mainnet.aurora.dev",
    chainId: 1313161554,
  },
  auroratestnet: {
    rpcUrl: "https://testnet.aurora.dev",
    chainId: 1313161555,
  },
};

const ADDRESS_GENERATOR_URL =
  "http://localhost:8080/extensions/near-mpc-accounts/generate-address";

export async function createWallet(chain: string, fundAmount: string) {
  const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
  if (!chainConfig && chain !== "bitcoin") {
    throw new Error("Invalid chain selected");
  }

  try {
    // Get the current index for the selected chain
    const indexKey = `${chain}_index`;
    const currentIndex = ((await kv.get(indexKey)) as number) || 0;
    const newIndex = currentIndex + 1;

    const requestBody = JSON.stringify({
      chain,
      index: newIndex,
      json: true,
    });

    console.log("requestBody: ", requestBody);

    // Generate new address using the HTTP endpoint
    const response = await fetch(ADDRESS_GENERATOR_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data } = await response.json();
    const newAddress = data.address;

    if (!newAddress) {
      throw new Error("Failed to generate new address");
    }

    // Only increment and store the index if address generation was successful
    await kv.set(indexKey, newIndex);

    let balance = "0";

    if (!["bitcoin", "bitcoin-testnet"].includes(chain)) {
      // Fund the new address (except for Bitcoin)
      const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
      const wallet = new ethers.Wallet(
        process.env.FUNDER_PRIVATE_KEY!,
        provider,
      );

      const tx = await wallet.sendTransaction({
        to: newAddress,
        value: ethers.parseEther(fundAmount),
        chainId: chainConfig.chainId,
      });

      await tx.wait();

      // Get the new balance
      const newBalance = await provider.getBalance(newAddress);
      balance = ethers.formatEther(newBalance);
    }

    const newWallet = {
      chain,
      address: newAddress,
      index: newIndex,
    };

    // Store the new wallet in the KV store
    await kv.set(`wallet:${chain}:${newIndex}`, newWallet);

    // Add the wallet to the list of wallets for this chain
    const chainWallets = ((await kv.get(`wallets:${chain}`)) as string[]) || [];
    chainWallets.push(`${chain}:${newIndex}`);
    await kv.set(`wallets:${chain}`, chainWallets);

    return newWallet;
  } catch (error: any) {
    console.error("Error creating wallet:", error);
    throw new Error(`Failed to create wallet: ${error.message}`);
  }
}

export async function getWallets() {
  const wallets = [];
  for (const chain of Object.keys(chainConfigs)) {
    const chainWallets = ((await kv.get(`wallets:${chain}`)) as string[]) || [];
    for (const walletKey of chainWallets) {
      const wallet = await kv.get(`wallet:${walletKey}`);
      if (wallet) {
        const balance = await getWalletBalance(wallet.chain, wallet.address);
        wallets.push({ ...wallet, balance });
      }
    }
  }
  return wallets;
}

export async function getWalletBalance(chain: string, address: string) {
  const chainConfig = chainConfigs[chain as keyof typeof chainConfigs];
  if (!chainConfig) {
    throw new Error("Invalid chain selected");
  }

  if (chain === "bitcoin") {
    // Implement Bitcoin balance check here
    throw new Error("Bitcoin balance check not implemented");
  }

  const provider = new ethers.JsonRpcProvider(chainConfig.rpcUrl);
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

export async function updateWalletBalances() {
  const wallets = await getWallets();
  for (const wallet of wallets) {
    if (wallet.chain !== "bitcoin") {
      const newBalance = await getWalletBalance(wallet.chain, wallet.address);
      const updatedWallet = {
        ...wallet,
        balance: newBalance,
      };
      await kv.set(`wallet:${wallet.chain}:${wallet.index}`, updatedWallet);
    }
  }
}

export async function sendETH(
  chain: string,
  from: string,
  to: string,
  value: string,
  index: number,
) {
  try {
    const valueInWei = ethers.parseEther(value).toString();
    const response = await fetch(
      "http://localhost:8080/extensions/near-mpc-accounts/send-eth",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chain,
          from,
          to,
          value: valueInWei,
          index,
          json: true,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Removed the balance update in KV store as per the request

    return result;
  } catch (error) {
    console.error("Error sending ETH:", error);
    throw error;
  }
}
export async function receiveFunds() {}
