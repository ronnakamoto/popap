"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronDown, Wallet, Settings, File } from "lucide-react";
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
import useWalletStore from "@/app/store/useWalletStore";

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
  const { activeWallet, setActiveWallet, setSelectedChain } = useWalletStore();
  const router = useRouter();

  useEffect(() => {
    const fetchWallets = async () => {
      const fetchedWallets = await getWallets();
      setWallets(fetchedWallets);
      if (fetchedWallets.length > 0 && !activeWallet) {
        setActiveWallet(fetchedWallets[0]);
        setSelectedChain(fetchedWallets[0].chain);
      }
    };
    fetchWallets();
  }, [activeWallet, setActiveWallet, setSelectedChain]);

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="h-9 px-3 py-2 bg-gray-800 text-gray-300 border-gray-700"
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
        className="w-56 bg-gray-800 border-gray-700"
      >
        <DropdownMenuLabel className="text-gray-300">
          Select Wallet
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        {wallets.map((wallet, index) => (
          <DropdownMenuItem
            key={index}
            onSelect={() => handleSelectWallet(wallet)}
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
          className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Manage Wallets</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={handleManageContracts}
          className="flex items-center text-gray-300 focus:bg-gray-700 focus:text-white cursor-pointer"
        >
          <File className="mr-2 h-4 w-4" />
          <span>Manage Contracts</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
