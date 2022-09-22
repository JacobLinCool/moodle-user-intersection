export const PORT = Number(process.env.PORT) || 3000;
export const ENABLE_CACHE = process.env.ENABLE_CACHE === "true";
export const ENABLE_MEM_CACHE = process.env.ENABLE_MEM_CACHE === "true";
export const CACHE_DIR = process.env.CACHE_DIR || "cache";
