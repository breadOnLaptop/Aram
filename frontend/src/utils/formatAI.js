export function formatAIResponse(text = "") {
  if (!text) return "";
  
  text = text
    .replace(/\r\n/g, "\n")           // Normalize line endings
    .replace(/\n{3,}/g, "\n\n")       // Reduce 3+ newlines to exactly 2
    .replace(/ {3,}/g, " ")           // Remove excessive spaces inside lines
    .replace(/^\s+/gm, "")            // Trim leading spaces from each line
    .trim();                          // Clean edges
    
  return text;  
}

export function normalizeMarkdownChunk(text) {
  if (!text) return "";

  return text
    // normalize Windows line endings
    .replace(/\r\n/g, "\n")

    // collapse 3+ newlines into exactly 2 (Markdown paragraph break)
    .replace(/\n{3,}/g, "\n\n")

    // trim trailing whitespace per line
    .replace(/[ \t]+\n/g, "\n")

    // avoid leading blank lines
    .replace(/^\n+/, "");
}
