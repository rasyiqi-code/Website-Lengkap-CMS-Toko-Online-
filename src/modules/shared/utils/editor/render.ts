import { getProxiedUrl } from '@/lib/media/utils';
import filterXSS from 'xss';

function sanitizeHtml(html: string): string {
    return filterXSS(html);
}

// Lazy imports untuk @tiptap — hanya dimuat saat renderTiptapToHTML dipanggil.
// Menghemat ~30-50MB RAM karena tiptap packages cukup berat.
let tiptapModules: { generateHTML: any; StarterKit: any; Image: any } | null = null;
async function getTiptapModules() {
    if (!tiptapModules) {
        const [htmlMod, starterKitMod, imageMod] = await Promise.all([
            import('@tiptap/html'),
            import('@tiptap/starter-kit'),
            import('@tiptap/extension-image'),
        ]);
        tiptapModules = {
            generateHTML: htmlMod.generateHTML,
            StarterKit: starterKitMod.default,
            Image: imageMod.default,
        };
    }
    return tiptapModules;
}

/**
 * Converts Tiptap JSON content to static HTML for Server-Side Rendering.
 * This is crucial for performance (LCP/SEO).
 */
export async function renderTiptapToHTML(content: any): Promise<string> {
    if (!content) return "";
    
    let parsedContent;
    if (typeof content === "object") {
        parsedContent = content;
    } else {
        const contentStr = String(content);
        try {
            // Try parsing as JSON first
            parsedContent = JSON.parse(contentStr);
        } catch {
            // If not JSON, it's already HTML (legacy) — sanitize before returning
            return sanitizeHtml(contentStr);
        }
    }

    // Convert JSON to HTML using the same extensions as the client
    try {
        const { generateHTML, StarterKit, Image } = await getTiptapModules();
        let html = generateHTML(parsedContent, [
            StarterKit,
            Image.configure({
                inline: true,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full my-4 shadow-sm',
                }
            }),
        ]);

        // Optimization 1: Proxy all images and apply compression
        // This ensures editor-uploaded images are also optimized
        html = html.replace(/<img [^>]*src="([^"]+)"/g, (match, src) => {
            if (src.startsWith('data:')) return match;
            const proxied = getProxiedUrl(src, { q: 80, w: 1000 });
            return match.replace(src, proxied);
        });

        // Optimization 2: Mark the first image as high priority for LCP
        if (html.includes('<img')) {
            html = html.replace('<img', '<img loading="eager" fetchpriority="high" decoding="sync"');
        }

        return html;
    } catch (error) {
        console.error("[TIPTAP_RENDER_ERROR]", error);
        return typeof content === "object" ? JSON.stringify(content) : sanitizeHtml(String(content));
    }
}

/**
 * Extract plain text from Tiptap JSON or HTML content.
 */
export function getPlainTextFromTiptap(content: any): string {
    if (!content) return "";
    
    const extractText = (node: any): string => {
        if (!node) return "";
        if (node.type === 'text' && typeof node.text === 'string') {
            return node.text;
        }
        if (Array.isArray(node.content)) {
            return node.content.map((child: any) => extractText(child)).join(" ");
        }
        return "";
    };

    if (typeof content === "object") {
        return extractText(content).replace(/\s+/g, ' ').trim();
    }

    const contentStr = String(content);
    let parsedContent;
    try {
        parsedContent = JSON.parse(contentStr);
    } catch {
        // If not JSON, it is already HTML or plain text, strip HTML tags
        return contentStr.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    return extractText(parsedContent).replace(/\s+/g, ' ').trim();
}

/**
 * Generate a smart auto-excerpt of the given maxLength (default 160 characters).
 */
export function generateAutoExcerpt(content: string, maxLength = 160): string {
    const plainText = getPlainTextFromTiptap(content);
    if (!plainText) return "";
    if (plainText.length <= maxLength) return plainText;
    return plainText.substring(0, maxLength - 3) + "...";
}

