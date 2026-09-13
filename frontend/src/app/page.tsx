import type { Metadata } from "next";

import { Catalog } from "@/components/Catalog";
import { HOME, catalogMetadata, scalars } from "@/lib/catalog";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/* The storefront: the whole catalog, with the hero on top. Sorting, search
   and pagination are query strings on this route; the type and platform
   sections are routes of their own, in app/[section]. */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return catalogMetadata(HOME, scalars(await searchParams));
}

export default async function HomePage({ searchParams }: Props) {
  return <Catalog section={HOME} query={scalars(await searchParams)} />;
}
