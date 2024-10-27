"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, Wallet, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWallets } from "@/app/actions/wallet";

interface Wallet {
  chain: string;
  address: string;
  balance: string;
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
    logoUrl: "/images/aurora-logo.png",
  },
  auroraTestnet: {
    name: "Aurora Testnet",
    symbol: "ETH",
    logoUrl: "/images/aurora-testnet-logo.png",
  },
};

const formatBalance = (balance: string): string => {
  const numBalance = parseFloat(balance);
  return numBalance.toFixed(2);
};

export default function WalletSelector() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchWallets = async () => {
      const fetchedWallets = await getWallets();
      setWallets(fetchedWallets);
      if (fetchedWallets.length > 0) {
        setSelectedWallet(fetchedWallets[0]);
      }
    };
    fetchWallets();
  }, []);

  const handleManageWallets = () => {
    router.push("/wallet");
  };

  if (!selectedWallet) {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 px-3 py-2 bg-gray-800 text-gray-300 border-gray-700"
        >
          <div className="flex items-center">
            <Image
              src={chainConfigs[selectedWallet.chain].logoUrl}
              alt={chainConfigs[selectedWallet.chain].name}
              width={20}
              height={20}
              className="mr-2 rounded-full"
            />
            <span className="mr-1 text-sm">
              {chainConfigs[selectedWallet.chain].name}
            </span>
            <span className="font-mono text-xs">
              {formatBalance(selectedWallet.balance)}{" "}
              {chainConfigs[selectedWallet.chain].symbol}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-gray-800 border-gray-700"
      >
        <DropdownMenuLabel className="text-gray-300">
          Select Wallet
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        {wallets.map((wallet, index) => (
          <DropdownMenuItem
            key={index}
            onSelect={() => setSelectedWallet(wallet)}
            className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white"
          >
            <Image
              src={chainConfigs[wallet.chain].logoUrl}
              alt={chainConfigs[wallet.chain].name}
              width={20}
              height={20}
              className="mr-2 rounded-full"
            />
            <span className="flex-grow">{chainConfigs[wallet.chain].name}</span>
            <span className="font-mono text-xs">
              {formatBalance(wallet.balance)}{" "}
              {chainConfigs[wallet.chain].symbol}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          onSelect={handleManageWallets}
          className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Manage Wallets</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
