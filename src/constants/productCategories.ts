// Standardized product categories for ecommerce
// Categories are stored as lowercase slugs in the database
// Display names are human-readable

export interface CategoryGroup {
  groupName: string;
  categories: Category[];
}

export interface Category {
  slug: string; // Stored in database (lowercase, hyphenated)
  displayName: string; // Displayed to users
}

export const PRODUCT_CATEGORIES: CategoryGroup[] = [
  {
    groupName: 'Beauty & Personal Care',
    categories: [
      { slug: 'skincare', displayName: 'Skincare' },
      { slug: 'makeup', displayName: 'Makeup' },
      { slug: 'hair-care', displayName: 'Hair Care' },
      { slug: 'body-care', displayName: 'Body Care' },
      { slug: 'fragrance', displayName: 'Fragrance' },
      { slug: 'beauty-tools', displayName: 'Beauty Tools' },
    ],
  },
  {
    groupName: 'Fashion & Apparel',
    categories: [
      { slug: 'men-clothing', displayName: "Men's Clothing" },
      { slug: 'women-clothing', displayName: "Women's Clothing" },
      { slug: 'kids-clothing', displayName: "Kid's Clothing" },
      { slug: 'footwear', displayName: 'Footwear' },
      { slug: 'bags-accessories', displayName: 'Bags & Accessories' },
      { slug: 'jewelry-watches', displayName: 'Jewelry & Watches' },
    ],
  },
  {
    groupName: 'Electronics & Gadgets',
    categories: [
      { slug: 'mobile-phones', displayName: 'Mobile Phones' },
      { slug: 'laptops', displayName: 'Laptops' },
      { slug: 'tablets', displayName: 'Tablets' },
      { slug: 'audio-devices', displayName: 'Audio Devices' },
      { slug: 'cameras', displayName: 'Cameras' },
      { slug: 'smart-home-devices', displayName: 'Smart Home Devices' },
      { slug: 'accessories', displayName: 'Accessories' },
    ],
  },
  {
    groupName: 'Home & Living',
    categories: [
      { slug: 'furniture', displayName: 'Furniture' },
      { slug: 'home-decor', displayName: 'Home Decor' },
      { slug: 'kitchenware', displayName: 'Kitchenware' },
      { slug: 'cleaning-supplies', displayName: 'Cleaning Supplies' },
      { slug: 'bedding-bath', displayName: 'Bedding & Bath' },
    ],
  },
  {
    groupName: 'Groceries & Food',
    categories: [
      { slug: 'packaged-food', displayName: 'Packaged Food' },
      { slug: 'beverages', displayName: 'Beverages' },
      { slug: 'fresh-produce', displayName: 'Fresh Produce' },
      { slug: 'snacks-confectionery', displayName: 'Snacks & Confectionery' },
      { slug: 'health-supplements', displayName: 'Health Supplements' },
    ],
  },
  {
    groupName: 'Baby & Kids',
    categories: [
      { slug: 'baby-clothing', displayName: 'Baby Clothing' },
      { slug: 'diapers-baby-care', displayName: 'Diapers & Baby Care' },
      { slug: 'toys-learning', displayName: 'Toys & Learning' },
      { slug: 'baby-gear', displayName: 'Baby Gear' },
    ],
  },
  {
    groupName: 'Sports & Outdoors',
    categories: [
      { slug: 'fitness-equipment', displayName: 'Fitness Equipment' },
      { slug: 'sportswear', displayName: 'Sportswear' },
      { slug: 'outdoor-gear', displayName: 'Outdoor Gear' },
      { slug: 'bicycles-accessories', displayName: 'Bicycles & Accessories' },
    ],
  },
  {
    groupName: 'Automotive',
    categories: [
      { slug: 'car-accessories', displayName: 'Car Accessories' },
      { slug: 'motorbike-accessories', displayName: 'Motorbike Accessories' },
      { slug: 'oils-lubricants', displayName: 'Oils & Lubricants' },
      { slug: 'car-care-products', displayName: 'Car Care Products' },
    ],
  },
  {
    groupName: 'Pet Supplies',
    categories: [
      { slug: 'pet-food', displayName: 'Pet Food' },
      { slug: 'pet-accessories', displayName: 'Pet Accessories' },
      { slug: 'pet-grooming', displayName: 'Pet Grooming' },
      { slug: 'pet-toys', displayName: 'Pet Toys' },
    ],
  },
  {
    groupName: 'Books & Stationery',
    categories: [
      { slug: 'books', displayName: 'Books' },
      { slug: 'office-supplies', displayName: 'Office Supplies' },
      { slug: 'art-materials', displayName: 'Art Materials' },
      { slug: 'school-supplies', displayName: 'School Supplies' },
    ],
  },
  {
    groupName: 'Health & Medical',
    categories: [
      { slug: 'health-devices', displayName: 'Health Devices' },
      { slug: 'personal-protection-equipment', displayName: 'Personal Protection Equipment' },
      { slug: 'vitamins-supplements', displayName: 'Vitamins & Supplements' },
      { slug: 'first-aid-medical', displayName: 'First Aid & Medical' },
    ],
  },
  {
    groupName: 'Appliances',
    categories: [
      { slug: 'kitchen-appliances', displayName: 'Kitchen Appliances' },
      { slug: 'home-appliances', displayName: 'Home Appliances' },
      { slug: 'air-conditioners', displayName: 'Air Conditioners' },
      { slug: 'vacuum-cleaners', displayName: 'Vacuum Cleaners' },
    ],
  },
  {
    groupName: 'Entertainment & Hobbies',
    categories: [
      { slug: 'gaming-consoles', displayName: 'Gaming Consoles' },
      { slug: 'board-games', displayName: 'Board Games' },
      { slug: 'musical-instruments', displayName: 'Musical Instruments' },
      { slug: 'collectibles', displayName: 'Collectibles' },
    ],
  },
];

// Flatten all categories for easier lookup
export const ALL_CATEGORIES: Category[] = PRODUCT_CATEGORIES.flatMap(
  group => group.categories
);

// Map slug to display name (case-insensitive for backward compatibility)
export const getCategoryDisplayName = (slug: string): string => {
  if (!slug) return slug;
  // Try exact match first
  let category = ALL_CATEGORIES.find(cat => cat.slug === slug);
  // If not found, try case-insensitive match
  if (!category) {
    category = ALL_CATEGORIES.find(cat => cat.slug.toLowerCase() === slug.toLowerCase());
  }
  // Fallback to formatted slug if not found (backward compatibility)
  return category?.displayName || slug.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// Get all category slugs
export const getAllCategorySlugs = (): string[] => {
  return ALL_CATEGORIES.map(cat => cat.slug);
};

