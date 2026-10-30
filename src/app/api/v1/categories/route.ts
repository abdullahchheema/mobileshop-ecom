import { getNavCategories } from "@/lib/catalog";

/** Public category tree for the web and mobile apps. */
export async function GET() {
  const categories = await getNavCategories();
  return Response.json({ data: categories });
}
