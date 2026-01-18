const AttachmentService = require('./AttachmentService');
const { Document } = require('../models/documentModel');

class DocumentService extends AttachmentService {
  constructor() {
    super(Document, 'documents');
  }

  async uploadDocument(file, userId, documentType, remarks = '') {
    return await this.upload(file, {
      userId,
      documentType,
      remarks,
      replaceExisting: true,
      status: 'PENDING'
    });
  }

  async getUserDocuments(userId, documentType = null) {
    const filters = { userId };
    
    if (documentType) {
      filters.documentType = documentType;
    }
    
    const documents = await this.getAll(filters, {
      populate: 'userId',
      sort: { createdAt: -1 }
    });
    
    return documents. map(doc => ({
      _id: doc._id,
      documentType: doc.documentType,
      originalFileName: doc.originalFileName,
      fileSize: doc. fileSize,
      mimeType: doc.mimeType,
      status: doc.status,
      remarks: doc.remarks,
      uploadedAt: doc.createdAt,
      downloadUrl: `/api/documents/download/${doc._id}`,
      streamUrl: `/api/documents/stream/${doc._id}`,
      user: doc.userId
    }));
  }

  async updateStatus(documentId, status) {
    const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED', 'MODIFICATION_REQUESTED'];
    
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status');
    }

    return await this.updateMetadata(documentId, { status });
  }
}

module.exports = new DocumentService();