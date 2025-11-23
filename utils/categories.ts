// Categories data from categories.json
// Dynamically load categories to avoid large bundle size

export interface Category {
  id: string;
  name: string;
  coins: string[];
}

let categoriesCache: Category[] | null = null;

export async function loadCategories(): Promise<Category[]> {
  if (categoriesCache) {
    return categoriesCache;
  }
  
  try {
    const response = await fetch('/categories.json');
    if (!response.ok) {
      throw new Error('Failed to load categories');
    }
    const data = await response.json() as Category[];
    categoriesCache = data;
    return data;
  } catch (error) {
    console.error('[Categories] Failed to load categories:', error);
    return [];
  }
}

// For synchronous access (use after loadCategories is called)
export function getCategories(): Category[] {
  return categoriesCache || [];
}
