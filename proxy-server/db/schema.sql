-- First drop existing tables (in correct order due to foreign key constraints)
DROP TABLE IF EXISTS shopping_items;
DROP TABLE IF EXISTS shopping_sessions;
DROP TABLE IF EXISTS price_tags;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories_level2;
DROP TABLE IF EXISTS categories_level1;
DROP TABLE IF EXISTS stores;
DROP TABLE IF EXISTS households;

-- Create tables in order (parents first)
CREATE TABLE households (
    household_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stores (
    store_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    chain VARCHAR(255),
    location VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories_level1 (
    cat1_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories_level2 (
    cat2_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cat1_id UUID REFERENCES categories_level1(cat1_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(cat1_id, name)
);

CREATE TABLE products (
    product_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    cat2_id UUID REFERENCES categories_level2(cat2_id),
    size DECIMAL,
    measurement_unit VARCHAR(50),
    yuka_score INTEGER CHECK (yuka_score >= 0 AND yuka_score <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(barcode)
);

CREATE TABLE price_tags (
    tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES products(product_id),
    store_id UUID REFERENCES stores(store_id),
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    promotion_details TEXT,
    capture_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image_url TEXT
);

CREATE TABLE shopping_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID REFERENCES households(household_id),
    store_id UUID REFERENCES stores(store_id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'in_progress',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE shopping_items (
    item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES shopping_sessions(session_id),
    product_id UUID REFERENCES products(product_id),
    quantity DECIMAL(10,3),
    price_at_time DECIMAL(10,2),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at triggers for relevant tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_modtime
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_households_modtime
    BEFORE UPDATE ON households
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stores_modtime
    BEFORE UPDATE ON stores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();