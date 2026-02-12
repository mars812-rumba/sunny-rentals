import { LeadStatus, STATUS_CONFIGS } from '@/types/crm';
import { cn } from '@/lib/utils';

interface StatusBarProps {
  stats: Record<LeadStatus, number>;
  activeStatus: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
}

const StatusBar = ({ stats, activeStatus, onStatusChange }: StatusBarProps) => {
  return (
    <div className="flex gap-1 overflow-x-auto px-0.5">
      {STATUS_CONFIGS.map(({ key, label, accent }) => {
        const isActive = activeStatus === key;
        const isAccent = key === 'in_work';
        return (
          <button
            key={key}
            onClick={() => onStatusChange(key)}
            className={cn(
              'flex-1 min-w-0 rounded-md px-2 py-1.5 text-center transition-all border',
              isActive
                ? isAccent
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-foreground text-background border-foreground shadow-sm'
                : isAccent
                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  : 'bg-card text-muted-foreground border-border hover:bg-accent'
            )}
          >
            <div className="text-[10px] font-medium leading-tight truncate">{label}</div>
            <div className={cn('text-sm font-bold leading-tight', isActive ? '' : isAccent ? 'text-blue-600' : 'text-foreground')}>
              {stats[key] || 0}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default StatusBar;
