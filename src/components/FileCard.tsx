import React, { useState } from 'react';
import '../style/FileCard.css';
import { 
  FileText, FileImage, FileVideo, FileCode, FileArchive, FileAudio, 
  File, Copy, Check, ExternalLink, Download, Trash2, Calendar, HardDrive 
} from 'lucide-react';

import type { R2File } from '../types';

interface FileCardProps {
  file: R2File;
  onDelete: (file: R2File) => void;
  isSelected?: boolean;
  selectionIndex?: number | null;
  onSelectToggle?: () => void;
  isSelectionMode?: boolean;
}

export const FileCard: React.FC<FileCardProps> = ({ 
  file, 
  onDelete,
  isSelected = false,
  selectionIndex = null,
  onSelectToggle,
  isSelectionMode = false,
}) => {
  const [copied, setCopied] = useState(false);

  // Format File Size
  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format Date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  // Get File Icon based on extension or mime-type
  const getFileIcon = () => {
    const ext = file.key.split('.').pop()?.toLowerCase();
    const type = file.contentType || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <FileImage className="file-type-icon img-theme" size={24} />;
    }
    if (['mp4', 'webm', 'ogg', 'mov', 'mkv'].includes(ext || '') || type.startsWith('video/')) {
      return <FileVideo className="file-type-icon video-theme" size={24} />;
    }
    if (['mp3', 'wav', 'aac', 'flac'].includes(ext || '') || type.startsWith('audio/')) {
      return <FileAudio className="file-type-icon audio-theme" size={24} />;
    }
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext || '')) {
      return <FileArchive className="file-type-icon archive-theme" size={24} />;
    }
    if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'py', 'go'].includes(ext || '')) {
      return <FileCode className="file-type-icon code-theme" size={24} />;
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md'].includes(ext || '')) {
      return <FileText className="file-type-icon doc-theme" size={24} />;
    }
    return <File className="file-type-icon generic-theme" size={24} />;
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering selection click
    try {
      await navigator.clipboard.writeText(file.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  // Check if file is image for thumbnail preview
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(file.key.split('.').pop()?.toLowerCase() || '');

  return (
    <div 
      className={`glass-panel file-card-item ${isSelected ? 'selected-card' : ''}`}
      onClick={() => {
        if (isSelectionMode && onSelectToggle) {
          onSelectToggle();
        }
      }}
      style={{ cursor: isSelectionMode ? 'pointer' : 'default' }}
    >
      {/* Dynamic Selection Checkbox */}
      {(isSelectionMode || isSelected) && (
        <div 
          className={`card-select-checkbox ${isSelected ? 'selected' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (onSelectToggle) onSelectToggle();
          }}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {isSelected && (
            selectionIndex !== null ? (
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'white' }}>{selectionIndex}</span>
            ) : (
              <Check size={10} className="check-icon" />
            )
          )}
        </div>
      )}

      {/* File Preview Container */}
      <div className="file-preview-area">
        {isImage ? (
          <div className="image-preview-wrapper">
            <img src={file.url} alt={file.key} className="image-preview" loading="lazy" />
            <div className="image-overlay">
              <a 
                href={file.url} 
                target="_blank" 
                rel="noreferrer" 
                className="overlay-btn" 
                title="Open Fullscreen"
                onClick={(e) => e.stopPropagation()} // Avoid triggering selection click
              >
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        ) : (
          <div className="icon-preview-wrapper">
            {getFileIcon()}
            <span className="file-extension-badge">.{file.key.split('.').pop() || 'file'}</span>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="file-details">
        <h4 className="file-name-title" title={file.key}>
          {file.key}
        </h4>
        
        <div className="file-meta-grid">
          <div className="meta-item">
            <HardDrive size={12} className="meta-icon" />
            <span>{formatSize(file.size)}</span>
          </div>
          <div className="meta-item">
            <Calendar size={12} className="meta-icon" />
            <span>{formatDate(file.lastModified)}</span>
          </div>
        </div>
      </div>

      {/* File Actions */}
      <div className="file-card-actions">
        <button 
          className={`action-pill copy-pill ${copied ? 'copied-pill' : ''}`}
          onClick={handleCopyLink}
          title="Copy public URL"
        >
          {copied ? (
            <>
              <Check size={14} className="green-text" />
              <span className="action-text green-text">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span className="action-text">Copy URL</span>
            </>
          )}
        </button>

        <div className="action-button-group">
          <a 
            href={file.url} 
            download={file.key} 
            target="_blank" 
            rel="noreferrer" 
            className="action-icon-btn" 
            title="Download file"
            onClick={(e) => e.stopPropagation()} // Avoid triggering selection click
          >
            <Download size={14} />
          </a>
          <button 
            className="action-icon-btn delete-btn"
            onClick={(e) => {
              e.stopPropagation(); // Avoid triggering selection click
              onDelete(file);
            }}
            title="Delete file"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

    </div>
  );
};
