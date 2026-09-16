import type { Product } from "@/lib/product-types";
import { productStructuredData } from "@/lib/seo";
import StructuredData from "./StructuredData";

export default function ProductStructuredData({ product }: { product: Product }) {
  const data = productStructuredData(product);
  return data ? <StructuredData data={data} /> : null;
}
