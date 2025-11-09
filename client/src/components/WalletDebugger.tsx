import React from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export default function WalletDebugger() {
  const { publicKey, connected, wallet } = useWallet();

  // Debug: Log wallet structure
  console.log('Wallet Debugger - Phantom wallet:', { publicKey: publicKey?.toString(), connected, wallet: wallet?.adapter.name });

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 shadow-lg z-50 max-w-sm">
      <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">
        Phantom Wallet Debug Info
      </h3>
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
        <div>Connected: {connected ? 'Yes' : 'No'}</div>
        <div>Wallet: {wallet?.adapter.name || 'Not connected'}</div>
        {connected && publicKey && (
          <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-green-700 dark:text-green-300">
            ✅ Phantom wallet connected
            <div className="mt-1 font-mono text-xs">
              {publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
