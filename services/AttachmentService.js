const { Readable } = require('stream');
const mongoose = require('mongoose');
const { getGridFSBucket } = require('../config/gridfsConfig');

class AttachmentService {
  constructor(model, bucketName = 'documents') {
    this.model = model;
    this.bucketName = bucketName;
  }

  async upload(file, metadata = {}) {
    const gfsBucket = getGridFSBucket(this. bucketName);
    
    if (metadata.replaceExisting && metadata.userId && metadata.documentType) {
      await this._deleteExisting(metadata.userId, metadata. documentType);
    }
    
    const filename = this._generateFilename(metadata, file.originalname);
    
    const uploadStream = gfsBucket.openUploadStream(filename, {
      metadata: {
        originalName: file.originalname,
        uploadedBy: metadata.userId,
        uploadedAt: new Date(),
        documentType: metadata.documentType,
        mimeType: file.mimetype,
        ... metadata
      }
    });
    
    const readableStream = new Readable();
    readableStream.push(file.buffer);
    readableStream.push(null);
    
    const gridFSFileId = await new Promise((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on('error', (error) => {
          console.error('GridFS upload error:', error);
          reject(error);
        })
        .on('finish', () => resolve(uploadStream.id));
    });
    
    const document = new this.model({
      userId: metadata.userId,
      documentType: metadata.documentType,
      originalFileName: file.originalname,
      gridFSFileId:  gridFSFileId,
      fileSize: file.size,
      mimeType: file.mimetype,
      remarks: metadata.remarks || '',
      status: metadata.status || 'PENDING'
    });
    
    await document.save();
    return document;
  }

  async uploadFromStream(fileData, metadata = {}) {
    const gfsBucket = getGridFSBucket(this.bucketName);
    
    if (metadata.replaceExisting && metadata. userId && metadata.documentType) {
      await this._deleteExisting(metadata.userId, metadata. documentType);
    }
    
    const filename = this._generateFilename(metadata, fileData.filename);
    
    const uploadStream = gfsBucket.openUploadStream(filename, {
      metadata: {
        originalName:  fileData.filename,
        uploadedBy: metadata.userId,
        uploadedAt: new Date(),
        documentType: metadata. documentType,
        ... metadata
      }
    });
    
    const readableStream = this._createReadableStream(fileData);
    
    const gridFSFileId = await new Promise((resolve, reject) => {
      readableStream.pipe(uploadStream)
        .on('error', reject)
        .on('finish', () => resolve(uploadStream.id));
    });
    
    const document = new this.model({
      userId: metadata.userId,
      documentType: metadata.documentType,
      originalFileName: fileData.filename,
      gridFSFileId: gridFSFileId,
      fileSize: fileData.size || 0,
      mimeType: fileData.mimetype || 'application/octet-stream',
      remarks: metadata.remarks || '',
      status: metadata.status || 'PENDING'
    });
    
    await document.save();
    return document;
  }

  async download(documentId) {
    const document = await this.getById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    const fileExists = await this._checkFileExists(document.gridFSFileId);
    
    if (!fileExists) {
      throw new Error('File not found in GridFS');
    }
    
    const gfsBucket = getGridFSBucket(this.bucketName);
    const downloadStream = gfsBucket.openDownloadStream(document. gridFSFileId);
    
    return {
      stream: downloadStream,
      metadata: {
        filename: document.originalFileName,
        mimeType: document.mimeType,
        fileSize: document.fileSize
      }
    };
  }

  async stream(documentId) {
    const document = await this.getById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    const fileExists = await this._checkFileExists(document.gridFSFileId);
    
    if (!fileExists) {
      throw new Error('File not found in GridFS');
    }
    
    const gfsBucket = getGridFSBucket(this.bucketName);
    return gfsBucket.openDownloadStream(document.gridFSFileId);
  }

  async getById(documentId) {
    if (!mongoose.Types.ObjectId. isValid(documentId)) {
      throw new Error('Invalid document ID');
    }
    
    return await this.model.findById(documentId).lean();
  }

  async getAll(filters = {}, options = {}) {
    const {
      populate = 'userId',
      sort = { createdAt: -1 },
      limit = null,
      skip = 0
    } = options;
    
    let query = this.model.find(filters);
    
    if (populate) {
      query = query.populate(populate);
    }
    
    query = query.sort(sort).skip(skip);
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return await query.lean();
  }

  async delete(documentId) {
    const document = await this.getById(documentId);
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    const gfsBucket = getGridFSBucket(this.bucketName);
    
    try {
      await gfsBucket.delete(document.gridFSFileId);
    } catch (error) {
      console.error('Error deleting GridFS file:', error. message);
    }
    
    await this.model.findByIdAndDelete(documentId);
    return true;
  }

  async updateMetadata(documentId, updates) {
    const document = await this.model.findByIdAndUpdate(
      documentId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    return document;
  }

  
  async _deleteExisting(userId, documentType) {
    const gfsBucket = getGridFSBucket(this.bucketName);
    
    const existingDoc = await this.model.findOne({
      userId: userId,
      documentType: documentType
    });
    
    if (existingDoc) {
      try {
        await gfsBucket.delete(existingDoc.gridFSFileId);
      } catch (error) {
        console.error('Error deleting old file:', error.message);
      }
      await this.model.findByIdAndDelete(existingDoc._id);
    }
  }

  _generateFilename(metadata, originalName = '') {
    const timestamp = Date.now();
    const userId = metadata.userId || 'anonymous';
    const docType = metadata.documentType || 'file';
    const ext = originalName ?  originalName.substring(originalName.lastIndexOf('. ')) : '';
    return `${userId}_${docType}_${timestamp}${ext}`;
  }

  _createReadableStream(fileData) {
    if (fileData.stream) {
      return fileData.stream;
    }
    
    if (fileData.buffer) {
      const readableStream = new Readable();
      readableStream.push(fileData.buffer);
      readableStream.push(null);
      return readableStream;
    }
    
    throw new Error('Invalid file data:  must contain buffer or stream');
  }

  async _checkFileExists(gridFSFileId) {
    const gfsBucket = getGridFSBucket(this.bucketName);
    const files = await gfsBucket.find({ _id: gridFSFileId }).toArray();
    return files.length > 0;
  }
}

module.exports = AttachmentService;