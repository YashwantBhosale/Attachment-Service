/*
Configuration for different GridFS buckets
Define buckets and their settings here
*/

const bucketConfigs = {
  documents: {
    bucketName: 'documents',
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ],
    maxFileSize: 10 * 1024 * 1024, // 10MB
    description: 'User documents and certificates'
  },
  
  invoices: {
    bucketName: 'invoices',
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    description: 'Invoice and billing documents'
  },
  
  profilePhotos: {
    bucketName: 'profile_photos',
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/jpg',
    ],
    maxFileSize: 2 * 1024 * 1024, // 2MB
    description: 'User profile photos'
  },
  
  contracts: {
    bucketName:  'contracts',
    allowedMimeTypes: [
      'application/pdf',
    ],
    maxFileSize: 20 * 1024 * 1024, // 20MB
    description: 'Legal contracts and agreements'
  },
  
  reports: {
    bucketName:  'reports',
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxFileSize: 15 * 1024 * 1024, // 15MB
    description: 'System generated reports'
  },
  
  attachments: {
    bucketName: 'attachments',
    allowedMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/zip',
      'application/x-zip-compressed',
    ],
    maxFileSize: 25 * 1024 * 1024, // 25MB
    description: 'General attachments'
  }
};

/**
 * Get bucket configuration
 * @param {String} bucketKey - Bucket configuration key
 * @returns {Object} Bucket configuration
 */
const getBucketConfig = (bucketKey) => {
  const config = bucketConfigs[bucketKey];
  if (!config) {
    throw new Error(`Bucket configuration '${bucketKey}' not found`);
  }
  return config;
};

/**
 * Get all bucket names for initialization
 * @returns {Array<String>} Array of bucket names
 */
const getAllBucketNames = () => {
  return Object.values(bucketConfigs).map(config => config.bucketName);
};

/**
 * Get bucket configuration by bucket name
 * @param {String} bucketName - Actual bucket name
 * @returns {Object|null} Bucket configuration or null
 */
const getBucketConfigByName = (bucketName) => {
  return Object.values(bucketConfigs).find(config => config.bucketName === bucketName) || null;
};

module.exports = {
  bucketConfigs,
  getBucketConfig,
  getAllBucketNames,
  getBucketConfigByName,
};