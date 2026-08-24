import type { AIConfig } from "@crediblemark/build-ai/server";

// Lazy import @crediblemark/build-ai/server — hanya dimuat saat AI request pertama kali.
// Package AI cukup berat, lazy import menghemat ~50-100MB saat idle.
let aiModule: { generatePageWithAI: any; generateSectionWithAI: any; refineFieldWithAI: any } | null = null;
async function getAIModule() {
    if (!aiModule) {
        const mod = await import("@crediblemark/build-ai/server");
        aiModule = {
            generatePageWithAI: mod.generatePageWithAI,
            generateSectionWithAI: mod.generateSectionWithAI,
            refineFieldWithAI: mod.refineFieldWithAI,
        };
    }
    return aiModule;
}

interface AIRequest {
    prompt: string;
    mode: "page" | "section" | "refine";
    currentData?: any;
    schemas?: any[];
}

export async function processAIRequest(aiConfig: AIConfig, { prompt, mode, currentData, schemas }: AIRequest) {
    const { generatePageWithAI, generateSectionWithAI, refineFieldWithAI } = await getAIModule();
    
    if (mode === "page") {
        return generatePageWithAI(prompt, schemas, aiConfig, currentData);
    } else if (mode === "section") {
        return generateSectionWithAI(prompt, schemas, aiConfig, currentData);
    } else if (mode === "refine") {
        return refineFieldWithAI(prompt, currentData, aiConfig);
    }
    throw new Error("Invalid mode specified");
}
