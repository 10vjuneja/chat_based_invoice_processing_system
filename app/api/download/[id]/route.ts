import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { invoice } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { join } from 'path';
import { stat, createReadStream } from 'fs';
import { promisify } from 'util';

const statAsync = promisify(stat);

// Create database instance
const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const awaitedParams = await params;
        const id = awaitedParams.id;
        const [invoiceData] = await db
            .select({ filePath: invoice.filePath })
            .from(invoice)
            .where(eq(invoice.id, id));

        if (!invoiceData || !invoiceData.filePath) {
            return new NextResponse('Invoice file not found', { status: 404 });
        }

        // Remove leading slash if present and join with process.cwd()
        const filePath = join(process.cwd(), invoiceData.filePath.replace(/^\//, ''));

        // Check if file exists
        try {
            await statAsync(filePath);
        } catch (error) {
            console.error('File not found at path:', filePath);
            return new NextResponse('File not found', { status: 404 });
        }

        // Create read stream
        const fileStream = createReadStream(filePath);

        // Get file stats for content length
        const stats = await statAsync(filePath);

        // Set response headers
        const headers = new Headers();
        headers.set('Content-Type', 'application/octet-stream');
        headers.set('Content-Disposition', `attachment; filename="${invoiceData.filePath.split('/').pop()}"`);
        headers.set('Content-Length', stats.size.toString());

        return new NextResponse(fileStream as any, {
            headers,
        });
    } catch (error) {
        console.error('Error downloading file:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
} 