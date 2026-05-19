import React from 'react';
import '../style/Header.css';
import { Cloud, HardDrive, ShieldCheck, Database, HelpCircle } from 'lucide-react';
import type { HeaderProps } from '../types';

export const Header: React.FC<HeaderProps> = ({
  bucketName,
  isConnected,
  totalFiles,
  totalSize,
}) => {
  const isSecure = window.location.protocol === 'https:';

  return (
    <header className="header-glass">
      <div className="container header-container">
        {/* Brand/Logo Section */}
        <div className="logo-section">
          <div className="logo-icon-wrapper">
            <Cloud className="cloud-icon" />
            <Database className="db-icon" />
          </div>
          <div className="logo-text">
            <span className="logo-title">R2<span className="orange-text">Portal</span></span>
            <span className="logo-subtitle">Cloudflare Object Storage Manager</span>
          </div>
        </div>

        {/* Real-time Storage Stats */}
        <div className="stats-strip">
          <div className="stat-pill">
            <HardDrive size={14} className="stat-icon" />
            <span className="stat-label">Files:</span>
            <span className="stat-val">{totalFiles}</span>
          </div>
          <div className="stat-pill">
            <Database size={14} className="stat-icon" />
            <span className="stat-label">Used:</span>
            <span className="stat-val">{totalSize}</span>
          </div>
          <div className="stat-pill">
            <ShieldCheck size={14} className={`stat-icon ${isSecure ? 'green-text' : 'orange-text'}`} />
            <span className="stat-label">Security:</span>
            <span className={`stat-val ${isSecure ? 'green-text' : 'orange-text'}`}>
              {isSecure ? 'HTTPS (TLS 1.3)' : 'HTTP (Local)'}
            </span>
          </div>
        </div>

        {/* Connection and Action Items */}
        <div className="header-actions">
          <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="pulse-dot"></span>
            <span className="status-text">
              {isConnected ? `r2://${bucketName || 'default-bucket'}` : 'Offline'}
            </span>
          </div>

          <a href="https://developers.cloudflare.com/r2/" target="_blank" rel="noreferrer" className="help-link" title="R2 Documentation">
            <HelpCircle size={20} />
          </a>
        </div>
      </div>

    </header>
  );
};
