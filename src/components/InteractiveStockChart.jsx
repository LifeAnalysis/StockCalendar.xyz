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
    color: "var(--chart-3)"
  },
  close: {
    label: "Close",
    color: "var(--chart-2)"
  },
  low: {
    label: "Low",
    color: "var(--chart-1)"
  }
};

export const InteractiveStockChart = ({ chartData }) => {
  const formattedData = useMemo(
    () =>
      chartData
        .map((item) => ({
          ...item,
          dateTime: new Date(item.date).getTime()
        }))
        .filter((item) => !Number.isNaN(item.dateTime))
        .sort((a, b) => a.dateTime - b.dateTime),
    [chartData]
  );

  const minValue = useMemo(
    () => Math.min(...formattedData.map((item) => Math.min(item.open, item.close))),
    [formattedData]
  );
  const maxValue = useMemo(
    () => Math.max(...formattedData.map((item) => Math.max(item.open, item.close))),
    [formattedData]
  );

  return (
    <Card className="interactive-stock-chart">
      <CardContent>
        <div className="interactive-chart-frame">
          <ChartContainer config={chartConfig} className="interactive-chart-container">
            <LineChart
              data={formattedData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 10
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric"
                  });
                }}
              />
              <YAxis domain={[minValue * 0.9, maxValue * 1.1]} tickFormatter={(value) => `$${value.toFixed(2)}`} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="chart-tooltip-width"
                    labelFormatter={(value) => {
                      return new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric"
                      });
                    }}
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
