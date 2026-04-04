'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function TopCampaignsTable() {
  const campaigns = [
    {
      id: '1',
      name: 'Summer Sale 2024',
      status: 'active',
      spend: '$12,450',
      roas: '4.2x',
    },
    {
      id: '2',
      name: 'Brand Awareness Q3',
      status: 'active',
      spend: '$8,230',
      roas: '2.8x',
    },
    {
      id: '3',
      name: 'Product Launch Campaign',
      status: 'paused',
      spend: '$6,780',
      roas: '5.1x',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Campaigns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Badge
                  variant={campaign.status === 'active' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {campaign.status}
                </Badge>
                <span className="font-medium">{campaign.name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">{campaign.spend}</span>
                <span className="font-semibold">{campaign.roas}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
