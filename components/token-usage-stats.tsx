'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';

interface TokenUsageStats {
    avgPromptTokens: number;
    avgCompletionTokens: number;
    avgTotalTokens: number;
    totalInvoices: number;
    avgCostPerInvoice: number;
    costPer1MTokens: number;
    tokensSaved: number;
    estimatedCostSaved: number;
}

export function TokenUsageStats() {
    const [stats, setStats] = useState<TokenUsageStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStats() {
            try {
                const [usageResponse, savingsResponse] = await Promise.all([
                    fetch('/api/invoice/token-usage'),
                    fetch('/api/token-savings')
                ]);

                if (!usageResponse.ok) throw new Error('Failed to fetch token usage stats');
                if (!savingsResponse.ok) throw new Error('Failed to fetch token savings stats');

                const usageData = await usageResponse.json();
                const savingsData = await savingsResponse.json();

                setStats({
                    ...usageData.stats,
                    tokensSaved: savingsData.savings ?? 0,
                    estimatedCostSaved: (savingsData.savings ?? 0) * ((usageData.stats?.costPer1MTokens ?? 0) / 1000000)
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load token usage statistics');
            } finally {
                setLoading(false);
            }
        }

        fetchStats();

        // Refresh stats every 5 seconds
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div>Loading token usage statistics...</div>;
    if (error) return <div className="text-red-500">Error: {error}</div>;
    if (!stats) return null;

    return (
        <div className="space-y-4 p-4 border rounded-lg">
            <h2 className="text-lg font-semibold">Token Usage Statistics</h2>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-muted-foreground">Total Invoices Processed</p>
                    <p className="text-lg font-medium">{stats.totalInvoices}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Average Cost per Invoice</p>
                    <p className="text-lg font-medium">{formatCurrency(stats.avgCostPerInvoice.toString(), 'USD', 6)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Average Prompt Tokens</p>
                    <p className="text-lg font-medium">{Math.round(stats.avgPromptTokens)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Average Completion Tokens</p>
                    <p className="text-lg font-medium">{Math.round(stats.avgCompletionTokens)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Average Total Tokens</p>
                    <p className="text-lg font-medium">{Math.round(stats.avgTotalTokens)}</p>
                </div>
                <div>
                    <p className="text-sm text-muted-foreground">Cost per 1M Tokens</p>
                    <p className="text-lg font-medium">{formatCurrency(stats.costPer1MTokens.toString(), 'USD', 6)}</p>
                </div>
                <div className="col-span-2 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Total Tokens Saved</p>
                            <p className="text-lg font-medium">{(stats.tokensSaved ?? 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Estimated Cost Saved</p>
                            <p className="text-lg font-medium text-green-600 dark:text-green-400">
                                {formatCurrency((stats.estimatedCostSaved ?? 0).toString(), 'USD', 6)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 