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

        // Upload image
        let uploadResult;
        let loadedImage;
        if (!HARDCODED_DEV) {
            uploadResult = await ImageUploadService.uploadImage(imageBase64, storeId);
            console.log('uploadResult ::', uploadResult.success);

            // get image
            console.log(uploadResult.imageUrl)
            loadedImage = fs.readFileSync(
                path.join(__dirname, '..', uploadResult.imageUrl)
            );
        } else {
            uploadResult = {
                success: 55
            }

            // Prepare image for OCR
            const imagePath = path.resolve(__dirname, '..', 'uploads', 'price_tag_1739703168965.jpg');
            uploadResult.imageUrl = imagePath;

            console.log('Image Path:', imagePath); // Log the path to verify

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

        res.json({
            success: true,
            imagePath: uploadResult.imageUrl,
            ocrResult: ocrResult
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