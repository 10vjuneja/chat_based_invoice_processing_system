'use client';

import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { ArrowUpIcon, ChevronDownIcon, PencilEditIcon } from './icons';
import { InvoiceEditForm } from './invoice-edit-form';
import { toast } from 'sonner';

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
    filePath: string; // Path to the uploaded invoice file
}

interface InvoiceTableProps {
    invoices: Invoice[];
}

type SortField = 'vendorName' | 'invoiceDate' | 'dueDate' | 'totalAmount';
type SortDirection = 'asc' | 'desc';

export function InvoiceTable({ invoices }: InvoiceTableProps) {
    const [sortField, setSortField] = useState<SortField>('invoiceDate');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
    const [tokenUsageMap, setTokenUsageMap] = useState<Record<string, number>>({});

    useEffect(() => {
        async function fetchTokenUsage() {
            const usageMap: Record<string, number> = {};
            await Promise.all(
                invoices.map(async (invoice) => {
                    try {
                        const res = await fetch(`/api/invoice/${invoice.id}`);
                        if (!res.ok) throw new Error('Failed to fetch token usage');
                        const data = await res.json();
                        // Sum totalTokens for this invoice
                        const sumTokens = Array.isArray(data.tokenUsage)
                            ? data.tokenUsage.reduce((sum: number, usage: any) => sum + (usage.totalTokens || 0), 0)
                            : 0;
                        usageMap[invoice.id] = sumTokens;
                    } catch {
                        usageMap[invoice.id] = 0;
                    }
                })
            );
            setTokenUsageMap(usageMap);
        }
        fetchTokenUsage();
    }, [invoices]);

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedInvoices = [...invoices].sort((a, b) => {
        let comparison = 0;
        switch (sortField) {
            case 'vendorName':
                comparison = a.vendorName.localeCompare(b.vendorName);
                break;
            case 'invoiceDate':
                comparison = new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime();
                break;
            case 'dueDate':
                comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                break;
            case 'totalAmount':
                // Remove currency symbols and commas, then convert to number for comparison
                const amountA = parseFloat(a.totalAmount.replace(/[^0-9.-]+/g, ''));
                const amountB = parseFloat(b.totalAmount.replace(/[^0-9.-]+/g, ''));
                comparison = amountA - amountB;
                break;
        }
        return sortDirection === 'asc' ? comparison : -comparison;
    });

    const SortIcon = ({ field }: { field: SortField }) => {
        if (field !== sortField) return null;
        return sortDirection === 'asc' ? <ArrowUpIcon size={16} /> : <ChevronDownIcon size={16} />;
    };

    const handleEditInvoice = (invoice: Invoice) => {
        setEditingInvoiceId(invoice.id);
    };

    const handleSaveInvoice = () => {
        setEditingInvoiceId(null);
        const updatedInvoice = invoices.find(invoice => invoice.id === editingInvoiceId);
        if (updatedInvoice) {
            toast.success(`Invoice ${updatedInvoice.invoiceNumber} has been updated successfully!`);
        }
    };

    const handleCancel = () => {
        setEditingInvoiceId(null);
    };

    return (
        <div className="space-y-4">
            <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th
                                className="text-left p-2 cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('vendorName')}
                            >
                                <div className="flex items-center gap-1">
                                    Vendor
                                    <SortIcon field="vendorName" />
                                </div>
                            </th>
                            <th className="text-left p-2">Customer</th>
                            <th className="text-left p-2">Invoice #</th>
                            <th
                                className="text-left p-2 cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('invoiceDate')}
                            >
                                <div className="flex items-center gap-1">
                                    Date
                                    <SortIcon field="invoiceDate" />
                                </div>
                            </th>
                            <th
                                className="text-left p-2 cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('dueDate')}
                            >
                                <div className="flex items-center gap-1">
                                    Due Date
                                    <SortIcon field="dueDate" />
                                </div>
                            </th>
                            <th
                                className="text-right p-2 cursor-pointer hover:bg-muted/50"
                                onClick={() => handleSort('totalAmount')}
                            >
                                <div className="flex items-center justify-end gap-1">
                                    Amount
                                    <SortIcon field="totalAmount" />
                                </div>
                            </th>
                            <th className="text-right p-2">Token Usage</th>
                            <th className="text-right p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedInvoices.map((invoice) => (
                            <tr key={invoice.id} className="border-b hover:bg-muted/50">
                                <td className="p-2">{invoice.vendorName}</td>
                                <td className="p-2">{invoice.customerName}</td>
                                <td className="p-2">{invoice.invoiceNumber}</td>
                                <td className="p-2">{format(new Date(invoice.invoiceDate), 'MMM d, yyyy')}</td>
                                <td className="p-2">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</td>
                                <td className="p-2 text-right">
                                    {formatCurrency(invoice.totalAmount, invoice.currency)}
                                </td>
                                <td className="p-2 text-right">
                                    {tokenUsageMap[invoice.id] === undefined
                                        ? '...'
                                        : tokenUsageMap[invoice.id]}
                                </td>
                                <td className="p-2 text-right">
                                    <div className="flex justify-end gap-4">
                                        <button
                                            onClick={() => handleEditInvoice(invoice)}
                                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                            <PencilEditIcon />
                                        </button>
                                        {invoice.filePath && (
                                            <button
                                                onClick={() => window.open(`/api/download/${invoice.id}`, '_blank')}
                                                className="text-sm text-green-600 hover:text-green-800 hover:underline"
                                                title="Download Invoice"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                    <polyline points="7 10 12 15 17 10" />
                                                    <line x1="12" y1="15" x2="12" y2="3" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingInvoiceId && (
                <div className="mt-4 border rounded-lg">
                    <InvoiceEditForm
                        invoiceId={editingInvoiceId}
                        onSave={handleSaveInvoice}
                        onCancel={handleCancel}
                    />
                </div>
            )}
        </div>
    );
} 