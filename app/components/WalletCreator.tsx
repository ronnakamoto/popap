"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ExternalLink, RefreshCw, Plus } from "lucide-react";
import Image from "next/image";
import {
  createWallet,
  getWallets,
  updateWalletBalances,
} from "../actions/wallet";

interface ChainConfig {
  name: string;
  symbol: string;
  explorerUrl: string;
  logoUrl: string;
}

const chainConfigs: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum Mainnet",
    symbol: "ETH",
    explorerUrl: "https://etherscan.io",
    logoUrl: "/images/eth-logo.png",
  },
  sepolia: {
    name: "Sepolia Testnet",
    symbol: "ETH",
    explorerUrl: "https://sepolia.etherscan.io",
    logoUrl: "/images/eth-logo.png",
  },
  bitcoin: {
    name: "Bitcoin",
    symbol: "BTC",
    explorerUrl: "https://blockchain.info",
    logoUrl: "/images/bitcoin-logo.png",
  },
  aurora: {
    name: "Aurora Mainnet",
    symbol: "ETH",
    explorerUrl: "https://aurorascan.dev",
    logoUrl: "/images/aurora-logo.png",
  },
  auroraTestnet: {
    name: "Aurora Testnet",
    symbol: "ETH",
    explorerUrl: "https://testnet.aurorascan.dev",
    logoUrl: "/images/aurora-testnet-logo.png",
  },
};

interface Wallet {
  chain: string;
  address: string;
  balance: string;
  index: number;
}

export default function MultiChainWalletCreator() {
  const [selectedChain, setSelectedChain] = useState<string>("ethereum");
  const [fundAmount, setFundAmount] = useState("0.01");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      const fetchedWallets = await getWallets();
      setWallets(fetchedWallets);
    } catch (err: any) {
      setError("Failed to fetch wallets: " + err.message);
    }
  };

  const handleCreateWallet = async () => {
    setIsLoading(true);
    setError("");

    try {
      const newWallet = await createWallet(selectedChain, fundAmount);
      setWallets([...wallets, newWallet]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshBalances = async () => {
    setIsRefreshing(true);
    setError("");

    try {
      await updateWalletBalances();
      await fetchWallets();
    } catch (err: any) {
      setError("Failed to refresh balances: " + err.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-12 bg-gray-800 border-gray-700 overflow-hidden rounded-2xl shadow-2xl">
          <CardHeader className="bg-gradient-to-r from-purple-800 to-pink-700 p-6">
            <CardTitle className="text-3xl font-bold text-white">
              Create and Fund Wallet
            </CardTitle>
            <CardDescription className="text-gray-200">
              Generate a new wallet and fund it with crypto
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="w-full md:w-[180px] bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select chain" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {Object.entries(chainConfigs).map(([key, config]) => (
                    <SelectItem
                      key={key}
                      value={key}
                      className="text-white hover:bg-gray-600"
                    >
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder={`Amount to fund (in ${chainConfigs[selectedChain].symbol})`}
                className="flex-grow bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
              <Button
                onClick={handleCreateWallet}
                disabled={isLoading}
                className="w-full md:w-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-3 px-6 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Create and Fund Wallet
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert
                variant="destructive"
                className="bg-red-900 border-red-800 text-red-200 rounded-xl"
              >
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-purple-400">Your Wallets</h2>
          <Button
            onClick={handleRefreshBalances}
            disabled={isRefreshing}
            className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:-translate-y-1 hover:scale-105 shadow-lg"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Balances
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallets.map((wallet, index) => (
            <Card
              key={index}
              className="bg-gray-800 border-gray-700 overflow-hidden rounded-xl transform transition duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/20"
            >
              <CardContent className="p-6">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="relative w-12 h-12">
                    <Image
                      src={chainConfigs[wallet.chain].logoUrl}
                      alt={`${chainConfigs[wallet.chain].name} logo`}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-full bg-white p-1"
                    />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-purple-400">
                      {chainConfigs[wallet.chain].name} Wallet
                    </h3>
                    <p className="text-sm text-gray-400">
                      {chainConfigs[wallet.chain].explorerUrl.replace(
                        "https://",
                        "",
                      )}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 text-gray-300">
                  <p className="flex justify-between">
                    <span className="font-semibold text-purple-400">
                      Address:
                    </span>
                    <span className="text-sm break-all">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold text-purple-400">
                      Balance:
                    </span>
                    <span>
                      {wallet.balance} {chainConfigs[wallet.chain].symbol}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span className="font-semibold text-purple-400">
                      Index:
                    </span>
                    <span>{wallet.index}</span>
                  </p>
                </div>
              </CardContent>
              <CardFooter className="bg-gray-900 p-4">
                <Button
                  asChild
                  variant="outline"
                  className="w-full bg-transparent border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-300 rounded-full"
                >
                  <a
                    href={`${chainConfigs[wallet.chain].explorerUrl}/address/${wallet.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center"
                  >
                    View on Explorer
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
