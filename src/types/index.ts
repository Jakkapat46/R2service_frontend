export interface R2File {
  id?: string;
  key: string;
  size: number;
  lastModified: Date;
  contentType: string;
  url: string;
}

export interface UploadingQueueItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  speed: string;
  status: 'uploading' | 'completed' | 'failed';
}

export interface HeaderProps {
  bucketName: string;
  isConnected: boolean;
  totalFiles: number;
  totalSize: string;
}

export interface FooterProps {
  isConnected: boolean;
}

