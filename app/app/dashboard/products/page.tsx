import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Product } from "@/lib/models/product";
import { Category } from "@/lib/models/category";
import { PageHeader, PrimaryAction } from "../components/ui";
import { ProductManager, type ProductRow } from "./ProductManager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

/**
 * Manual catalog CRUD.
 *
 * The list is fetched server-side and handed to ProductManager, which owns the
 * interactive state for create/edit/archive/delete. Writes go through
 * /api/crm/products so they are validated and org-scoped like every other write.
 */
export default async function ProductsPage() {
  const orgId = await getOrgId();

  const { products, categories } = orgId
    ? await (async () => {
        await connectDB();

        const [rows, categoryRows] = await Promise.all([
          Product.find({ organizationId: orgId })
            .select("name slug status brand description tags images variants categoryId external")
            .sort({ updatedAt: -1 })
            .limit(PAGE_SIZE)
            .lean(),
          Category.find({ organizationId: orgId })
            .select("name parentId")
            .sort({ name: 1 })
            .lean(),
        ]);

        const view: ProductRow[] = rows.map((product) => ({
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        status: product.status ?? "draft",
        brand: product.brand ?? "",
        description: product.description ?? "",
        tags: product.tags ?? [],
        imageUrls: (product.images ?? []).map((image) => image.url ?? "").filter(Boolean),
        categoryId: product.categoryId ? String(product.categoryId) : "",
        imported: Boolean(product.external?.externalId),
        variants: (product.variants ?? []).map((variant) => ({
          id: variant._id ? String(variant._id) : "",
          sku: variant.sku ?? "",
          title: variant.title ?? "",
          price: variant.price ?? 0,
          compareAtPrice: variant.compareAtPrice ?? null,
          costPrice: variant.costPrice ?? null,
          barcode: variant.barcode ?? "",
          weightGrams: variant.weightGrams ?? null,
          reorderLevel: variant.reorderLevel ?? 5,
          isActive: variant.isActive !== false,
        })),
      }));

        const options = categoryRows.map((row) => ({ id: String(row._id), name: row.name }));

        return { products: view, categories: options };
      })()
    : { products: [], categories: [] };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Your full catalog — variants, SKUs, pricing, categories and status."
        action={
          <PrimaryAction href="/dashboard/categories">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Manage categories
          </PrimaryAction>
        }
      />

      <ProductManager initial={products} categories={categories} />
    </div>
  );
}