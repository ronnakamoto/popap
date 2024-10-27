"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink } from "lucide-react";
import { deployContract, getDeployedContracts } from "@/app/actions/contract";
import useWalletStore from "@/app/store/useWalletStore";
import { useToast } from "@/hooks/use-toast";

interface DeployedContract {
  chain: string;
  from: string;
  address: string;
  explorerUrl: string;
}

export default function DeployContractPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [deployedContracts, setDeployedContracts] = useState<
    DeployedContract[]
  >([]);
  const router = useRouter();
  const { activeWallet, selectedChain } = useWalletStore();
  const { toast } = useToast();

  const fetchDeployedContracts = useCallback(async () => {
    try {
      const contracts = await getDeployedContracts();
      setDeployedContracts(contracts);
    } catch (error) {
      console.error("Error fetching deployed contracts:", error);
      toast({
        title: "Error",
        description: "Failed to fetch deployed contracts",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchDeployedContracts();
  }, [fetchDeployedContracts]);

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChain || !activeWallet || isLoading) return;

    setIsLoading(true);

    try {
      const result = await deployContract({
        chain: selectedChain,
        from: activeWallet.address,
        index: activeWallet.index,
      });
      toast({
        title: "Contract Deployed",
        description: (
          <div>
            <p>
              Contract deployed successfully at address:{" "}
              {result.contractAddress}
            </p>
            <Link
              href={result.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-2 text-sm text-purple-400 hover:text-purple-300"
            >
              View on Explorer
              <ExternalLink className="ml-1 h-4 w-4" />
            </Link>
          </div>
        ),
        duration: 5000,
      });
      await fetchDeployedContracts();
    } catch (err) {
      toast({
        title: "Error",
        description:
          err instanceof Error
            ? err.message
            : "An error occurred while deploying the contract",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex space-x-6">
        <Card className="w-1/2 bg-gray-800 text-gray-100 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-purple-400">
              Deploy PPAP Contract
            </CardTitle>
            <CardDescription className="text-gray-400">
              Deploy the Proof Of Physical Attendance Protocol contract using
              your active wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeploy} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="chain" className="text-gray-200">
                  Selected Chain
                </Label>
                <Input
                  id="chain"
                  value={selectedChain}
                  disabled
                  placeholder="No chain selected"
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="from" className="text-gray-200">
                  From Address
                </Label>
                <Input
                  id="from"
                  value={activeWallet?.address || ""}
                  disabled
                  placeholder="No wallet selected"
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="index" className="text-gray-200">
                  Wallet Index
                </Label>
                <Input
                  id="index"
                  value={
                    activeWallet?.index !== undefined ? activeWallet.index : ""
                  }
                  disabled
                  placeholder="No wallet selected"
                  className="bg-gray-700 text-gray-100 border-gray-600"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                disabled={isLoading || !selectedChain || !activeWallet}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  "Deploy Contract"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="w-1/2 bg-gray-800 text-gray-100 border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-purple-400">
              Deployed Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
              {deployedContracts.length > 0 ? (
                <ul className="space-y-4">
                  {deployedContracts.map((contract, index) => (
                    <li key={index} className="bg-gray-700 p-4 rounded-md">
                      <p className="text-sm text-gray-300">
                        Chain: {contract.chain}
                      </p>
                      <p className="text-sm text-gray-300">
                        From: {contract.from}
                      </p>
                      <p className="text-sm text-gray-300 break-all">
                        Address: {contract.address}
                      </p>
                      {contract.explorerUrl && (
                        <Link
                          href={contract.explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center mt-2 text-sm text-purple-400 hover:text-purple-300"
                        >
                          View on Explorer
                          <ExternalLink className="ml-1 h-4 w-4" />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-400">No contracts deployed yet.</p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
