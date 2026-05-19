import axios from 'axios';
import type { R2File } from '../types';

// Central axios instance with baseURL targeting Vite proxy
const api = axios.create({
  baseURL: '/api',
});

export const uploadService = {
  /**
   * Check connection and fetch active R2 bucket name from backend env
   */
  getHealth: async (): Promise<{ isHealthy: boolean; bucketName: string }> => {
    try {
      const response = await api.get('/health');
      return {
        isHealthy: response.data?.status === 'ok',
        bucketName: response.data?.bucketName || 'R2 Bucket',
      };
    } catch (err) {
      console.error('Backend connection check failed:', err);
      return { isHealthy: false, bucketName: 'offline' };
    }
  },

  /**
   * Fetch uploaded files list and map them to frontend R2File[] interface
   */
  getFiles: async (): Promise<R2File[]> => {
    const response = await api.get('/uploads');
    const backendFiles = response.data?.data || [];
    return backendFiles.map((item: any) => ({
      id: item.id,
      key: item.originalName,
      size: item.size,
      lastModified: new Date(item.createdAt),
      contentType: item.mimeType,
      url: item.publicUrl,
    }));
  },

  /**
   * Upload single file with progress tracking and speed calculations
   * @param file The file object to upload
   * @param onProgress Callback function reporting progress percent (0-100) and speed string (e.g. "2.4 MB/s")
   */
  uploadFile: async (
    file: File,
    onProgress: (progress: number, speed: string) => void
  ): Promise<R2File> => {
    const formData = new FormData();
    formData.append('file', file);

    const startTime = Date.now();

    const response = await api.post('/uploads/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          
          // Calculate upload speed dynamically
          const elapsedTime = (Date.now() - startTime) / 1000; // seconds
          let speed = '0 KB/s';
          if (elapsedTime > 0) {
            const bytesPerSecond = progressEvent.loaded / elapsedTime;
            if (bytesPerSecond > 1024 * 1024) {
              speed = `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
            } else {
              speed = `${(bytesPerSecond / 1024).toFixed(0)} KB/s`;
            }
          }
          
          onProgress(progress, speed);
        }
      },
    });

    const uploadedRecord = response.data?.data?.[0];
    if (!uploadedRecord) {
      throw new Error('No upload data returned from backend');
    }

    return {
      id: uploadedRecord.id,
      key: uploadedRecord.originalName,
      size: uploadedRecord.size,
      lastModified: new Date(uploadedRecord.createdAt),
      contentType: uploadedRecord.mimeType,
      url: uploadedRecord.publicUrl,
    };
  },

  /**
   * Delete uploaded file by ID
   */
  deleteFile: async (id: string): Promise<void> => {
    await api.delete(`/uploads/${id}`);
  },

  /**
   * Delete multiple files in bulk by their IDs
   */
  bulkDeleteFiles: async (ids: string[]): Promise<void> => {
    await api.post('/uploads/bulk-delete', { ids });
  },
};
