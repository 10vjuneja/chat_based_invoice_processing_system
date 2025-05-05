import { cleanupOldCacheEntries } from '@/lib/ai/prompt-cache';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        await cleanupOldCacheEntries();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to cleanup cache:', error);
        return NextResponse.json({ success: false, error: 'Failed to cleanup cache' }, { status: 500 });
    }
} 