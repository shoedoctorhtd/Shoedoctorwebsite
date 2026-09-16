/* eslint-disable @next/next/no-html-link-for-pages */
import ProductRecommendation from "./ProductRecommendation";
import type { ProductCard } from "@/lib/product-types";

// The existing journal and the article routes render this same content.
export default function BlogGuideContent({ slug, product }: { slug: string; product: ProductCard | null }) {
  switch (slug) {
    case "everyday-shoe-cleaning": return (<>
<div className="sd-article-body">
            <p>
              Dust looks harmless, but repeated wear pushes it deeper into
              fabric, stitching and colour. Brush away loose dirt regularly
              and use a shoe wipe when a fresh mark appears.
            </p>
            <p>
              When your pair needs more than a quick wipe, reach for a proper
              sneaker-cleaning kit. Cleaning foam, two brushes and a microfiber
              towel give you the right tools for the upper, sole and finishing
              wipe&mdash;without soaking the shoe.
            </p>
            <ul>
              <li>Clean fresh marks immediately.</li>
              <li>Use separate brushes for uppers and soles.</li>
              <li>Test products on a hidden area first.</li>
              <li>Let every pair dry naturally in shade.</li>
            </ul>
            <p>Small cleanups keep big stains away.</p>
            <ProductRecommendation
              explanation="For fresh marks and everyday upkeep between professional visits."
              product={product}
            />
          </div>
    </>);
    case "shoe-travel-and-storage": return (<>
<p>
              Rain does not send a warning. Neither do muddy roads, dusty
              luggage or crowded shoe racks.
            </p>
            <p>
              Keep foldable shoe covers nearby during rainy days and outdoor
              travel. When the journey ends, place clean and completely dry
              sneakers inside a shoe bag to protect their shape and separate
              them from clothes.
            </p>
            <p>
              A little preparation can save your favourite pair from
              unnecessary cleaning and damage.
            </p>
            <ProductRecommendation
              explanation="For the published storage or protection option currently selected by Shoe Doctor."
              product={product}
            />
    </>);
    case "suede-shoe-care": return (<>
<p>
              Suede should not be treated like an ordinary sneaker. Water and
              aggressive scrubbing can leave marks, flatten its texture and
              affect its colour.
            </p>
            <p>
              For small, dry stains, gently use a suede eraser instead of
              washing the entire shoe. If the stain is deep, oily or spreading,
              stop experimenting and let a <a href="/services">professional examine it</a>.
            </p>
            <p>
              The right treatment protects the material. The wrong one may make
              the damage permanent.
            </p>
            <ProductRecommendation
              explanation="Only use an item when its own published guidance confirms it is appropriate for your pair."
              product={product}
            />
    </>);
    case "at-home-sneaker-cleaning": return (<>
<div className="sd-article-body">
            <p>
              You do not need a shelf full of random cleaning products. A
              practical sneaker-cleaning kit containing cleaning foam, two
              suitable brushes and a microfiber towel is enough for most
              regular cleaning.
            </p>
            <p>Follow these steps:</p>
            <ul>
              <li>01. Remove the shoelaces and insoles, if removable.</li>
              <li>02. Use a dry brush to remove loose dust and mud.</li>
              <li>03. Test the cleaning foam on a small, less-visible area.</li>
              <li>
                04. Apply a small amount of foam to the brush instead of
                pouring cleaner directly onto the shoe.
              </li>
              <li>05. Use the softer brush on the upper material.</li>
              <li>
                06. Use the second brush for the midsole and other stronger
                surfaces.
              </li>
              <li>
                07. Wipe away loosened dirt and excess foam with a clean
                microfiber towel.
              </li>
              <li>
                08. Leave the sneakers to dry naturally in a shaded,
                ventilated area.
              </li>
            </ul>
            <p>
              A complete <a href="/products">sneaker-cleaning kit</a> makes this process easier because
              each tool has a purpose. The brushes loosen dirt, the foam cleans
              without requiring the shoe to be soaked, and the microfiber towel
              lifts away moisture without scratching the surface.
            </p>
            <p>
              <strong>Important:</strong> Avoid using the same brush on the
              dirty outsole and the upper part of the sneaker.
            </p>
            <ProductRecommendation
              explanation="A currently published kit can support this at-home routine when its product guidance matches your footwear."
              product={product}
            />
          </div>
    </>);
    default: return null;
  }
}
