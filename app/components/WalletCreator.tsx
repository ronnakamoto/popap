"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  Loader2,
  Plus,
  RefreshCw,
  ExternalLink,
  Send,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  createWallet,
  getWallets,
  updateWalletBalances,
  sendFunds,
  receiveFunds,
} from "../actions/wallet";

interface ChainConfig {
  name: string;
  symbol: string;
  explorerUrl: string;
  logoUrl: string;
}

const chainConfigs: Record<string, ChainConfig> = {
  ethereum: {
    name: "Ethereum",
    symbol: "ETH",
    explorerUrl: "https://etherscan.io",
    logoUrl: "/images/eth-logo.png",
  },
  sepolia: {
    name: "Sepolia",
    symbol: "ETH",
    explorerUrl: "https://sepolia.etherscan.io",
    logoUrl: "/images/eth-logo.png",
  },
  "bitcoin-testnet": {
    name: "Bitcoin Testnet",
    symbol: "BTC",
    explorerUrl: "https://blockstream.info/testnet",
    logoUrl: "/images/bitcoin-logo.png",
  },
  aurora: {
    name: "Aurora",
    symbol: "ETH",
    explorerUrl: "https://explorer.aurora.dev",
    logoUrl: "/images/aurora-logo.webp",
  },
  auroratestnet: {
    name: "Aurora Testnet",
    symbol: "ETH",
    explorerUrl: "https://explorer.testnet.aurora.dev",
    logoUrl: "/images/aurora-logo.webp",
  },
};

interface Wallet {
  chain: string;
  address: string;
  balance: string;
  index: number;
}

export default function EnhancedMultiChainWalletCreator() {
  const [selectedChain, setSelectedChain] = useState<string>("ethereum");
  const [fundAmount, setFundAmount] = useState("0.01");
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [sendAmount, setSendAmount] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [expandedWallet, setExpandedWallet] = useState<number | null>(null);

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

  const handleSendFunds = async () => {
    if (!selectedWallet) return;
    setIsSending(true);
    setError("");
    try {
      await sendFunds(
        selectedWallet.chain,
        selectedWallet.address,
        recipientAddress,
        sendAmount,
      );
      await fetchWallets();
      setSendAmount("");
      setRecipientAddress("");
    } catch (err: any) {
      setError("Failed to send funds: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleReceiveFunds = async () => {
    if (!selectedWallet) return;
    setIsReceiving(true);
    setError("");
    try {
      await receiveFunds(selectedWallet.chain, selectedWallet.address);
      await fetchWallets();
    } catch (err: any) {
      setError("Failed to receive funds: " + err.message);
    } finally {
      setIsReceiving(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card className="w-full bg-gray-800 text-gray-100 border-gray-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-purple-400">
            Wallet Creator
          </CardTitle>
          <CardDescription className="text-gray-400">
            Create, manage, and transact with your multi-chain wallets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col md:flex-row items-end space-y-4 md:space-y-0 md:space-x-4">
            <div className="w-full md:w-1/3">
              <Select value={selectedChain} onValueChange={setSelectedChain}>
                <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
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
            </div>
            <div className="w-full md:w-1/3">
              <Input
                type="text"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder={`Amount to fund (in ${chainConfigs[selectedChain].symbol})`}
                className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
            <Button
              onClick={handleCreateWallet}
              disabled={isLoading}
              className="w-full md:w-auto bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md transition duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Wallet
                </>
              )}
            </Button>
          </div>

          {error && (
            <Alert
              variant="destructive"
              className="bg-red-900 border-red-800 text-red-200 rounded-md"
            >
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-purple-400">Your Wallets</h2>
            <Button
              onClick={handleRefreshBalances}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
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
                className="bg-gray-700 border-gray-600 overflow-hidden group hover:border-purple-500/50 transition-colors"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="bg-purple-500/10 text-purple-400 border-purple-500/20 capitalize"
                    >
                      {wallet.chain}
                    </Badge>
                    <div className="relative w-8 h-8">
                      <Image
                        src={chainConfigs[wallet.chain].logoUrl}
                        alt={`${chainConfigs[wallet.chain].name} logo`}
                        layout="fill"
                        objectFit="contain"
                        className="rounded-full"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between">
                      <span className="text-gray-400">Address:</span>
                      <span className="font-mono text-purple-300">
                        {wallet.address.slice(0, 6)}...
                        {wallet.address.slice(-4)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-gray-400">Balance:</span>
                      <span className="font-mono text-purple-300">
                        {wallet.balance} {chainConfigs[wallet.chain].symbol}
                      </span>
                    </p>
                    {expandedWallet === index && (
                      <div className="mt-4 space-y-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
                              onClick={() => setSelectedWallet(wallet)}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send Funds
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-gray-800 text-white">
                            <DialogHeader>
                              <DialogTitle>Send Funds</DialogTitle>
                              <DialogDescription>
                                Send funds from your wallet to another address.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="amount" className="text-right">
                                  Amount
                                </Label>
                                <Input
                                  id="amount"
                                  value={sendAmount}
                                  onChange={(e) =>
                                    setSendAmount(e.target.value)
                                  }
                                  className="col-span-3 bg-gray-700 border-gray-600 text-white"
                                  placeholder={`Amount in ${chainConfigs[wallet.chain].symbol}`}
                                />
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label
                                  htmlFor="recipient"
                                  className="text-right"
                                >
                                  Recipient
                                </Label>
                                <Input
                                  id="recipient"
                                  value={recipientAddress}
                                  onChange={(e) =>
                                    setRecipientAddress(e.target.value)
                                  }
                                  className="col-span-3 bg-gray-700 border-gray-600 text-white"
                                  placeholder="Recipient address"
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleSendFunds}
                                disabled={isSending}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                {isSending ? "Sending..." : "Send"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-purple-400 border-purple-400 hover:bg-purple-400 hover:text-white"
                          onClick={handleReceiveFunds}
                          disabled={isReceiving}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          {isReceiving ? "Receiving..." : "Receive Funds"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <Button
                    asChild
                    variant="link"
                    className="text-purple-400 hover:text-purple-300 transition-colors p-0"
                  >
                    <a
                      href={`${chainConfigs[wallet.chain].explorerUrl}/address/${wallet.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center"
                    >
                      View on Explorer
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-purple-400 hover:text-purple-300"
                    onClick={() =>
                      setExpandedWallet(expandedWallet === index ? null : index)
                    }
                  >
                    {expandedWallet === index ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
