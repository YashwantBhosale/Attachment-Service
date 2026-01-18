const express = require('express');
const { createUploadMiddleware, handleMulterError } = require('../config/multerConfig');
const documentController = require('../controllers/documentController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const upload = createUploadMiddleware('documents');

router.post('/upload', authenticate, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err) {
            return handleMulterError(err, req, res, next);
        }
        next();
    });
}, documentController.uploadDocument);

router.get('/my-documents', authenticate, documentController.getUserDocuments);
router.get('/download/:documentId', authenticate, documentController.downloadDocument);
router.get('/stream/:documentId', authenticate, documentController.streamDocument);
router.delete('/:documentId', authenticate, documentController.deleteDocument);
router.patch('/:documentId/status', authenticate, documentController.updateStatus);

module.exports = router;
