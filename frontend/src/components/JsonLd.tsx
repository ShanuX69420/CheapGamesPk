/**
 * A block of schema.org JSON-LD.
 *
 * The `<` escape is not optional: the payload carries product titles and FAQ
 * answers we do not control the punctuation of, and a literal `</script` in
 * any of them would close the tag early and spill the rest onto the page.
 * `<` is valid inside a JSON string, so parsers still see what we meant.
 */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
