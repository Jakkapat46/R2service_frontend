import React, { useState, useEffect, useRef } from 'react';
import '../style/R2UploadManager.css';
import { 
  UploadCloud, Search, AlertCircle, 
  Layers, Flame, Plus 
} from 'lucide-react';
import { FileCard } from './FileCard';
import { ConfirmModal } from './ConfirmModal';
import { uploadService } from '../services/uploadService';
import type { R2File, UploadingQueueItem } from '../types';

interface R2UploadManagerProps {
  onStatsUpdate: (totalCount: number, totalSizeStr: string) => void;
  onStatusUpdate: (isConnected: boolean, bucketName: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const R2UploadManager: React.FC<R2UploadManagerProps> = ({
  onStatsUpdate,
  onStatusUpdate,
  showToast,
}) => {
  const [files, setFiles] = useState<R2File[]>([]);
  const [uploadingQueue, setUploadingQueue] = useState<UploadingQueueItem[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'images' | 'media' | 'docs' | 'archives'>('all');
  const [isConnected, setIsConnected] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files from the Node.js backend using centralized uploadService
  const fetchFiles = async () => {
    const mappedFiles = await uploadService.getFiles();
    setFiles(mappedFiles);
  };

  // Initialize and check connection to backend API using centralized uploadService
  useEffect(() => {
    const checkConnectionAndLoad = async () => {
      try {
        await fetchFiles();
        setIsConnected(true);
        
        // Fetch dynamic active bucket info from backend health!
        const health = await uploadService.getHealth();
        onStatusUpdate(health.isHealthy, health.bucketName);
      } catch (err) {
        console.error('Backend connection failed:', err);
        setIsConnected(false);
        setFiles([]);
        onStatusUpdate(false, 'offline');
      }
    };

    checkConnectionAndLoad();
  }, []);

  // Update global stats whenever files array changes
  useEffect(() => {
    const totalCount = files.length;
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

    const formatSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    onStatsUpdate(totalCount, formatSize(totalBytes));
  }, [files, onStatsUpdate]);

  // Drag and Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFilesUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFilesUpload(Array.from(e.target.files));
    }
  };

  // File Upload using uploadService (Live Mode only)
  const handleFilesUpload = (selectedFiles: File[]) => {
    if (!isConnected) {
      alert('Error: Disconnected from backend server. Upload is unavailable.');
      return;
    }

    selectedFiles.forEach(async (file) => {
      const uploadId = Math.random().toString(36).substring(7);
      
      const newQueueItem: UploadingQueueItem = {
        id: uploadId,
        name: file.name,
        size: file.size,
        progress: 0,
        speed: 'Connecting...',
        status: 'uploading',
      };

      setUploadingQueue((prev) => [newQueueItem, ...prev]);

      try {
        const newUploadedFile = await uploadService.uploadFile(
          file,
          (progress, speed) => {
            setUploadingQueue((prev) =>
              prev.map((item) =>
                item.id === uploadId ? { ...item, progress, speed } : item
              )
            );
          }
        );

        setFiles((prev) => [newUploadedFile, ...prev]);
        showToast(`Successfully uploaded "${file.name}"!`, 'success');

        setUploadingQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, progress: 100, speed: 'Done', status: 'completed' as const }
              : item
          )
        );

        setTimeout(() => {
          setUploadingQueue((prev) => prev.filter((item) => item.id !== uploadId));
        }, 3000);

      } catch (err: any) {
        console.error('Upload failed for file:', file.name, err);
        
        setUploadingQueue((prev) =>
          prev.map((item) =>
            item.id === uploadId
              ? { ...item, speed: 'Failed', status: 'failed' as const }
              : item
          )
        );

        showToast(`Failed to upload file "${file.name}": ${err.response?.data?.message || err.message}`, 'error');

        setTimeout(() => {
          setUploadingQueue((prev) => prev.filter((item) => item.id !== uploadId));
        }, 5000);
      }
    });
  };

  // Delete file from Node.js backend using uploadService
  const handleDeleteFile = (fileToDelete: R2File) => {
    if (!fileToDelete.id) return;
    setModalConfig({
      isOpen: true,
      title: 'Delete Storage Object',
      message: `Are you sure you want to permanently delete "${fileToDelete.key}" from Cloudflare R2? This action cannot be undone.`,
      confirmText: 'Delete File',
      cancelText: 'Keep File',
      onConfirm: async () => {
        try {
          await uploadService.deleteFile(fileToDelete.id!);
          setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
          setSelectedFileIds((prev) => prev.filter((id) => id !== fileToDelete.id));
          showToast(`Deleted file "${fileToDelete.key}" successfully!`, 'success');
        } catch (err: any) {
          console.error('Failed to delete file:', err);
          showToast(`Failed to delete file: ${err.response?.data?.message || err.message}`, 'error');
        }
      }
    });
  };

  // Selection toggle handlers
  const handleToggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleToggleSelectAll = () => {
    const allFilteredIds = paginatedFiles.map((f) => f.id).filter(Boolean) as string[];
    const allSelected = allFilteredIds.every((id) => selectedFileIds.includes(id));
    
    if (allSelected) {
      setSelectedFileIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedFileIds((prev) => {
        const unique = new Set([...prev, ...allFilteredIds]);
        return Array.from(unique);
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedFileIds([]);
    setIsSelectionMode(false);
  };

  const handleBulkDelete = () => {
    if (selectedFileIds.length === 0) return;
    setModalConfig({
      isOpen: true,
      title: 'Bulk Delete Objects',
      message: `Are you sure you want to permanently delete the ${selectedFileIds.length} selected files from R2 and the database? This action is irreversible.`,
      confirmText: `Delete ${selectedFileIds.length} Files`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await uploadService.bulkDeleteFiles(selectedFileIds);
          setFiles((prev) => prev.filter((f) => !f.id || !selectedFileIds.includes(f.id)));
          showToast(`Successfully deleted ${selectedFileIds.length} files in bulk!`, 'success');
          setSelectedFileIds([]);
          setIsSelectionMode(false);
        } catch (err: any) {
          console.error('Bulk deletion failed:', err);
          showToast(`Bulk deletion failed: ${err.response?.data?.message || err.message}`, 'error');
        }
      }
    });
  };

  const handleCopySelectedLinks = () => {
    // Preserve selection order by mapping over selectedFileIds
    const selectedUrls = selectedFileIds
      .map((id) => files.find((f) => f.id === id)?.url)
      .filter(Boolean); // Remove any undefined in case file not found

    const jsonString = JSON.stringify(selectedUrls, null, 2);
    navigator.clipboard.writeText(jsonString)
      .then(() => showToast(`Copied ${selectedUrls.length} links to clipboard!`, 'success'))
      .catch((err) => {
        console.error('Failed to copy', err);
        showToast('Failed to copy to clipboard', 'error');
      });
  };

  // Categorization Logic
  const getFileCategory = (filename: string | undefined | null, mime: string | undefined | null): string => {
    const name = filename || '';
    const mimeType = mime || '';
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'images';
    if (
      ['mp4', 'webm', 'ogg', 'mov', 'mp3', 'wav', 'aac'].includes(ext) || 
      mimeType.startsWith('video/') || 
      mimeType.startsWith('audio/')
    ) {
      return 'media';
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md'].includes(ext)) return 'docs';
    if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) return 'archives';
    return 'other';
  };

  const filteredFiles = files.filter((file) => {
    if (!file) return false;
    const fileKey = file.key || '';
    
    // Search filter
    const matchesSearch = fileKey.toLowerCase().includes((searchQuery || '').toLowerCase());
    
    // Category filter
    if (activeCategory === 'all') return matchesSearch;
    const cat = getFileCategory(fileKey, file.contentType);
    return matchesSearch && cat === activeCategory;
  });

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeCategory]);

  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);
  const paginatedFiles = filteredFiles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="dashboard-grid container">
      {/* Left Column: settings */}
      <div className="left-panel">
        {/* Backend Info Widget */}
        <div className="glass-panel stats-widget">
          <div className="widget-header">
            <Layers size={16} className="orange-text" />
            <h4>Service Configuration</h4>
          </div>
          <div className="storage-meter-wrapper" style={{ marginTop: '10px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' }}>
              All Cloudflare R2 Credentials and Database properties are securely managed on the Node.js backend.
            </p>
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '10px', marginTop: '10px', fontFamily: 'monospace', fontSize: '11px', color: '#f97316' }}>
              uploads_backend/.env
            </div>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '8px', lineHeight: '1.4' }}>
              * To change buckets, modify the environment variables inside your backend folder and restart the server.
            </p>
          </div>
        </div>

        {/* Storage Quick Summary Widget */}
        <div className="glass-panel stats-widget mt-20">
          <div className="widget-header">
            <Layers size={16} className="orange-text" />
            <h4>Storage Summary</h4>
          </div>
          <div className="storage-meter-wrapper">
            <div className="storage-meta">
              <span>R2 Free Tier Usage</span>
              <span className="percent-label">
                {Math.round((files.reduce((acc, f) => acc + f.size, 0) / 10737418240) * 1000) / 10}%
              </span>
            </div>
            <div className="storage-bar">
              <div 
                className="storage-bar-progress"
                style={{ width: `${Math.min(100, (files.reduce((acc, f) => acc + f.size, 0) / 10737418240) * 100)}%` }}
              ></div>
            </div>
            <div className="storage-limits">
              <span>{files.length} active files</span>
              <span>10 GB Max (Free)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: main manager hub */}
      <div className="main-content-panel">
        {/* Connection Notice banner */}
        {isConnected ? (
          <div className="glass-panel alert-banner connected-banner" style={{ background: 'rgba(20, 184, 166, 0.05)', borderColor: 'rgba(20, 184, 166, 0.2)' }}>
            <AlertCircle className="alert-icon" size={18} style={{ color: 'var(--accent-teal)' }} />
            <div className="alert-body">
              <h5 style={{ color: 'var(--accent-teal)' }}>Connected to Live Backend</h5>
              <p>Your portal is successfully connected to the Node.js R2 backend. Files are stored and retrieved in real-time!</p>
            </div>
          </div>
        ) : (
          <div className="glass-panel alert-banner">
            <AlertCircle className="alert-icon" size={18} />
            <div className="alert-body">
              <h5>Backend Server Disconnected</h5>
              <p>Make sure the Node.js backend is running on same port on proxy to synchronize live uploads and DB records.</p>
            </div>
          </div>
        )}

        {/* Drag and Drop Zone */}
        <div 
          className={`glass-panel dropzone ${isDragActive ? 'active' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            multiple 
            className="hidden-file-input" 
            ref={fileInputRef}
            onChange={handleFileSelect}
          />
          <div className="dropzone-body">
            <div className="upload-icon-pulse">
              <UploadCloud size={32} className="cloud-upload-icon" />
            </div>
            <h3>Drag & Drop files here</h3>
            <p>Or click to browse from local computer</p>
            <span className="file-restrictions">Supports images, videos, logs, zip and code files</span>
          </div>
        </div>

        {/* Uploading Queue Display */}
        {uploadingQueue.length > 0 && (
          <div className="glass-panel queue-panel mt-20">
            <div className="queue-header">
              <div className="queue-title">
                <Flame size={16} className="orange-text-glow animation-pulse" />
                <h4>Uploading Tasks ({uploadingQueue.length})</h4>
              </div>
            </div>

            <div className="queue-list">
              {uploadingQueue.map((item) => (
                <div key={item.id} className="queue-item">
                  <div className="queue-item-meta">
                    <span className="queue-item-name" title={item.name}>{item.name}</span>
                    <span className="queue-item-speed">{item.speed}</span>
                  </div>
                  <div className="queue-progress-row">
                    <div className="queue-bar-bg">
                      <div 
                        className={`queue-bar-fill ${item.status === 'completed' ? 'completed-fill' : ''}`}
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                    <span className="queue-item-pct">{item.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters and File Search Bar */}
        <div className="glass-panel control-hub-panel mt-20">
          <div className="filters-row">
            <div className="category-group">
              <button 
                className={`category-btn ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                All
              </button>
              <button 
                className={`category-btn ${activeCategory === 'images' ? 'active' : ''}`}
                onClick={() => setActiveCategory('images')}
              >
                Images
              </button>
              <button 
                className={`category-btn ${activeCategory === 'media' ? 'active' : ''}`}
                onClick={() => setActiveCategory('media')}
              >
                Media
              </button>
              <button 
                className={`category-btn ${activeCategory === 'docs' ? 'active' : ''}`}
                onClick={() => setActiveCategory('docs')}
              >
                Docs
              </button>
            </div>

            <div className="search-box-wrapper">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                placeholder="Search storage keys..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </div>

        {/* Selection Hub Controls when active */}
        <div className="glass-panel selection-hub-bar mt-20">
          <div className="selection-left">
            <button 
              className={`category-btn select-trigger-btn ${isSelectionMode ? 'active' : ''}`}
              onClick={() => {
                if (isSelectionMode) {
                  handleClearSelection();
                } else {
                  setIsSelectionMode(true);
                }
              }}
            >
              <span>{isSelectionMode ? 'Cancel Selection' : 'Select Files'}</span>
            </button>
            
            {isSelectionMode && (
              <>
                <button 
                  className="category-btn select-all-btn"
                  onClick={handleToggleSelectAll}
                >
                  Select All / None
                </button>
                <span className="selection-count-text">
                  Selected: <strong className="highlight-orange">{selectedFileIds.length}</strong> files
                </span>
              </>
            )}
          </div>

          {isSelectionMode && selectedFileIds.length > 0 && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="category-btn active"
                style={{ background: 'var(--accent-orange)', color: '#fff', fontWeight: 'bold', border: 'none' }}
                onClick={handleCopySelectedLinks}
              >
                Copy {selectedFileIds.length} Links
              </button>
              <button 
                className="category-btn active bulk-delete-btn"
                onClick={handleBulkDelete}
              >
                Delete Selected ({selectedFileIds.length})
              </button>
            </div>
          )}
        </div>

        {/* File Cards Grid */}
        <div className="file-grid-container mt-20">
          {paginatedFiles.length > 0 ? (
            <div className="file-grid">
              {paginatedFiles.map((file) => {
                const selIndex = file.id ? selectedFileIds.indexOf(file.id) : -1;
                return (
                  <FileCard 
                    key={file.key} 
                    file={file} 
                    onDelete={handleDeleteFile}
                    onReplace={async (oldFile, newFile) => {
                      if (!oldFile.id) return;
                      
                      const uploadId = Math.random().toString(36).substring(7);
                      const newQueueItem: UploadingQueueItem = {
                        id: uploadId,
                        name: newFile.name,
                        size: newFile.size,
                        progress: 0,
                        speed: 'Connecting...',
                        status: 'uploading',
                      };
                
                      setUploadingQueue((prev) => [newQueueItem, ...prev]);
                
                      try {
                        const replacedFile = await uploadService.replaceFile(
                          oldFile.id,
                          newFile,
                          (progress, speed) => {
                            setUploadingQueue((prev) =>
                              prev.map((item) =>
                                item.id === uploadId ? { ...item, progress, speed } : item
                              )
                            );
                          }
                        );
                
                        setFiles((prev) => prev.map((f) => (f.id === oldFile.id ? replacedFile : f)));
                        showToast(`Successfully replaced "${oldFile.key}"!`, 'success');
                
                        setUploadingQueue((prev) =>
                          prev.map((item) =>
                            item.id === uploadId
                              ? { ...item, progress: 100, speed: 'Done', status: 'completed' as const }
                              : item
                          )
                        );
                
                        setTimeout(() => {
                          setUploadingQueue((prev) => prev.filter((item) => item.id !== uploadId));
                        }, 3000);
                      } catch (err: any) {
                        console.error('Replacement failed:', err);
                        setUploadingQueue((prev) =>
                          prev.map((item) =>
                            item.id === uploadId
                              ? { ...item, speed: 'Failed', status: 'failed' as const }
                              : item
                          )
                        );
                        showToast(`Failed to replace file: ${err.response?.data?.message || err.message}`, 'error');
                
                        setTimeout(() => {
                          setUploadingQueue((prev) => prev.filter((item) => item.id !== uploadId));
                        }, 5000);
                      }
                    }}
                    isSelected={selIndex !== -1}
                    selectionIndex={selIndex !== -1 ? selIndex + 1 : null}
                    onSelectToggle={() => file.id && handleToggleSelectFile(file.id)}
                    isSelectionMode={isSelectionMode}
                  />
                );
              })}
            </div>
          ) : (
            <div className="glass-panel empty-state">
              <Plus size={36} className="empty-state-icon" />
              <h3>No matching files found</h3>
              <p>Drag files inside the box above or adjust filters to view items.</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-container mt-20">
            <button 
              className="category-btn pagination-btn" 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <div className="pagination-info">
              Page <span className="highlight-orange">{currentPage}</span> of {totalPages}
            </div>
            <button 
              className="category-btn pagination-btn" 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Custom Glassmorphic Confirmation Modal */}
      <ConfirmModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        message={modalConfig.message}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        onConfirm={() => {
          modalConfig.onConfirm();
          setModalConfig((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setModalConfig((prev) => ({ ...prev, isOpen: false }))}
      />

    </div>
  );
};
