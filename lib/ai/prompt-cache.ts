import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { promptCache } from '@/lib/db/schema';
import { generateUUID } from '@/lib/utils';
import { sql } from 'drizzle-orm';

const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

export async function getCachedPrompt(promptHash: string, model: string) {
    try {
        const result = await db
            .select()
            .from(promptCache)
            .where(sql`${promptCache.promptHash} = ${promptHash} AND ${promptCache.model} = ${model}`)
            .limit(1);

        if (result.length > 0) {
            // Update lastAccessed timestamp and increment savedTokens
            await db
                .update(promptCache)
                .set({
                    lastAccessed: new Date(),
                    savedTokens: sql`${promptCache.savedTokens} + ${result[0].totalTokens}`
                })
                .where(sql`${promptCache.id} = ${result[0].id}`);

            return result[0];
        }
        return null;
    } catch (error) {
        console.error('Failed to get cached prompt:', error);
        return null;
    }
}

export async function savePromptToCache({
    promptHash,
    response,
    model,
    promptTokens,
    completionTokens,
    totalTokens,
}: {
    promptHash: string;
    response: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}) {
    try {
        const now = new Date();
        return await db.insert(promptCache).values({
            id: generateUUID(),
            promptHash,
            response,
            model,
            promptTokens,
            completionTokens,
            totalTokens,
            savedTokens: 0, // Initialize with 0 saved tokens
            createdAt: now,
            lastAccessed: now,
        });
    } catch (error) {
        console.error('Failed to save prompt to cache:', error);
        throw error;
    }
}

export async function getTotalTokenSavings() {
    try {
        const result = await db
            .select({ totalSavedTokens: sql<number>`SUM(${promptCache.savedTokens})` })
            .from(promptCache);

        return result[0]?.totalSavedTokens || 0;
    } catch (error) {
        console.error('Failed to get total token savings:', error);
        return 0;
    }
}

export async function cleanupOldCacheEntries(maxAgeDays: number = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

        await db
            .delete(promptCache)
            .where(sql`${promptCache.lastAccessed} < ${cutoffDate}`);
    } catch (error) {
        console.error('Failed to cleanup old cache entries:', error);
    }
} 