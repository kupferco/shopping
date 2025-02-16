const express = require('express');
const router = express.Router();
const ImageUploadService = require('../services/shopping/imageUploadService');
const OCRService = require('../services/shopping/ocrService');
const fs = require('fs');
const path = require('path');

const HARDCODED_DEV = true;

router.post('/ocr', async (req, res) => {
    console.log('Start OCR process');
    console.log('First step: upload and save image');
    try {
        const { imageBase64, storeId } = req.body;

        // Convert base64 to buffer directly
        let loadedImage = Buffer.from(
            imageBase64.includes(',')
                ? imageBase64.split(',')[1]
                : imageBase64,
            'base64'
        );

        let uploadResult = {};
        if (HARDCODED_DEV) {
            // Use local static image for OCR
            const imagePath = path.resolve(__dirname, '..', 'uploads', 'price_tag_1739703168965.jpg');
            uploadResult = {
                success: 'image not uploaded or written to DB',
                imageUrl: imagePath
            }
            console.log('Local image Path:', imagePath); // Log the path to verify

            // Check if file exists before reading
            if (!fs.existsSync(imagePath)) {
                return res.status(404).json({
                    error: 'Image file not found',
                    path: imagePath
                });
            }

            // Read the image file as a buffer
            loadedImage = fs.readFileSync(imagePath);

        }

        // Create OCR service instance
        const ocrService = new OCRService();
        // Perform OCR analysis
        const ocrResult = await ocrService.analyzeImage(loadedImage);

        // Optional: Upload image if needed
        if (!HARDCODED_DEV) {
            uploadResult = await ImageUploadService.uploadImage(imageBase64, storeId);
            console.log('uploadResult ::', uploadResult.success);
        }

        res.json({
            success: true,
            ocrResult: ocrResult,
            uploadResult: uploadResult
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