import type { ProductCard, ProductCategory } from "./product-types";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  status: "published" | "draft";
  productCategories: ProductCategory[];
  publishedAt?: string;
  updatedAt?: string;
  image?: { url: string; alt: string };
};

// These four guides were already public on /blog. Their content is shared by
// the journal and detail routes in BlogGuideContent; this is not a second CMS.
// TODO(owner): Supply original publication and content-revision dates. Git/build
// dates are not publication dates, so dates remain omitted until confirmed.
const blogPosts: BlogPost[] = [
  {
    slug: "everyday-shoe-cleaning",
    title: "Don't Let Dirt Settle In",
    description: "Keep dirt from settling into your shoes with simple daily care. Shoe Doctor shares brushing, spot-cleaning and drying tips for everyday sneaker maintenance.",
    category: "Everyday care",
    readTime: "3 minute read",
    status: "published",
    productCategories: ["quick_clean"],
  },
  {
    slug: "shoe-travel-and-storage",
    title: "Wherever You Go, Protect the Pair",
    description: "Protect your shoes while travelling and storing them at home. Learn when to use shoe covers and bags, and why sneakers should be completely dry before storage.",
    category: "Travel and storage",
    readTime: "3 minute read",
    status: "published",
    productCategories: ["storage", "protection"],
  },
  {
    slug: "suede-shoe-care",
    title: "Suede Has Different Rules",
    description: "Learn why suede needs gentle, material-specific care. Shoe Doctor explains dry-stain cleaning, suede erasers and when to seek professional help in Hetauda.",
    category: "Doctor's note",
    readTime: "2 minute read",
    status: "published",
    productCategories: ["suede_nubuck"],
  },
  {
    slug: "at-home-sneaker-cleaning",
    title: "Build a Simple At-Home Sneaker-Cleaning Routine",
    description: "Follow Shoe Doctor's at-home sneaker-cleaning routine using foam, suitable brushes and a microfiber towel, with material checks and careful drying at each step.",
    category: "At-home routine",
    readTime: "5 minute read",
    status: "published",
    productCategories: ["cleaning_kits"],
  },
];

export function listPublishedBlogPosts() {
  return blogPosts.filter((post) => post.status === "published" && post.slug.trim());
}

export function getPublishedBlogPost(slug: string) {
  return listPublishedBlogPosts().find((post) => post.slug === slug) ?? null;
}

export function recommendedBlogProduct(post: BlogPost | null, products: ProductCard[]) {
  if (!post) return null;
  for (const category of post.productCategories) {
    const product = products.find((product) => product.category === category
      && product.badge === "doctors_pick" && product.stockQuantity !== 0);
    if (product) return product;
  }
  return null;
}
