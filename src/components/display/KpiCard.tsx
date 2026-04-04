'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon?: any;
  loading?: boolean;
}

export function KpiCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  loading = false,
}: KpiCardProps) {
  if (loading) {
    return <KpiCardSkeleton />;
  }

  const isPositive = changeType === 'increase';
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center space-x-1 text-xs">
            <TrendIcon className={cn(
              "h-3 w-3",
              isPositive ? "text-green-500" : "text-red-500"
            )} />
            <span className={cn(
              isPositive ? "text-green-500" : "text-red-500"
            )}>
              {isPositive ? '+' : ''}{change}%
            </span>
            <span className="text-muted-foreground">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="h-4 bg-muted rounded w-3/4"></div>
        <div className="h-4 w-4 bg-muted rounded"></div>
      </CardHeader>
      <CardContent>
        <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
        <div className="h-3 bg-muted rounded w-full"></div>
      </CardContent>
    </Card>
  );
}
