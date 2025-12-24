/**
 * Order Book API - Fetches order book data from Binance
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol')?.toUpperCase() || 'BTCUSDT';
        const marketType = searchParams.get('marketType') || 'spot';
        const limit = searchParams.get('limit') || '20';

        // Choose API based on market type
        const baseUrl = marketType === 'futures'
            ? 'https://fapi.binance.com/fapi/v1/depth'
            : 'https://api.binance.com/api/v3/depth';

        const response = await fetch(
            `${baseUrl}?symbol=${symbol}&limit=${limit}`,
            {
                headers: {
                    'Accept': 'application/json',
                },
                next: { revalidate: 0 }, // No cache for real-time data
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[OrderBook API] Binance error: ${response.status}`, errorText);
            return NextResponse.json(
                { error: 'Failed to fetch order book', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform data for frontend
        // bids: [[price, qty], ...]
        // asks: [[price, qty], ...]
        const orderBook = {
            bids: data.bids.map((bid: [string, string]) => ({
                price: parseFloat(bid[0]),
                quantity: parseFloat(bid[1]),
                total: parseFloat(bid[0]) * parseFloat(bid[1]),
            })),
            asks: data.asks.map((ask: [string, string]) => ({
                price: parseFloat(ask[0]),
                quantity: parseFloat(ask[1]),
                total: parseFloat(ask[0]) * parseFloat(ask[1]),
            })),
            lastUpdateId: data.lastUpdateId,
        };

        return NextResponse.json(orderBook);
    } catch (error: any) {
        console.error('[OrderBook API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
