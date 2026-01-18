const documentService = require('../services/DocumentService');

class DocumentController {
  
  async uploadDocument(req, res) {
    try {
      const { documentType, remarks } = req.body;
      const userId = req. user.id;
      const file = req.file;
      
      if (! file) {
        return res. status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      const document = await documentService.uploadDocument(
        file,
        userId,
        documentType,
        remarks
      );
      
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  async downloadDocument(req, res) {
    try {
      const { documentId } = req.params;
      
      const { stream, metadata } = await documentService.download(documentId);
      
      res.set({
        'Content-Type': metadata.mimeType,
        'Content-Disposition': `attachment; filename="${metadata.filename}"`,
        'Content-Length': metadata.fileSize
      });
      
      stream.pipe(res);
      
    } catch (error) {
      console.error('Download error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
  
  async streamDocument(req, res) {
    try {
      const { documentId } = req.params;
      
      const document = await documentService.getById(documentId);
      
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }
      
      const stream = await documentService.stream(documentId);
      
      res.set({
        'Content-Type': document.mimeType,
        'Content-Length': document.fileSize
      });
      
      stream.pipe(res);
      
    } catch (error) {
      console.error('Stream error:', error);
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  }
  
  async getUserDocuments(req, res) {
    try {
      const userId = req.user.id;
      const { documentType } = req.query;
      
      const documents = await documentService.getUserDocuments(userId, documentType);
      
      res.json({
        success: true,
        data: documents
      });
      
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  async deleteDocument(req, res) {
    try {
      const { documentId } = req.params;
      
      await documentService.delete(documentId);
      
      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
      
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
  
  async updateStatus(req, res) {
    try {
      const { documentId } = req.params;
      const { status } = req.body;
      
      const document = await documentService.updateStatus(documentId, status);
      
      res.json({
        success: true,
        message: 'Status updated successfully',
        data: document
      });
      
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DocumentController();