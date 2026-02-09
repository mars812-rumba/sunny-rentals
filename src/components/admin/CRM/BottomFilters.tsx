import { DialogFilter, LeadMarker } from '@/types/crm';
import { cn } from '@/lib/utils';
import {
  Users, UserRoundCheck, UserRoundPlus, Filter,
  CirclePlus, CircleDollarSign, CircleCheckBig, CircleMinus, RefreshCw
} from 'lucide-react';

interface BottomFiltersProps {
  dialogFilter: DialogFilter;
  markerFilter: string;
  onDialogFilterChange: (f: DialogFilter) => void;
  onMarkerFilterChange: (m: string) => void;
  onRefresh: () => void;
  counts: { all: number; new: number; ai: number };
}

const BottomFilters = ({
  dialogFilter, markerFilter,
  onDialogFilterChange, onMarkerFilterChange,
  onRefresh, counts
}: BottomFiltersProps) => {
  const dialogFilters = [
    { id: 'all' as const, icon: Users, count: counts.all },
    { id: 'new' as const, icon: UserRoundCheck, count: counts.new },
    { id: 'ai-on' as const, icon: UserRoundPlus, count: counts.ai },
  ];

  const markers = [
    { id: 'all', icon: Filter },
    { id: 'unprocessed', icon: CirclePlus },
    { id: 'in_progress', icon: CircleDollarSign },
    { id: 'ready', icon: CircleCheckBig },
    { id: 'rejected', icon: CircleMinus },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border px-2 py-1.5 safe-area-pb">
      <div className="flex items-center gap-1">
        {/* Dialog filters */}
        <div className="flex items-center gap-0.5">
          {dialogFilters.map(f => (
            <button
              key={f.id}
              onClick={() => onDialogFilterChange(f.id)}
              className={cn(
                'flex items-center gap-1 h-7 px-2 rounded-md text-xs transition-all',
                dialogFilter === f.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <f.icon size={14} />
              <span className="font-medium">{f.count}</span>
            </button>
          ))}
        </div>

        <div className="w-px h-5 bg-border mx-1" />

        {/* Marker filters */}
        <div className="flex items-center gap-0.5">
          {markers.map(m => (
            <button
              key={m.id}
              onClick={() => onMarkerFilterChange(m.id)}
              className={cn(
                'h-7 w-7 flex items-center justify-center rounded-md transition-all',
                markerFilter === m.id
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:bg-accent'
              )}
            >
              <m.icon size={14} />
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          className="ml-auto h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent transition-all"
        >
          <RefreshCw size={14} />
        </button>
      </div>
    </div>
  );
};

export default BottomFilters;
