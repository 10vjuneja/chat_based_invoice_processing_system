import { getTotalTokenSavings } from '@/lib/ai/prompt-cache';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const savings = await getTotalTokenSavings();
        return NextResponse.json({ savings });
    } catch (error) {
        console.error('Failed to fetch token savings:', error);
        return NextResponse.json({ savings: 0 }, { status: 500 });
    }
} 