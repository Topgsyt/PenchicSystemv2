/*
  # Add Sample Products

  1. Changes
    - Add initial set of farm products
    - Include various categories and stock levels
    
  2. Data
    - Animal feeds
    - Farm supplies
    - Seeds and fertilizers
*/

-- Insert sample products
INSERT INTO products (name, description, price, category, stock, image_url) VALUES
(
  'Premium Dairy Feed',
  'High-quality dairy cattle feed with optimal protein and mineral content for maximum milk production.',
  2500.00,
  'animal_feed',
  100,
  'https://images.unsplash.com/photo-1615811361523-6bd03d7748e7?auto=format&fit=crop&q=80&w=1200'
),
(
  'Layer Mash',
  'Balanced poultry feed specially formulated for laying hens to improve egg production.',
  1800.00,
  'animal_feed',
  150,
  'https://images.unsplash.com/photo-1569597967185-cd6120712154?auto=format&fit=crop&q=80&w=1200'
),
(
  'Organic Fertilizer',
  'Natural, chemical-free fertilizer perfect for all types of crops. Improves soil health.',
  1200.00,
  'fertilizer',
  75,
  'https://images.unsplash.com/photo-1589928964725-6a548ce84587?auto=format&fit=crop&q=80&w=1200'
),
(
  'Maize Seeds',
  'High-yield hybrid maize seeds suitable for various climatic conditions.',
  500.00,
  'seeds',
  200,
  'https://images.unsplash.com/photo-1628456637902-d2b4e4d36d36?auto=format&fit=crop&q=80&w=1200'
),
(
  'Garden Tools Set',
  'Complete set of essential gardening tools including spade, fork, and trowel.',
  3500.00,
  'equipment',
  25,
  'https://images.unsplash.com/photo-1617576683096-00fc8eecb3aa?auto=format&fit=crop&q=80&w=1200'
),
(
  'Pig Feed',
  'Nutritionally complete feed for growing pigs with optimal protein levels.',
  2200.00,
  'animal_feed',
  80,
  'https://images.unsplash.com/photo-1583595366117-6c62d9678593?auto=format&fit=crop&q=80&w=1200'
),
(
  'NPK Fertilizer',
  'Balanced NPK fertilizer for healthy plant growth and improved yields.',
  1500.00,
  'fertilizer',
  120,
  'https://images.unsplash.com/photo-1592978392216-907b05866792?auto=format&fit=crop&q=80&w=1200'
),
(
  'Vegetable Seeds Mix',
  'Assorted vegetable seeds including tomatoes, carrots, and kale.',
  300.00,
  'seeds',
  150,
  'https://images.unsplash.com/photo-1628196237219-9d0ab2aaf691?auto=format&fit=crop&q=80&w=1200'
),
(
  'Chicken Feed',
  'Balanced feed for broiler chickens optimized for growth and health.',
  1600.00,
  'animal_feed',
  3,
  'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=1200'
),
(
  'Fish Feed',
  'High-protein fish feed for tilapia and catfish.',
  2000.00,
  'animal_feed',
  90,
  'https://images.unsplash.com/photo-1544731894-2e69f0a4d8cf?auto=format&fit=crop&q=80&w=1200'
);