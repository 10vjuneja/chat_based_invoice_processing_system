import { NextResponse } from 'next/server';
import { getAverageTokenUsage } from '@/lib/db/queries';

export async function GET() {
    try {
        const stats = await getAverageTokenUsage();

        // Calculate cost for Gemini 1.5 Flash
        // https://ai.google.dev/gemini-api/docs/pricing#gemini-1.5-flash
        const costPer1MTokens = 0.075;
        const avgCostPerInvoice = (stats.avgTotalTokens / 1000000) * costPer1MTokens;

        return NextResponse.json({
            stats: {
                ...stats,
                avgCostPerInvoice,
                costPer1MTokens,
            }
        });
    } catch (error) {
        console.error('Failed to get token usage statistics:', error);
        return NextResponse.json(
            { error: 'Failed to get token usage statistics' },
            { status: 500 }
        );
    }
} 