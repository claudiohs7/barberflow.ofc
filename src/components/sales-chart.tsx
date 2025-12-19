"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { format, subDays, startOfMonth, endOfMonth, startOfYesterday, endOfYesterday } from "date-fns"
import { ptBR } from 'date-fns/locale'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { formatCurrency } from "@/lib/utils"

const chartConfig = {
  sales: {
    label: "Vendas",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

type TimeRange = "7d" | "30d" | "last_month" | "total";

export function SalesChart({ data }: { data: { date: string, sales: number }[] }) {
  const [timeRange, setTimeRange] = React.useState<TimeRange>("7d");
  const [activeChart, setActiveChart] =
    React.useState<keyof typeof chartConfig>("sales")

  const filteredData = React.useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
        case "7d":
            startDate = subDays(now, 6);
            break;
        case "30d":
            startDate = startOfMonth(now);
            break;
        case "last_month":
            startDate = startOfMonth(subDays(now, now.getDate()));
            break;
        case "total":
            return data;
        default:
            startDate = subDays(now, 6);
    }

    if (timeRange === "last_month") {
        const endDate = endOfMonth(startDate);
         return data.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= startDate && itemDate <= endDate;
        });
    }

    return data.filter(item => new Date(item.date) >= startDate);
  }, [data, timeRange]);

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1 p-6">
          <CardTitle>Visão Geral de Vendas</CardTitle>
          <CardDescription>
            Exibindo o total de vendas para o período selecionado.
          </CardDescription>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-6 sm:border-l">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger
                className="w-full rounded-lg"
                aria-label="Selecionar período"
              >
                <SelectValue placeholder="Selecione o período" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="7d" className="rounded-lg">
                  Últimos 7 dias
                </SelectItem>
                <SelectItem value="30d" className="rounded-lg">
                  Este mês
                </SelectItem>
                 <SelectItem value="last_month" className="rounded-lg">
                  Mês passado
                </SelectItem>
                <SelectItem value="total" className="rounded-lg">
                  Total
                </SelectItem>
              </SelectContent>
            </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={filteredData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => format(new Date(value + 'T00:00:00'), "d/MMM", { locale: ptBR })}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                indicator="dot" 
                labelFormatter={(value) => format(new Date(value + 'T00:00:00'), "PPP", { locale: ptBR })}
                formatter={(value) => formatCurrency(value as number)}
              />}
            />
            <Bar dataKey={activeChart} fill={`var(--color-${activeChart})`} radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
