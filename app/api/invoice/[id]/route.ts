import { NextResponse } from 'next/server';
import { getInvoiceById, getInvoiceLineItems, updateInvoice, updateInvoiceLineItem, saveInvoiceLineItem, getTokenUsageByInvoiceId } from '@/lib/db/queries';

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const invoice = await getInvoiceById({ id });
        const lineItems = await getInvoiceLineItems({ invoiceId: id });
        const tokenUsage = await getTokenUsageByInvoiceId({ invoiceId: id });
        return NextResponse.json({ invoice, lineItems, tokenUsage });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch invoice' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;
        const { invoice, lineItems } = await request.json();

        // Update invoice
        await updateInvoice({
            id,
            customerName: invoice.customerName,
            vendorName: invoice.vendorName,
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: new Date(invoice.invoiceDate),
            dueDate: new Date(invoice.dueDate),
            totalAmount: invoice.totalAmount,
        });

        // Update line items
        for (const item of lineItems) {
            if (item.id.startsWith('new-')) {
                // This is a new line item
                await saveInvoiceLineItem({
                    id: crypto.randomUUID(),
                    invoiceId: id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                });
            } else {
                // This is an existing line item
                await updateInvoiceLineItem({
                    id: item.id,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    amount: item.amount,
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }
} 