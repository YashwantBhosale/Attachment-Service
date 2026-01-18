/*
This module initializes and exports GridFSBucket instances for MongoDB file storage. 
Supports multiple buckets for different types of attachments.
*/

const { GridFSBucket } = require("mongodb");
const mongoose = require("mongoose");

let gfsBuckets = {};

/**
 * Initialize a GridFS bucket
 * @param {String} bucketName - Name of the bucket
 * @returns {Promise<GridFSBucket>} Initialized bucket
 */
const initializeGridFS = (bucketName = "documents") => {
  return new Promise((resolve, reject) => {
    if (mongoose.connection.readyState === 1) {
      /* Connection is already open */
      if (! gfsBuckets[bucketName]) {
        gfsBuckets[bucketName] = new GridFSBucket(mongoose.connection.db, {
          bucketName: bucketName,
        });
        console.log(`GridFS bucket '${bucketName}' initialized`);
      }
      resolve(gfsBuckets[bucketName]);
    } else {
      /* Wait for connection to open */
      mongoose.connection.once("open", () => {
        if (!gfsBuckets[bucketName]) {
          gfsBuckets[bucketName] = new GridFSBucket(mongoose.connection.db, {
            bucketName:  bucketName,
          });
          console.log(`GridFS bucket '${bucketName}' initialized`);
        }
        resolve(gfsBuckets[bucketName]);
      });

      mongoose.connection.on("error", (error) => {
        reject(error);
      });
    }
  });
};

/**
 * Initialize multiple GridFS buckets
 * @param {Array<String>} bucketNames - Array of bucket names
 * @returns {Promise<Array>} Array of initialized buckets
 */
const initializeMultipleBuckets = async (bucketNames = ["documents"]) => {
  const promises = bucketNames.map(name => initializeGridFS(name));
  return await Promise.all(promises);
};

/**
 * Get a GridFS bucket instance
 * @param {String} bucketName - Name of the bucket
 * @returns {GridFSBucket} Bucket instance
 */
const getGridFSBucket = (bucketName = "documents") => {
  if (!gfsBuckets[bucketName]) {
    throw new Error(
      `GridFSBucket '${bucketName}' is not initialized. Call initializeGridFS first.`
    );
  }
  return gfsBuckets[bucketName];
};

/**
 * Get all initialized buckets
 * @returns {Object} All bucket instances
 */
const getAllBuckets = () => {
  return gfsBuckets;
};

/**
 * Check if a bucket is initialized
 * @param {String} bucketName - Name of the bucket
 * @returns {Boolean}
 */
const isBucketInitialized = (bucketName) => {
  return !!gfsBuckets[bucketName];
};

module.exports = {
  initializeGridFS,
  initializeMultipleBuckets,
  getGridFSBucket,
  getAllBuckets,
  isBucketInitialized,
};