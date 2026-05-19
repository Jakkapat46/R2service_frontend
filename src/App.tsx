import React, { useState } from 'react';
import { Header } from './components/Header';
import { R2UploadManager } from './components/R2UploadManager';
import { Footer } from './components/Footer';
import { ToastContainer } from './components/Toast';
import type { ToastItem } from './components/Toast';

const App: React.FC = () => {
  // Global dashboard states synced from dynamic backend check
  const [bucketName, setBucketName] = useState<string>('Connecting...');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [totalFiles, setTotalFiles] = useState(0);
  const [totalSize, setTotalSize] = useState('0 Bytes');

  // Global Toast State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(7);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleStatusUpdate = (connected: boolean, activeBucket: string) => {
    setIsConnected(connected);
    setBucketName(activeBucket);
  };

  const handleStatsUpdate = (count: number, sizeStr: string) => {
    setTotalFiles(count);
    setTotalSize(sizeStr);
  };

  return (
    <>
      {/* Premium Floating Header */}
      <Header 
        bucketName={bucketName} 
        isConnected={isConnected} 
        totalFiles={totalFiles} 
        totalSize={totalSize} 
      />

      {/* Global Toast Container below Header */}
      <ToastContainer toasts={toasts} />

      {/* Main App Container */}
      <main style={{ flexGrow: 1, padding: '24px 0' }}>
        {/* Animated Background Blob Accent */}
        <div className="bg-blob-accent"></div>
        <div className="bg-blob-accent blob-blue"></div>

        {/* Master Upload Manager Dashboard */}
        <R2UploadManager 
          onStatsUpdate={handleStatsUpdate}
          onStatusUpdate={handleStatusUpdate}
          showToast={showToast}
        />
      </main>

      {/* Premium System operational Footer */}
      <Footer isConnected={isConnected} />

    </>
  );
};

export default App;
