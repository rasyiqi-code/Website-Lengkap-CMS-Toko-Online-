import { renderTiptapToHTML } from "@/lib/editor/render";

/**
 * TiptapRenderer (Server-Side)
 * This component renders Tiptap content as static HTML on the server.
 * This dramatically improves LCP and SEO by including the main content in the initial HTML.
 */
export default async function TiptapRenderer({ content }: { content: any }) {
    const html = await renderTiptapToHTML(content);

    return (
        <div 
            className="prose prose-slate dark:prose-invert prose-sm sm:prose-base focus:outline-none max-w-none"
            dangerouslySetInnerHTML={{ __html: html }} 
        />
    );
}
