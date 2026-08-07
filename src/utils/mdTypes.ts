import type MarkdownIt from 'markdown-it';

/**
 * markdown-it's Token type, derived from the parser's own signature.
 *
 * The @types package only exposes Token through a deep `.mjs` path, which does
 * not resolve under this project's `moduleResolution: "node"`. Deriving it from
 * `parse()` keeps the type accurate without depending on that path.
 */
export type MdToken = ReturnType<MarkdownIt['parse']>[number];
