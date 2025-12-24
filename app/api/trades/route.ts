/**
 * Recent Trades API - Fetches recent trades from Binance
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const symbol = searchParams.get('symbol')?.toUpperCase() || 'BTCUSDT';
        const marketType = searchParams.get('marketType') || 'spot';
        const limit = searchParams.get('limit') || '50';

        // Choose API based on market type
        const baseUrl = marketType === 'futures'
            ? 'https://fapi.binance.com/fapi/v1/trades'
            : 'https://api.binance.com/api/v3/trades';

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
            console.error(`[Trades API] Binance error: ${response.status}`, errorText);
            return NextResponse.json(
                { error: 'Failed to fetch trades', details: errorText },
                { status: response.status }
            );
        }

        const data = await response.json();

        // Transform data for frontend
        const trades = data.map((trade: any) => ({
            id: trade.id,
            price: parseFloat(trade.price),
            quantity: parseFloat(trade.qty),
            quoteQty: parseFloat(trade.quoteQty),
            time: trade.time,
            isBuyerMaker: trade.isBuyerMaker, // true = sell, false = buy (taker perspective)
            side: trade.isBuyerMaker ? 'sell' : 'buy',
        }));

        // Return in reverse order (newest first)
        return NextResponse.json(trades.reverse());
    } catch (error: any) {
        console.error('[Trades API] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error', message: error.message },
            { status: 500 }
        );
    }
}
