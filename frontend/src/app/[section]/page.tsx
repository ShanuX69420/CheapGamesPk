import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Catalog } from "@/components/Catalog";
import { catalogMetadata, resolveSection, scalars } from "@/lib/catalog";

type Props = {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/*
 * One product type or one platform, as a page of its own: /keys, /steam.
 *
 * A dynamic segment at the root loses to every static route beside it —
 * /about, /product/..., robots.txt — so all that reaches here is a top-level
 * slug nothing else claimed. A slug that is neither a type nor a platform is
 * a 404, which is also what any stray path gets.
 */
export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const section = await resolveSection((await params).section);
  if (!section) notFound();
  return catalogMetadata(section, scalars(await searchParams));
}

export default async function SectionPage({ params, searchParams }: Props) {
  const section = await resolveSection((await params).section);
  if (!section) notFound();
  return <Catalog section={section} query={scalars(await searchParams)} />;
}
