const vision = require('@google-cloud/vision');
const path = require('path');

class OCRService {
    constructor() {
        // Initialize Vision client with secure credentials
        this.client = new vision.ImageAnnotatorClient({
            keyFilename: path.resolve(__dirname, '..', '..', process.env.GOOGLE_APPLICATION_CREDENTIALS)
        });
    }

    /**
     * Extract text from an image buffer
     * @param {Buffer} imageBuffer - Image buffer to process
     * @returns {Promise<Object>} Extracted text and detection details
     */
    async extractTextFromImage(imageBuffer) {
        try {
            // Perform OCR
            const [result] = await this.client.textDetection({
                image: { content: imageBuffer },
                imageContext: {
                    languageHints: ['en-US']
                }
            });

            // Extract text annotations
            const detections = result.textAnnotations;
            
            // Handle no text found scenario
            if (!detections || detections.length === 0) {
                return { 
                    success: false, 
                    error: 'No text could be detected in the image' 
                };
            }

            // The first detection contains the full text
            const fullTextDetection = detections[0].description;

            return {
                success: true,
                fullText: fullTextDetection,
                detailedAnnotations: detections.slice(1) // Exclude the full text annotation
            };
        } catch (error) {
            console.error('OCR Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Extract price from detected text
     * @param {string} text - Extracted text
     * @returns {number|null} Extracted price
     */
    extractPriceFromText(text) {
        // Look for price patterns
        const priceRegex = /(?:\£|\$)?(\d+(?:\.\d{1,2})?)\s*p?/;
        const match = text.match(priceRegex);
        return match ? parseFloat(match[1]) : null;
    }

    /**
     * Extract product details from detected text
     * @param {string} text - Extracted text
     * @returns {Object} Extracted product details
     */
    extractProductDetails(text) {
        // Split text into lines
        const lines = text.split('\n');
        
        // Try to extract product name (typically first line)
        const productNameMatch = lines[0].match(/(.+)/);
        
        // Try to extract brand (could be more sophisticated)
        const brandMatch = text.match(/(?:brand|make)\s*:?\s*(.+)/i);

        return {
            name: productNameMatch ? productNameMatch[1].trim() : 'Unknown Product',
            brand: brandMatch ? brandMatch[1].trim() : 'Unknown Brand',
            rawText: text
        };
    }

    /**
     * Comprehensive text analysis
     * @param {Buffer} imageBuffer - Image buffer to analyze
     * @returns {Promise<Object>} Comprehensive analysis result
     */
    async analyzeImage(imageBuffer) {
        try {
            // Extract text
            const textResult = await this.extractTextFromImage(imageBuffer);
            
            if (!textResult.success) {
                return textResult;
            }

            // Extract price and product details
            const price = this.extractPriceFromText(textResult.fullText);
            const productDetails = this.extractProductDetails(textResult.fullText);

            return {
                success: true,
                price,
                ...productDetails,
                fullText: textResult.fullText
            };
        } catch (error) {
            console.error('Image Analysis Error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = OCRService;