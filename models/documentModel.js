const mongoose = require('mongoose');

const documentTypes = [
  'PROFILE_PHOTO',
  'ID_PROOF',
  'ADDRESS_PROOF',
  'CERTIFICATE',
  'CONTRACT',
  'INVOICE',
  'OTHER'
];

const documentStatuses = [
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'MODIFICATION_REQUESTED'
];

const documentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types. ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  documentType: {
    type: String,
    enum: documentTypes,
    required:  true,
    index: true
  },
  originalFileName: {
    type: String,
    required:  true,
    trim: true
  },
  gridFSFileId: {
    type: mongoose.Schema.Types. ObjectId,
    required: true,
    unique: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  remarks: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: documentStatuses,
    default: 'PENDING'
  }
}, {
  timestamps: true
});

documentSchema.index({ userId: 1, documentType: 1 });
documentSchema.index({ status: 1, createdAt: -1 });

const Document = mongoose.model('Document', documentSchema);

module.exports = { Document, documentTypes, documentStatuses };