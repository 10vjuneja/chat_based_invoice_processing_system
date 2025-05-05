'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface InvoiceLineItem {
    id: string;
    description: string;
    quantity: string;
    unitPrice: string;
    amount: string;
}

interface Invoice {
    id: string;
    chatId: string;
    customerName: string;
    vendorName: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: string;
    currency: string;
}

interface InvoiceEditFormProps {
    invoiceId: string;
    onSave: () => void;
    onCancel: () => void;
}

export function InvoiceEditForm({ invoiceId, onSave, onCancel }: InvoiceEditFormProps) {
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadInvoice() {
            try {
                const response = await fetch(`/api/invoice/${invoiceId}`);
                if (!response.ok) throw new Error('Failed to fetch invoice');
                const data = await response.json();

                setInvoice({
                    ...data.invoice,
                    invoiceDate: format(new Date(data.invoice.invoiceDate), 'yyyy-MM-dd'),
                    dueDate: format(new Date(data.invoice.dueDate), 'yyyy-MM-dd'),
                });
                setLineItems(data.lineItems);
            } catch (error) {
                console.error('Failed to load invoice:', error);
            } finally {
                setIsLoading(false);
            }
        }

        loadInvoice();
    }, [invoiceId]);

    const handleInvoiceChange = (field: keyof Invoice, value: string) => {
        if (invoice) {
            setInvoice({ ...invoice, [field]: value });
        }
    };

    const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: string) => {
        const updatedLineItems = [...lineItems];
        updatedLineItems[index] = { ...updatedLineItems[index], [field]: value };

        // Auto-calculate amount when quantity or unit price changes
        if (field === 'quantity' || field === 'unitPrice') {
            const quantity = field === 'quantity' ? value : updatedLineItems[index].quantity;
            const unitPrice = field === 'unitPrice' ? value : updatedLineItems[index].unitPrice;

            // Only calculate if both quantity and unit price are valid numbers
            if (quantity && unitPrice && !isNaN(Number(quantity)) && !isNaN(Number(unitPrice))) {
                const amount = (Number(quantity) * Number(unitPrice)).toFixed(2);
                updatedLineItems[index].amount = amount;
            }
        }

        setLineItems(updatedLineItems);
    };

    const handleAddLineItem = () => {
        const newLineItem: InvoiceLineItem = {
            id: `new-${crypto.randomUUID()}`,
            description: '',
            quantity: '',
            unitPrice: '',
            amount: '',
        };
        setLineItems([...lineItems, newLineItem]);
    };

    const handleSave = async () => {
        if (!invoice) return;

        try {
            const response = await fetch(`/api/invoice/${invoiceId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ invoice, lineItems }),
            });

            if (!response.ok) throw new Error('Failed to save invoice');

            onSave();
        } catch (error) {
            console.error('Failed to save invoice:', error);
        }
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!invoice) {
        return <div>Invoice not found</div>;
    }

    return (
        <div className="space-y-6 p-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="vendorName">Vendor Name</Label>
                    <Input
                        id="vendorName"
                        value={invoice.vendorName}
                        onChange={(e) => handleInvoiceChange('vendorName', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customerName">Customer Name</Label>
                    <Input
                        id="customerName"
                        value={invoice.customerName}
                        onChange={(e) => handleInvoiceChange('customerName', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice Number</Label>
                    <Input
                        id="invoiceNumber"
                        value={invoice.invoiceNumber}
                        onChange={(e) => handleInvoiceChange('invoiceNumber', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="invoiceDate">Invoice Date</Label>
                    <Input
                        id="invoiceDate"
                        type="date"
                        value={invoice.invoiceDate}
                        onChange={(e) => handleInvoiceChange('invoiceDate', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                        id="dueDate"
                        type="date"
                        value={invoice.dueDate}
                        onChange={(e) => handleInvoiceChange('dueDate', e.target.value)}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="totalAmount">Total Amount</Label>
                    <Input
                        id="totalAmount"
                        value={invoice.totalAmount}
                        onChange={(e) => handleInvoiceChange('totalAmount', e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Line Items</h3>
                    <Button onClick={handleAddLineItem} variant="outline">Add Line Item</Button>
                </div>
                {lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-4 gap-4 p-4 border rounded-lg">
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={item.description}
                                onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Quantity</Label>
                            <Input
                                value={item.quantity}
                                onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Unit Price</Label>
                            <Input
                                value={item.unitPrice}
                                onChange={(e) => handleLineItemChange(index, 'unitPrice', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Amount</Label>
                            <Input
                                value={item.amount}
                                onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSave}>Save Changes</Button>
            </div>
        </div>
    );
} 