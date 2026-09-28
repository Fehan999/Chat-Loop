import { Fragment } from "react";

// tiny markdown renderer for ai replies. builds react elements directly,
// so there's no html injection to worry about. covers what gemini
// actually sends: paragraphs, lists, headings, code, bold, italics, links

const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|\*[^*\s][^*]*\*)/g;

const renderInline = (text, keyPrefix) =>
  text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded bg-gray-100 px-1 py-0.5 font-mono text-[13px] text-indigo-700"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 underline"
        >
          {link[1]}
        </a>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={key}>{part}</Fragment>;
  });

const LIST_ITEM = /^\s*([-*•]|\d+[.)])\s+/;

const renderBlock = (block, key) => {
  const lines = block.split("\n");
  const elements = [];
  let list = null;

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    elements.push(
      <Tag
        key={`${key}-list-${elements.length}`}
        className={`my-1 space-y-0.5 pl-5 ${list.ordered ? "list-decimal" : "list-disc"}`}
      >
        {list.items.map((item, i) => (
          <li key={i}>{renderInline(item, `${key}-li-${i}`)}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  lines.forEach((line, i) => {
    const match = line.match(LIST_ITEM);
    if (match) {
      const ordered = /\d/.test(match[1]);
      if (list && list.ordered !== ordered) flushList();
      if (!list) list = { ordered, items: [] };
      list.items.push(line.replace(LIST_ITEM, ""));
      return;
    }
    flushList();
    if (!line.trim()) return;

    const heading = line.match(/^#{1,6}\s+(.*)$/);
    elements.push(
      <p key={`${key}-p-${i}`} className={heading ? "mt-1 font-semibold" : ""}>
        {renderInline(heading ? heading[1] : line, `${key}-${i}`)}
      </p>
    );
  });
  flushList();
  return elements;
};

const Markdown = ({ text = "" }) =>
  text.split(/```/).map((chunk, i) => {
    if (i % 2 === 1) {
      const code = chunk.replace(/^[\w-]*\n/, "");
      return (
        <pre
          key={`code-${i}`}
          className="thin-scroll my-2 overflow-x-auto rounded-lg bg-gray-900 p-3 font-mono text-[12.5px] leading-relaxed text-gray-100"
        >
          <code>{code.trimEnd()}</code>
        </pre>
      );
    }
    return (
      <div key={`text-${i}`} className="space-y-1.5">
        {chunk
          .split(/\n{2,}/)
          .filter((block) => block.trim())
          .map((block, j) => (
            <Fragment key={j}>{renderBlock(block, `b-${i}-${j}`)}</Fragment>
          ))}
      </div>
    );
  });

export default Markdown;
