
"use client";

import * as React from "react";
import { Pie, PieChart, Sector } from "recharts";
import { PieSectorDataItem } from "recharts/types/polar/Pie";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";

interface ExpensesChartProps {
  data: {
    category: string;
    total: number;
    fill: string;
  }[];
}

const chartConfig = {
  total: {
    label: "Total",
  },
};

export function ExpensesChart({ data }: ExpensesChartProps) {
  const [activeIndex, setActiveIndex] = React.useState(0);

  const totalAmount = React.useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.total, 0);
  }, [data]);

  const activeCategory = data[activeIndex]?.category;
  const activeTotal = data[activeIndex]?.total;

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Despesas por Categoria</CardTitle>
        <CardDescription>Distribuição de despesas no mês atual</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                hideLabel 
                formatter={(value, name, item) => (
                    <div className="flex flex-col">
                        <span className="font-bold">{item.payload.category}</span>
                        <span>{formatCurrency(item.payload.total)}</span>
                    </div>
                )}
              />}
            />
            <Pie
              data={data}
              dataKey="total"
              nameKey="category"
              innerRadius={60}
              strokeWidth={5}
              activeIndex={activeIndex}
              activeShape={({ outerRadius = 0, ...props }: PieSectorDataItem) => (
                <g>
                   <Sector {...props} outerRadius={outerRadius + 8} cornerRadius={5} />
                </g>
              )}
              onMouseEnter={(_, index) => setActiveIndex(index)}
            />
            {data.length > 0 && (
                <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-foreground text-center"
                >
                    <tspan
                        x="50%"
                        y="50%"
                        className="text-lg font-bold"
                    >
                        {activeCategory}
                    </tspan>
                     <tspan
                        x="50%"
                        y="50%"
                        dy="1.2em"
                        className="text-sm text-muted-foreground"
                    >
                        {formatCurrency(activeTotal || 0)}
                    </tspan>
                </text>
            )}
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4 border-t">
        <div className="flex items-center justify-center font-medium">
          Total do Mês: {formatCurrency(totalAmount)}
        </div>
      </CardFooter>
    </Card>
  );
}
