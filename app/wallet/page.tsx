import MultiChainWalletCreator from "../components/WalletCreator";

export default function WalletPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <h1 className="text-5xl font-extrabold mb-12 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
          Create Your Crypto Wallet
        </h1>
        <MultiChainWalletCreator />
      </div>
    </div>
  );
}
