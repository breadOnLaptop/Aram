export function formatAIResponse(text = "") {
  if (!text) return "";

  let t = text;

  // Fix double/triple spacing produced by streaming chunks
  t = t.replace(/\n{3,}/g, "\n\n");

  // Make URLs clickable
  t = t.replace(
    /(https?:\/\/[^\s]+)/g,
    (url) => `[${url}](${url})`
  );

  // Add spacing between paragraphs if missing
  t = t.replace(/([^\n])\n([^\n])/g, "$1\n\n$2");

  // Fix broken list formatting
  t = t.replace(/^\s*-\s+/gm, "- ");
  t = t.replace(/^\s*\*\s+/gm, "- ");
  t = t.replace(/^\s*\d+\.\s+/gm, "1. ");

  return t.trim();
}

export function normalizeMarkdownChunk(prev, chunk) {
  let fixed = chunk;

  // Remove stray leading spaces that break markdown
  fixed = fixed.replace(/^\s+/g, "");

  // Remove triple or more line breaks
  fixed = fixed.replace(/\n{3,}/g, "\n\n");

  // Remove excessive spaces inside lines
  fixed = fixed.replace(/ {3,}/g, " ");

  // Fix headings broken across chunks
  if (prev.trim().match(/^#+\s*$/)) {
    fixed = fixed.trimStart();
  }

  // Fix broken bullets across chunks ("- " + "continued")
  if (prev.trim().endsWith("-") && fixed.startsWith(" ")) {
    fixed = fixed.trimStart();
  }

  // Fix list continuation
  if (/^\* {2,}/.test(fixed)) {
    fixed = fixed.replace(/^\* {2,}/, "* ");
  }

  // Fix headings that split: "## Req" + "uirements"
  if (prev.endsWith("##") || prev.endsWith("###") || prev.endsWith("#")) {
    fixed = fixed.trimStart();
  }

  // Prevent markdown corruption when code blocks break across chunks
  if (prev.trim().endsWith("```") && fixed.trim().startsWith("```")) {
    fixed = "\n" + fixed; 
  }

  return fixed;
}

