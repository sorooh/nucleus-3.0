// Re-export from shared for backwards compatibility
export * from '@shared/bots-data';

// Client-specific UI helpers
export const getCategoryColor = (category: string) => {
  const colors = {
    products: 'hsl(210 100% 60%)',
    markets: 'hsl(142 76% 36%)',
    languages: 'hsl(280 65% 55%)',
    platforms: 'hsl(38 92% 50%)',
    technical: 'hsl(188 94% 42%)',
  };
  return colors[category as keyof typeof colors] || 'hsl(220 15% 40%)';
};

export const getRankBadgeVariant = (rank: string) => {
  const variants = {
    beginner: 'secondary',
    intermediate: 'default',
    advanced: 'outline',
    expert: 'default',
    legendary: 'default',
  };
  return variants[rank as keyof typeof variants] || 'secondary';
};

export const getStatusColor = (status: string) => {
  const colors = {
    active: 'hsl(142 76% 36%)',
    sleeping: 'hsl(220 15% 40%)',
    error: 'hsl(0 84% 60%)',
    maintenance: 'hsl(38 92% 50%)',
  };
  return colors[status as keyof typeof colors] || 'hsl(220 15% 40%)';
};
