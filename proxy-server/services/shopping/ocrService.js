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
                    languageHints: ['en-US', 'en-GB']  // Added GB English
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
     * Extract price from detected text with confidence level
     * @param {string} text - Extracted text
     * @returns {Object} Price and confidence information
     */
    extractPriceFromText(text) {
        const result = {
            price: null,
            confidence: 0,
            matches: []
        };

        // Common price patterns from most to least confident
        const pricePatterns = [
            {
                pattern: /(?:£|\$|€)\s*\d+\.\d{2}\b/,  // £10.99, $10.99
                confidence: 0.9,
                converter: (match) => parseFloat(match.replace(/[^0-9.]/g, ''))
            },
            {
                pattern: /\b\d+\.\d{2}\s*(?:£|\$|€)/,  // 10.99£, 10.99$
                confidence: 0.85,
                converter: (match) => parseFloat(match.replace(/[^0-9.]/g, ''))
            },
            {
                pattern: /\b\d+p\b/,                    // 99p
                confidence: 0.8,
                converter: (match) => parseFloat(match.replace(/[^0-9]/g, '')) / 100
            },
            {
                pattern: /\b\d+\s*pence\b/,            // 99 pence
                confidence: 0.8,
                converter: (match) => parseFloat(match.replace(/[^0-9]/g, '')) / 100
            },
            {
                pattern: /\b\d+\.\d{2}\b/,             // just 10.99
                confidence: 0.7,
                converter: (match) => parseFloat(match)
            },
            {
                pattern: /\b\d+(?:\.|\,)\d{2}\b/,      // European format
                confidence: 0.6,
                converter: (match) => parseFloat(match.replace(',', '.'))
            }
        ];

        // Find all price-like patterns in the text
        for (const {pattern, confidence, converter} of pricePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                const price = converter(matches[0]);
                result.matches.push({
                    price,
                    confidence,
                    pattern: pattern.toString(),
                    originalMatch: matches[0]
                });

                // Keep the highest confidence match
                if (confidence > result.confidence) {
                    result.price = price;
                    result.confidence = confidence;
                }
            }
        }

        return result;
    }

    /**
     * Normalize units to standard format
     * @param {string} unit - Raw unit from text
     * @returns {string} Standardized unit
     */
    normalizeUnit(unit) {
        unit = unit.toLowerCase();
        switch(unit) {
            case 'g': return 'kg';
            case '100g': return 'kg';  // We'll convert all to kg
            case 'l':
            case 'ltr':
            case 'litre': return 'L';
            case 'ml':
            case '100ml': return 'L';  // We'll convert all to L
            case 'sht':
            case 'sheet': return 'unit';
            case 'ea':
            case 'each':
            case 'unit': return 'unit';
            default: return unit;
        }
    }

    /**
     * Convert price to standard unit (kg or L)
     * @param {number} price - Price value
     * @param {string} unit - Unit from text
     * @returns {Object} Normalized price and unit
     */
    normalizePrice(price, unit) {
        unit = unit.toLowerCase();
        switch(unit) {
            case 'g': return { price: price * 1000, unit: 'kg' };
            case '100g': return { price: price * 10, unit: 'kg' };  // Convert price/100g to price/kg
            case 'ml': return { price: price * 1000, unit: 'L' };
            case '100ml': return { price: price * 10, unit: 'L' };  // Convert price/100ml to price/L
            case 'sheet':
            case 'sht':
            case 'unit':
            case 'ea':
            case 'each': return { price, unit: 'unit' };
            default: return { price, unit: this.normalizeUnit(unit) };
        }
    }

    /**
     * Extract product details including quantity and unit pricing
     * @param {string} text - Extracted text
     * @returns {Object} Product details with confidence levels
     */
    extractProductDetails(text) {
        const result = {
            name: null,
            brand: null,
            quantity: null,
            unit: null,
            pricePerUnit: null,
            confidence: {
                name: 0,
                brand: 0,
                quantity: 0,
                unit: 0,
                pricePerUnit: 0
            },
            matches: []
        };

        // First check for store brands at the start of text
        const storeBrandMatch = text.match(/^(Sainsbury's|Tesco|Asda|Aldi|Lidl|Morrisons|Waitrose)/i);
        if (storeBrandMatch) {
            result.brand = storeBrandMatch[1];
            result.confidence.brand = 0.9;
        }

        // Extract brand and name
        const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
        if (lines.length > 0) {
            result.name = lines[0];
            result.confidence.name = 0.7;
        }
        
        // If no store brand found, look for other brand indicators
        if (!result.brand) {
            const brandIndicators = text.match(/(?:by|brand|from)\s+([A-Za-z0-9'\s]+)/i);
            if (brandIndicators) {
                result.brand = brandIndicators[1].trim();
                result.confidence.brand = 0.8;
            }
        }

        // Quantity and unit patterns
        const quantityPatterns = [
            {
                // e.g., 500g, 1kg, 2L, 100ml
                pattern: /(\d+(?:\.\d+)?)\s*(g|kg|ml|l|ltr|litre|sheets?)\b/i,
                confidence: 0.9,
                normalizer: (value, unit) => {
                    unit = unit.toLowerCase();
                    switch(unit) {
                        case 'kg': return { value, unit: 'kg' };
                        case 'g': return { value: value/1000, unit: 'kg' };
                        case 'l':
                        case 'ltr':
                        case 'litre': return { value, unit: 'L' };
                        case 'ml': return { value: value/1000, unit: 'L' };
                        case 'sheet':
                        case 'sheets': return { value, unit: 'unit' };
                        default: return { value, unit };
                    }
                }
            },
            {
                // e.g., 6 x 330ml
                pattern: /(\d+)\s*x\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|l|ltr|litre|sheets?)\b/i,
                confidence: 0.85,
                normalizer: (count, value, unit) => {
                    const normalized = quantityPatterns[0].normalizer(value, unit);
                    return { 
                        value: count * normalized.value, 
                        unit: normalized.unit 
                    };
                }
            },
            {
                // e.g., pack of 6
                pattern: /pack\s+of\s+(\d+)/i,
                confidence: 0.7,
                normalizer: (value) => ({ value, unit: 'units' })
            }
        ];

        // Per unit pricing patterns
        const perUnitPatterns = [
            {
                // Standard price/unit format
                pattern: /(?:\()?(?:(?:£|\$|€)\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)p?)\s*\/\s*(kg|100g|g|l(?:tr|itre)?|100ml|ml|sht?|sheet|ea|each|unit)(?:\))?/i,
                confidence: 0.9,
                parser: (match) => {
                    const rawPrice = match[1] ? parseFloat(match[1]) : parseFloat(match[2])/100;
                    const rawUnit = match[3];
                    const normalized = this.normalizePrice(rawPrice, rawUnit);
                    return {
                        original: match[0],
                        normalizedPrice: normalized.price,
                        normalizedUnit: normalized.unit,
                        rawPrice,
                        rawUnit
                    };
                }
            },
            {
                // "price per unit" format
                pattern: /(\d+p)\s+per\s+(unit|each)\b/i,
                confidence: 0.95,
                parser: (match) => {
                    const rawPrice = parseFloat(match[1].replace('p', ''))/100;
                    const rawUnit = match[2];
                    return {
                        original: match[0],
                        normalizedPrice: rawPrice,
                        normalizedUnit: 'unit',
                        rawPrice,
                        rawUnit
                    };
                }
            }
        ];

        // Extract quantity and units
        for (const {pattern, confidence, normalizer} of quantityPatterns) {
            const match = text.match(pattern);
            if (match) {
                let normalized;
                if (match.length === 3) {
                    normalized = normalizer(parseFloat(match[1]), match[2]);
                } else if (match.length === 4) {
                    normalized = normalizer(
                        parseFloat(match[1]), 
                        parseFloat(match[2]), 
                        match[3]
                    );
                }

                result.matches.push({
                    type: 'quantity',
                    original: match[0],
                    normalized,
                    confidence
                });

                if (confidence > result.confidence.quantity) {
                    result.quantity = normalized.value;
                    result.unit = normalized.unit;
                    result.confidence.quantity = confidence;
                }
            }
        }

        // If we see "per unit" or "each", set quantity to 1 unit
        if (text.match(/\b(per unit|each)\b/i) && !result.quantity) {
            result.quantity = 1;
            result.unit = 'unit';
            result.confidence.quantity = 0.9;
        }

        // Extract per unit pricing
        for (const {pattern, confidence, parser} of perUnitPatterns) {
            const match = text.match(pattern);
            if (match) {
                const parsed = parser(match);
                
                result.matches.push({
                    type: 'pricePerUnit',
                    ...parsed,
                    confidence
                });

                if (confidence > result.confidence.pricePerUnit) {
                    result.pricePerUnit = {
                        price: parsed.normalizedPrice,
                        unit: parsed.normalizedUnit,
                        original: parsed.original
                    };
                    result.confidence.pricePerUnit = confidence;
                }
            }
        }

        return result;
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

            // Extract date if present (e.g., expiry date)
            const dateMatch = textResult.fullText.match(/\d{2}\/\d{2}\/\d{4}/);
            const date = dateMatch ? dateMatch[0] : null;

            return {
                success: true,
                price,
                ...productDetails,
                date,
                fullText: textResult.fullText,
                needsUserReview: 
                    price.confidence < 0.8 || 
                    productDetails.confidence.name < 0.7 ||
                    productDetails.confidence.quantity < 0.8 ||
                    !productDetails.pricePerUnit // Need review if no price per unit found
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