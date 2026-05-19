import React from 'react';
import '../style/Footer.css';
import { Server, Heart } from 'lucide-react';
import type { FooterProps } from '../types';

export const Footer: React.FC<FooterProps> = ({ isConnected }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer-glass">
      <div className="container footer-container">
        {/* Left Side: Copy & Info */}
        <div className="footer-left">
          <div className="status-indicator">
            <Server size={14} className={`status-pulse-icon ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>R2 Node Status: </span>
            <span className="status-highlight">
              {isConnected ? 'Cloudflare Edge (Connected)' : 'Server Offline'}
            </span>
            <span className={`operational-dot ${isConnected ? 'online' : 'offline'}`}></span>
            <span className={`operational-text ${isConnected ? 'online' : 'offline'}`}>
              {isConnected ? 'Operational' : 'Inactive'}
            </span>
          </div>
          <p className="copyright-text">
            &copy; {currentYear} R2Portal. Powered by Cloudflare R2 &bull; All rights reserved.
          </p>
        </div>

        {/* Center/Right Side: Stack & Links */}
        <div className="footer-right">
          <div className="tech-stack-row">
            <span className="tech-tag">React 18</span>
            <span className="tech-tag">Vite</span>
            <span className="tech-tag">TypeScript</span>
            <span className="tech-tag">R2 S3 API</span>
          </div>
          
          <div className="love-note">
            Made with <Heart size={12} className="heart-icon" /> for cloud developers
          </div>
        </div>
      </div>

    </footer>
  );
};
