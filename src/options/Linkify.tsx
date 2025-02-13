type LinkSpec = { keyword: string; href: string };

type Props = { text: string; links: Array<LinkSpec> };

export function Linkify(props: Props) {
  const matchedReplacements: Array<{
    index: number;
    keyword: string;
    href: string;
  }> = [];

  for (const link of props.links) {
    const index = props.text.indexOf(link.keyword);
    if (index !== -1) {
      matchedReplacements.push({ index, ...link });
    }
  }
  matchedReplacements.sort((a, b) => a.index - b.index);

  let position = 0;
  const parts: Array<string | LinkSpec> = [];

  for (const replacement of matchedReplacements) {
    if (position < replacement.index) {
      parts.push(props.text.substring(position, replacement.index));
    }

    parts.push({ href: replacement.href, keyword: replacement.keyword });

    position = replacement.index + replacement.keyword.length;
  }

  if (position < props.text.length) {
    parts.push(props.text.substring(position, props.text.length));
  }

  return (
    <>
      {parts.map((part) =>
        typeof part === 'string' ? (
          part
        ) : (
          <a
            key={part.keyword}
            href={part.href}
            target="_blank"
            rel="noreferrer"
          >
            {part.keyword}
          </a>
        )
      )}
    </>
  );
}
