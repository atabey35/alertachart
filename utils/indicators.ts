/**
 * Technical Indicators Utilities
 */

import { Bar } from '@/types/chart';

/**
 * Calculate RSI (Relative Strength Index)
 */
export function calculateRSI(data: Bar[], period: number = 14): number[] {
  if (data.length < period + 1) {
    return new Array(data.length).fill(null);
  }

  const rsi: (number | null)[] = new Array(data.length).fill(null);
  const changes: number[] = [];

  // Calculate price changes
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i].close - data[i - 1].close);
  }

  // Calculate initial average gain and loss
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Calculate first RSI
  if (avgLoss === 0) {
    rsi[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + rs));
  }

  // Calculate subsequent RSI values using smoothed averages
  for (let i = period + 1; i < data.length; i++) {
    const change = changes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }

  return rsi as number[];
}

/**
 * Calculate EMA (Exponential Moving Average)
 */
export function calculateEMA(data: Bar[], period: number): number[] {
  const ema: (number | null)[] = new Array(data.length).fill(null);
  
  if (data.length < period) {
    return ema as number[];
  }

  // Calculate first SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i].close;
  }
  ema[period - 1] = sum / period;

  // Calculate EMA
  const multiplier = 2 / (period + 1);
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i].close - (ema[i - 1] as number)) * multiplier + (ema[i - 1] as number);
  }

  return ema as number[];
}

/**
 * Calculate MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  data: Bar[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
} {
  const macd: (number | null)[] = new Array(data.length).fill(null);
  const signal: (number | null)[] = new Array(data.length).fill(null);
  const histogram: (number | null)[] = new Array(data.length).fill(null);

  if (data.length < slowPeriod) {
    return { macd, signal, histogram };
  }

  // Calculate fast and slow EMAs
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);

  // Calculate MACD line
  for (let i = slowPeriod - 1; i < data.length; i++) {
    if (fastEMA[i] !== null && slowEMA[i] !== null) {
      macd[i] = (fastEMA[i] as number) - (slowEMA[i] as number);
    }
  }

  // Calculate Signal line (EMA of MACD)
  const macdValues: Bar[] = [];
  for (let i = 0; i < data.length; i++) {
    if (macd[i] !== null) {
      macdValues.push({
        ...data[i],
        close: macd[i] as number,
      });
    }
  }

  if (macdValues.length >= signalPeriod) {
    const signalEMA = calculateEMA(macdValues, signalPeriod);
    let macdIndex = 0;
    for (let i = 0; i < data.length; i++) {
      if (macd[i] !== null) {
        signal[i] = signalEMA[macdIndex];
        macdIndex++;
      }
    }
  }

  // Calculate Histogram
  for (let i = 0; i < data.length; i++) {
    if (macd[i] !== null && signal[i] !== null) {
      histogram[i] = (macd[i] as number) - (signal[i] as number);
    }
  }

  return { macd, signal, histogram };
}

/**
 * Calculate SMA (Simple Moving Average)
 */
export function calculateSMA(data: Bar[], period: number): number[] {
  const sma: (number | null)[] = new Array(data.length).fill(null);
  
  if (data.length < period) {
    return sma as number[];
  }

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    sma[i] = sum / period;
  }

  return sma as number[];
}

/**
 * Calculate Bollinger Bands
 */
export function calculateBollingerBands(
  data: Bar[],
  period: number = 20,
  stdDev: number = 2
): {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
} {
  const upper: (number | null)[] = new Array(data.length).fill(null);
  const middle: (number | null)[] = new Array(data.length).fill(null);
  const lower: (number | null)[] = new Array(data.length).fill(null);

  if (data.length < period) {
    return { upper, middle, lower };
  }

  // Calculate SMA (middle band)
  const sma = calculateSMA(data, period);

  // Calculate standard deviation and bands
  for (let i = period - 1; i < data.length; i++) {
    middle[i] = sma[i];

    // Calculate standard deviation
    let sumSquaredDiff = 0;
    for (let j = 0; j < period; j++) {
      const diff = data[i - j].close - (sma[i] as number);
      sumSquaredDiff += diff * diff;
    }
    const standardDeviation = Math.sqrt(sumSquaredDiff / period);

    upper[i] = (sma[i] as number) + stdDev * standardDeviation;
    lower[i] = (sma[i] as number) - stdDev * standardDeviation;
  }

  return { upper, middle, lower };
}
