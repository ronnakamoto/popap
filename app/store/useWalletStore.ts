import { create } from "zustand";

interface Wallet {
  chain: string;
  address: string;
  balance: string;
  index: number;
}

interface WalletStore {
  activeWallet: Wallet | null;
  selectedChain: string;
  setActiveWallet: (wallet: Wallet | null) => void;
  setSelectedChain: (chain: string) => void;
}

const useWalletStore = create<WalletStore>((set) => ({
  activeWallet: null,
  selectedChain: "",
  setActiveWallet: async (wallet) => {
    set({ activeWallet: wallet });
  },
  setSelectedChain: (chain) => set({ selectedChain: chain }),
}));

export default useWalletStore;
