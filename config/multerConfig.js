/*
This code configures multer for file uploads with memory storage
Files are temporarily buffered in memory, then we manually upload to GridFS
*/

const multer = require("multer");
const { getBucketConfig } = require('./bucketConfig');

/**
 * Create multer upload middleware with memory storage for a specific bucket
 * @param {String} bucketKey - Bucket configuration key
 * @param {Object} customLimits - Optional custom limits
 * @returns {Multer} Configured multer instance
 */
const createUploadMiddleware = (bucketKey = "documents", customLimits = {}) => {
  const bucketConfig = getBucketConfig(bucketKey);
  
  return multer({
    storage: multer.memoryStorage(), // Files buffered in memory
    limits: {
      fileSize: customLimits.fileSize || bucketConfig.maxFileSize,
      files: customLimits.files || 1
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = customLimits.allowedMimeTypes || bucketConfig.allowedMimeTypes;
      
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(
          new Error(
            `Invalid file type.  Allowed types: ${allowedTypes. join(', ')}`
          ),
          false
        );
      }
      cb(null, true);
    },
  });
};

/**
 * Handle multer errors with proper responses
 */
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case "LIMIT_FILE_SIZE": 
        return res.status(400).json({
          success: false,
          message: "File size too large.  Check the maximum allowed size for this upload type.",
        });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          message: "Unexpected field name or too many files.",
        });
      default:
        return res.status(400).json({
          success: false,
          message: "File upload error:  " + error.message,
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  next();
};

module.exports = {
  createUploadMiddleware,
  handleMulterError,
};