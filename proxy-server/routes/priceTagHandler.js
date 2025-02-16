const express = require('express');
const router = express.Router();
const ImageUploadService = require('../services/shopping/imageUploadService');
const OCRService = require('../services/shopping/ocrService');
const path = require('fs');

router.post('/ocr', async (req, res) => {
    console.log('Start OCR process');
    console.log('First step: upload and save image');
    try {
        const { imageBase64, storeId } = req.body;
        
        // Upload image
        const uploadResult = await ImageUploadService.uploadImage(imageBase64, storeId);

        // Prepare image for OCR
        // const imageBuffer = fs.readFileSync(
        //     path.join(__dirname, '..', uploadResult.imageUrl)
        // );

        // Perform OCR
        // const ocrService = new OCRService();
        // const ocrResult = await ocrService.analyzeImage(imageBuffer);

        console.log('uploadResult ::', uploadResult.success);

        res.json({
            upload: uploadResult,
            // ocr: ocrResult
        });

    } catch (error) {
        console.error('Price Tag OCR Error:', error);
        res.status(500).json({ 
            error: 'Failed to process price tag', 
            details: error.message 
        });
    }
});

module.exports = router;