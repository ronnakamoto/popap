"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  Wallet,
  Settings,
  File,
  RefreshCw,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWallets, getWalletBalance } from "@/app/actions/wallet";
import useWalletStore from "@/app/store/useWalletStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Wallet {
  chain: string;
  address: string;
  balance: string;
  index: number;
}

const chainConfigs: Record<
  string,
  { name: string; symbol: string; logoUrl: string }
> = {
  ethereum: {
    name: "Ethereum",
    symbol: "ETH",
    logoUrl: "/images/eth-logo.png",
  },
  sepolia: {
    name: "Sepolia",
    symbol: "ETH",
    logoUrl: "/images/eth-logo.png",
  },
  bitcoin: {
    name: "Bitcoin",
    symbol: "BTC",
    logoUrl: "/images/bitcoin-logo.png",
  },
  aurora: {
    name: "Aurora",
    symbol: "ETH",
    logoUrl: "/images/aurora-logo.webp",
  },
  auroratestnet: {
    name: "Aurora Testnet",
    symbol: "ETH",
    logoUrl: "/images/aurora-logo.webp",
  },
};

const formatBalance = (balance: string): string => {
  const numBalance = parseFloat(balance);
  return numBalance.toFixed(2);
};

export default function WalletSelector() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [refreshingWallets, setRefreshingWallets] = useState<Set<string>>(
    new Set(),
  );
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const { activeWallet, setActiveWallet, setSelectedChain } = useWalletStore();
  const router = useRouter();

  const fetchWallets = useCallback(async () => {
    setRefreshingWallets(new Set(wallets.map((w) => w.address)));
    try {
      const fetchedWallets = await getWallets();
      setWallets(fetchedWallets);
      if (fetchedWallets.length > 0) {
        if (!activeWallet) {
          // Only set the first wallet as active if there's no active wallet
          setActiveWallet(fetchedWallets[0]);
          setSelectedChain(fetchedWallets[0].chain);
        } else {
          // Update the active wallet's balance if it exists in the fetched wallets
          const updatedActiveWallet = fetchedWallets.find(
            (w) => w.address === activeWallet.address,
          );
          if (updatedActiveWallet) {
            setActiveWallet(updatedActiveWallet);
            setSelectedChain(updatedActiveWallet.chain);
          }
        }
      }
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error fetching wallets:", error);
    } finally {
      setRefreshingWallets(new Set());
    }
  }, [activeWallet, setActiveWallet, setSelectedChain]);

  useEffect(() => {
    fetchWallets();
    const intervalId = setInterval(fetchWallets, 60000); // Refresh every minute
    return () => clearInterval(intervalId);
  }, []);

  const refreshBalance = async (wallet: Wallet) => {
    setRefreshingWallets((prev) => new Set(prev).add(wallet.address));
    try {
      const newBalance = await getWalletBalance(wallet.chain, wallet.address);
      setWallets((prevWallets) =>
        prevWallets.map((w) =>
          w.address === wallet.address ? { ...w, balance: newBalance } : w,
        ),
      );
      if (activeWallet && activeWallet.address === wallet.address) {
        setActiveWallet((prev) => ({ ...prev, balance: newBalance }));
      }
      setLastRefreshed(new Date());
    } catch (error) {
      console.error("Error refreshing balance:", error);
    } finally {
      setRefreshingWallets((prev) => {
        const newSet = new Set(prev);
        newSet.delete(wallet.address);
        return newSet;
      });
    }
  };

  const handleManageWallets = () => {
    router.push("/wallet");
  };

  const handleManageContracts = () => {
    router.push("/deploy-contract");
  };

  const handleSelectWallet = (wallet: Wallet) => {
    setActiveWallet(wallet);
    setSelectedChain(wallet.chain);
  };

  if (!activeWallet) {
    return (
      <Button
        variant="outline"
        className="h-9 px-3 py-2 bg-gray-800 text-gray-300 border-gray-700"
      >
        <Wallet className="mr-2 h-4 w-4" />
        No Wallet
      </Button>
    );
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-9 px-3 py-2 bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <div className="flex items-center">
              <Image
                src={chainConfigs[activeWallet.chain].logoUrl}
                alt={chainConfigs[activeWallet.chain].name}
                width={20}
                height={20}
                className="mr-2 rounded-full"
              />
              <span className="mr-1 text-sm">
                {chainConfigs[activeWallet.chain].name}
              </span>
              <span className="font-mono text-xs">
                {formatBalance(activeWallet.balance)}{" "}
                {chainConfigs[activeWallet.chain].symbol}
              </span>
              <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 bg-gray-800 border-gray-700"
        >
          <DropdownMenuLabel className="text-gray-300 flex justify-between items-center">
            <span>Select Wallet</span>
            {lastRefreshed && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-xs text-gray-400">
                    Last updated: {lastRefreshed.toLocaleTimeString()}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Balance last refreshed at this time</p>
                </TooltipContent>
              </Tooltip>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-gray-700" />
          {wallets.map((wallet) => (
            <DropdownMenuItem
              key={`${wallet.address}-${wallet.balance}`}
              onSelect={() => handleSelectWallet(wallet)}
              className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white hover:bg-gray-700 transition-colors"
            >
              <Image
                src={chainConfigs[wallet.chain].logoUrl}
                alt={chainConfigs[wallet.chain].name}
                width={20}
                height={20}
                className="mr-2 rounded-full"
              />
              <div className="flex-grow">
                <div>{chainConfigs[wallet.chain].name}</div>
                <div className="text-xs text-gray-400">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </div>
              </div>
              <span className="font-mono text-xs mr-2">
                {formatBalance(wallet.balance)}{" "}
                {chainConfigs[wallet.chain].symbol}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshBalance(wallet);
                    }}
                    disabled={refreshingWallets.has(wallet.address)}
                    className="ml-2 p-1 hover:bg-gray-600 transition-colors"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${refreshingWallets.has(wallet.address) ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh balance</p>
                </TooltipContent>
              </Tooltip>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              fetchWallets();
            }}
            className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${refreshingWallets.size > 0 ? "animate-spin" : ""}`}
            />
            <span>Refresh All Balances</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-gray-700" />
          <DropdownMenuItem
            onSelect={handleManageWallets}
            className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span>Manage Wallets</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={handleManageContracts}
            className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white hover:bg-gray-700 transition-colors cursor-pointer"
          >
            <File className="mr-2 h-4 w-4" />
            <span>Manage Contracts</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
