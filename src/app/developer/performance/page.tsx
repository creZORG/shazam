
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { getPerformanceMetrics } from "./actions";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Line, LineChart, TooltipProps } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Loader2, Activity, CreditCard, AlertTriangle } from "lucide-react";
import { format } from 'date-fns';

type PerformanceData = Awaited<ReturnType<typeof getPerformanceMetrics>>['data'];

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border rounded-lg shadow-lg">
        <p className="label font-bold">{`${label}`}</p>
        {payload.map((pld, index) => (
          <div key={index} style={{ color: pld.color }}>
            {`${pld.name}: ${pld.value}`}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DeveloperPerformancePage() {
    const [data, setData] = useState<PerformanceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        getPerformanceMetrics().then(result => {
            if (result.success && result.data) {
                setData(result.data);
            }
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!data) {
        return <p className="text-destructive">Could not load performance data.</p>
    }

    const chartConfig = {
      interactions: { label: "Interactions", color: "hsl(var(--chart-1))" },
      transactions: { label: "Transactions", color: "hsl(var(--chart-2))" },
      errors: { label: "Errors", color: "hsl(var(--chart-3))" },
    };

  return (
    <div className="space-y-8">
        <h1 className="text-3xl font-bold">Application Performance</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="User Interactions (24h)" value={data.totalInteractions.toLocaleString()} icon={Activity} />
            <StatCard title="Completed Transactions (24h)" value={data.totalTransactions.toLocaleString()} icon={CreditCard} />
            <StatCard title="Errors Logged (24h)" value={data.totalErrors.toLocaleString()} icon={AlertTriangle} />
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Activity Per Hour</CardTitle>
                <CardDescription>A look at user interactions, transactions, and errors over the last 24 hours.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[400px] w-full">
                    <LineChart accessibilityLayer data={data.activityByHour} margin={{ left: 12, right: 12, top: 5, bottom: 5 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="hour"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => format(new Date(value), "ha")}
                        />
                        <YAxis />
                        <ChartTooltip content={<CustomTooltip />} />
                        <Line dataKey="interactions" type="monotone" stroke="var(--color-interactions)" strokeWidth={2} dot={false} />
                        <Line dataKey="transactions" type="monotone" stroke="var(--color-transactions)" strokeWidth={2} dot={false} />
                        <Line dataKey="errors" type="monotone" stroke="var(--color-errors)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    </div>
  );
}
