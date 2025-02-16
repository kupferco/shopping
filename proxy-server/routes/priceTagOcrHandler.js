const fs = require('fs');
const path = require('path');
const vision = require('@google-cloud/vision');
const db = require('../db');

// Initialize Vision client with secure credentials
const client = new vision.ImageAnnotatorClient({
    keyFilename: path.resolve(__dirname, '..', process.env.GOOGLE_APPLICATION_CREDENTIALS)
});

// Utility functions for text extraction
function extractProductDetails(text) {
    // Placeholder implementation - you'll want to replace with your actual logic
    const nameMatch = text.match(/(?:product|item)\s*:?\s*(.+)/i);
    const brandMatch = text.match(/(?:brand|make)\s*:?\s*(.+)/i);

    return {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown Product',
        brand: brandMatch ? brandMatch[1].trim() : 'Unknown Brand'
    };
}

function extractPriceFromText(text) {
    // Placeholder implementation - you'll want to replace with your actual logic
    const priceMatch = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
    return priceMatch ? parseFloat(priceMatch[1]) : null;
}

exports.handlePriceTagOCR = async (req, res) => {
    try {
        const { imageBase64, storeId } = req.body;
        
        // Validate input
        if (!imageBase64) {
            return res.status(400).json({ error: 'No image provided' });
        }

        const imageBuffer = Buffer.from(imageBase64, 'base64');

        // Generate a unique filename
        const filename = `price_tag_${Date.now()}.jpg`;
        const uploadPath = path.join(__dirname, '..', 'uploads', filename);

        // Ensure uploads directory exists
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)){
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Save image to file system
        fs.writeFileSync(uploadPath, imageBuffer);

        // Perform OCR 
        const [result] = await client.textDetection({
            image: { content: imageBuffer },
            imageContext: {
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

        // Extract initial details
        const price = extractPriceFromText(fullTextDetection);
        const productDetails = extractProductDetails(fullTextDetection);

        // Prepare context for Gemini to enhance product details
        const geminiContext = {
            originalText: fullTextDetection,
            initialProductName: productDetails.name,
            initialProductBrand: productDetails.brand,
            initialPrice: price
        };

        // TODO: Integrate Gemini API to enhance product details
        // This is a placeholder for where you'll call your Gemini service
        const enhancedProductDetails = await enhanceProductDetailsWithGemini(geminiContext);

        // Existing product lookup and creation logic
        const existingProductQuery = await db.query(
            `SELECT product_id, name, brand, barcode 
             FROM products 
             WHERE LOWER(name) = LOWER($1) 
             OR LOWER(brand) = LOWER($2)`,
            [enhancedProductDetails.name, enhancedProductDetails.brand]
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
                [enhancedProductDetails.name, enhancedProductDetails.brand]
            );
            productId = newProductResult.rows[0].product_id;
        }

        // Insert price tag with image path
        const priceTagResult = await db.query(
            `INSERT INTO price_tags 
            (product_id, store_id, price, image_url) 
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [productId, storeId, price, `/uploads/${filename}`]
        );

        res.json({
            success: true,
            action: existingProductQuery.rows.length > 0 ? 'updated' : 'created',
            productName: enhancedProductDetails.name,
            brand: enhancedProductDetails.brand,
            price: price,
            imageUrl: `/uploads/${filename}`,
            originalText: fullTextDetection
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

// Placeholder function for Gemini enhancement
async function enhanceProductDetailsWithGemini(context) {
    // TODO: Implement actual Gemini API call
    return {
        name: context.initialProductName,
        brand: context.initialProductBrand,
        // Add more enhanced details as needed
    };
}

exports.setupPriceTagRoutes = (app) => {
    app.post('/api/price-tag/ocr', exports.handlePriceTagOCR);
};