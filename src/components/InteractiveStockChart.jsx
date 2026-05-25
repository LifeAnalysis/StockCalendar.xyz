"use client";

import React, { useMemo } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent } from "./ui/card.jsx";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart.jsx";

const chartConfig = {
  priceData: {
    label: "Price Data"
  },
  high: {
    label: "High",
    color: "#04151f"
  },
  close: {
    label: "Close",
    color: "#ccff00"
  },
  low: {
    label: "Low",
    color: "#407076"
  }
};

function formatAxisDate(value, selectedRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (selectedRange === "1D") {
    return `${date.getDate()} ${date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: false
    })}`;
  }
  if (selectedRange === "1Y") {
    return date.toLocaleDateString("en-US", { month: "short" });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

function formatTooltipDate(value, selectedRange) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  if (selectedRange === "1D") {
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }
  if (selectedRange === "1Y") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric"
    });
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

export const InteractiveStockChart = ({ chartData, selectedRange }) => {
  const formattedData = useMemo(
    () =>
      chartData
        .map((item) => {
          const close = Number(item.close);
          if (!Number.isFinite(close)) return null;
          const open = Number.isFinite(Number(item.open)) ? Number(item.open) : close;
          const high = Number.isFinite(Number(item.high)) ? Number(item.high) : Math.max(open, close);
          const low = Number.isFinite(Number(item.low)) ? Number(item.low) : Math.min(open, close);
          return {
            ...item,
            open,
            high,
            low,
            close,
            dateTime: new Date(item.date).getTime()
          };
        })
        .filter((item) => item && !Number.isNaN(item.dateTime))
        .sort((a, b) => a.dateTime - b.dateTime),
    [chartData]
  );

  const yDomain = useMemo(() => {
    if (!formattedData.length) return ["auto", "auto"];
    const values = formattedData.flatMap((item) => [item.open, item.close]).filter(Number.isFinite);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const fallbackPadding = Math.max(Math.abs(max) * 0.0025, 0.35);
    const padding = range > 0 ? Math.max(range * 0.2, fallbackPadding) : fallbackPadding;
    return [min - padding, max + padding];
  }, [formattedData]);

  if (!formattedData.length) return <div className="chart-fallback chart-state">Chart unavailable from Yahoo.</div>;

  return (
    <Card className="interactive-stock-chart">
      <CardContent>
        <div className="interactive-chart-frame">
          <ChartContainer config={chartConfig} className="interactive-chart-container">
            <LineChart
              data={formattedData}
              margin={{
                top: 16,
                right: 12,
                left: 4,
                bottom: 8
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => formatAxisDate(value, selectedRange)}
              />
              <YAxis domain={yDomain} tickFormatter={(value) => `$${value.toFixed(2)}`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="chart-tooltip-width"
                    labelFormatter={(value) => formatTooltipDate(value, selectedRange)}
                  />
                }
              />
              <Line type="monotone" dataKey="high" stroke={chartConfig.high.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="close" stroke={chartConfig.close.color} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="low" stroke={chartConfig.low.color} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
