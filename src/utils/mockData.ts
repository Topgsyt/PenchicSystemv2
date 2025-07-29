interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stockQuantity: number;
  lowStockThreshold?: number;
  image?: string;
}

export const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Premium Dairy Feed',
    description: 'High-quality dairy feed formulated for optimal milk production',
    price: 2500,
    category: 'Dairy',
    stockQuantity: 150,
    lowStockThreshold: 20,
    image: 'https://images.pexels.com/photos/162801/cows-dairy-cows-milk-feed-162801.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: '2',
    name: 'Layer Mash',
    description: 'Complete feed for laying hens to maximize egg production',
    price: 1800,
    category: 'Poultry',
    stockQuantity: 200,
    lowStockThreshold: 30,
    image: 'https://images.pexels.com/photos/2255459/pexels-photo-2255459.jpeg?auto=compress&cs=tinysrgb&w=800'
  },
  {
    id: '3',
    name: 'Pig Grower Feed',
    description: 'Balanced nutrition for growing pigs',
    price: 2200,
    category: 'Swine',
    stockQuantity: 100,
    lowStockThreshold: 15,
    image: 'https://images.pexels.com/photos/195226/pexels-photo-195226.jpeg?auto=compress&cs=tinysrgb&w=800'
  }
];