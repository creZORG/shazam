
'use client';

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from "date-fns";

export function RevenueChart({ data }: { data: { date: string, revenue: number }[] }) {
    const chartConfig = { revenue: { label: 'Revenue', color: "hsl(var(--chart-1))" } };

    return (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <RechartsBarChart accessibilityLayer data={data}>
                <CartesianGrid vertical={false} />
                <XAxis
                    dataKey="date"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    tickFormatter={(value) => format(new Date(value), "MMM d")}
                />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
            </RechartsBarChart>
        </ChartContainer>
    );
}
