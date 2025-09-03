import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

export function mdToHtml(md: string) {
    const raw = marked.parse(md ?? "");

    return sanitizeHtml(String(raw), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            "img", "span", "pre", "code", "blockquote",
            "h1", "h2", "h3", "h4", "h5", "h6",
        ]),
        allowedAttributes: {
            a: ["href", "name", "target", "rel"],
            img: ["src", "alt", "title", "width", "height"],
            "*": ["id", "class", "style"],
        },
        allowedSchemes: ["http", "https", "mailto"],
    });
}
