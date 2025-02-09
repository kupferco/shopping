require('dotenv').config();
const vision = require('@google-cloud/vision');
const db = require('../db');
const path = require('path');

// Initialize Vision client with secure credentials
const client = new vision.ImageAnnotatorClient({
    keyFilename: path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS)
});

// Utility functions for text extraction (keep previous implementation)
function extractProductDetails(text) {
    // ... (previous implementation remains the same)
}

function extractPriceFromText(text) {
    // ... (previous implementation remains the same)
}

exports.handlePriceTagOCR = async (req, res) => {
    try {
        const { imageBase64, storeId } = req.body;
        
        // Validate input
        if (!imageBase64) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const imageBuffer = Buffer.from(imageBase64, 'base64');

        // Perform OCR with enhanced request
        const [result] = await client.textDetection({
            image: { content: imageBuffer },
            imageContext: {
                // Optional: Add language hints or specific region hints
                languageHints: ['en-US']
            }
        });

        // Extract text annotations
        const detections = result.textAnnotations;
        
        // Handle no text found scenario
        if (!detections || detections.length === 0) {
            return res.status(400).json({ 
                error: 'No text could be detected in the image' 
            });
        }

        const fullTextDetection = detections[0].description;

        // Extract price and product details
        const price = extractPriceFromText(fullTextDetection);
        const productDetails = extractProductDetails(fullTextDetection);

        // Logging for debugging
        console.log('Extracted Details:', {
            price,
            productName: productDetails.name,
            brand: productDetails.brand
        });

        // Existing product lookup and creation logic
        const existingProductQuery = await db.query(
            `SELECT product_id, name, brand, barcode 
             FROM products 
             WHERE LOWER(name) = LOWER($1) 
             OR LOWER(brand) = LOWER($2)`,
            [productDetails.name, productDetails.brand]
        );

        let productId;
        if (existingProductQuery.rows.length > 0) {
            // Product exists - use existing product
            const existingProduct = existingProductQuery.rows[0];
            productId = existingProduct.product_id;
        } else {
            // Create new product
            const newProductResult = await db.query(
                `INSERT INTO products 
                 (name, brand, cat2_id) 
                 VALUES (
                     $1, 
                     $2, 
                     (SELECT cat2_id FROM categories_level2 LIMIT 1)
                 ) 
                 RETURNING product_id`,
                [productDetails.name, productDetails.brand]
            );
            productId = newProductResult.rows[0].product_id;
        }

        // Insert price tag
        await db.query(
            `INSERT INTO price_tags 
            (product_id, store_id, price, image_url) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT DO NOTHING`,
            [productId, storeId, price, imageBase64.slice(0, 255)]
        );

        res.json({
            success: true,
            action: existingProductQuery.rows.length > 0 ? 'updated' : 'created',
            productName: productDetails.name,
            brand: productDetails.brand,
            price: price
        });
    } catch (error) {
        console.error('Detailed OCR Error:', error);
        res.status(500).json({ 
            error: 'Failed to process price tag', 
            details: error.message,
            stack: error.stack
        });
    }
};

exports.setupPriceTagRoutes = (app) => {
    app.post('/api/price-tag/ocr', exports.handlePriceTagOCR);
};