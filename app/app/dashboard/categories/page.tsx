import { getOrgId } from "@/lib/org";
import { connectDB } from "@/lib/database/db";
import { Category } from "@/lib/models/category";
import { CategoriesScreen, type Category as CategoryView } from "./CategoriesScreen";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const orgId = await getOrgId();

  const categories: CategoryView[] = orgId
    ? await (async () => {
        await connectDB();
        const rows = await Category.find({ organizationId: orgId })
          .select("name slug parentId")
          .sort({ name: 1 })
          .lean();

        return rows.map((category) => ({
          id: String(category._id),
          name: category.name,
          slug: category.slug,
          parentId: category.parentId ? String(category.parentId) : null,
        }));
      })()
    : [];

  return <CategoriesScreen initial={categories} />;
}