-- Price Tracker Test Data Insertion Script
-- Use this script to populate your database with sample data for testing

-- Clear existing data (optional, uncomment if you want to reset tables)
-- TRUNCATE TABLE shopping_items, shopping_sessions, price_tags, products, categories_level2, categories_level1, stores, households CASCADE;

-- Insert test data for households
INSERT INTO households (name, email) VALUES 
('Smith Family', 'smith.family@example.com'),
('Johnson Household', 'johnsons@example.com');

-- Insert test stores
INSERT INTO stores (name, chain, location) VALUES 
('Downtown Grocery', 'FreshMart', '123 Main St'),
('Westside Supermarket', 'SuperSave', '456 West Blvd'),
('Corner Market', 'LocalMart', '789 Elm Street');

-- Insert first-level categories
INSERT INTO categories_level1 (name, description) VALUES 
('Groceries', 'Food and kitchen items'),
('Beverages', 'Drinks and liquid refreshments'),
('Household Supplies', 'Cleaning and home care products');

-- Insert second-level categories
INSERT INTO categories_level2 (cat1_id, name, description) VALUES 
((SELECT cat1_id FROM categories_level1 WHERE name = 'Groceries'), 'Dairy', 'Milk, cheese, and other dairy products'),
((SELECT cat1_id FROM categories_level1 WHERE name = 'Groceries'), 'Produce', 'Fresh fruits and vegetables'),
((SELECT cat1_id FROM categories_level1 WHERE name = 'Beverages'), 'Soft Drinks', 'Carbonated and non-carbonated drinks'),
((SELECT cat1_id FROM categories_level1 WHERE name = 'Household Supplies'), 'Cleaning Supplies', 'Detergents and cleaners');

-- Insert products
INSERT INTO products (name, brand, barcode, cat2_id, size, measurement_unit, yuka_score) VALUES 
('Whole Milk', 'FarmFresh', '123456789', 
    (SELECT cat2_id FROM categories_level2 WHERE name = 'Dairy'), 
    1, 'gallon', 85),
('Organic Apples', 'OrchardBest', '987654321', 
    (SELECT cat2_id FROM categories_level2 WHERE name = 'Produce'), 
    3, 'lb', 92),
('Cola Soda', 'SweetDrinks', '246813579', 
    (SELECT cat2_id FROM categories_level2 WHERE name = 'Soft Drinks'), 
    2, 'liter', 35),
('All-Purpose Cleaner', 'SparkleClean', '135792468', 
    (SELECT cat2_id FROM categories_level2 WHERE name = 'Cleaning Supplies'), 
    32, 'oz', 75);

-- Insert price tags (linking products to stores with prices)
INSERT INTO price_tags (product_id, store_id, price, original_price, promotion_details) VALUES 
((SELECT product_id FROM products WHERE name = 'Whole Milk'), 
 (SELECT store_id FROM stores WHERE name = 'Downtown Grocery'), 
 3.99, 4.49, 'Weekend special'),
((SELECT product_id FROM products WHERE name = 'Whole Milk'), 
 (SELECT store_id FROM stores WHERE name = 'Westside Supermarket'), 
 4.29, 4.29, NULL),
((SELECT product_id FROM products WHERE name = 'Organic Apples'), 
 (SELECT store_id FROM stores WHERE name = 'Downtown Grocery'), 
 4.99, 5.99, 'Buy 2 get 1 free'),
((SELECT product_id FROM products WHERE name = 'Cola Soda'), 
 (SELECT store_id FROM stores WHERE name = 'Westside Supermarket'), 
 2.49, 2.99, '20% off');

-- Insert a shopping session
INSERT INTO shopping_sessions (household_id, store_id, total_amount, status, notes) VALUES 
((SELECT household_id FROM households WHERE name = 'Smith Family'), 
 (SELECT store_id FROM stores WHERE name = 'Downtown Grocery'), 
 25.47, 'completed', 'Weekly grocery shopping');

-- Insert shopping items for the session
INSERT INTO shopping_items (session_id, product_id, quantity, price_at_time) VALUES 
((SELECT session_id FROM shopping_sessions WHERE notes = 'Weekly grocery shopping'), 
 (SELECT product_id FROM products WHERE name = 'Whole Milk'), 
 1, 3.99),
((SELECT session_id FROM shopping_sessions WHERE notes = 'Weekly grocery shopping'), 
 (SELECT product_id FROM products WHERE name = 'Organic Apples'), 
 2, 4.99);

-- Additional notes:
-- 1. I've added a commented out TRUNCATE command if you want to reset tables
-- 2. The script uses subqueries to ensure referential integrity
-- 3. Modify as needed to fit your specific testing requirements