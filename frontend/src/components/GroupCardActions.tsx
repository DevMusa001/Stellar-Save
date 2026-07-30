import { Button } from './Button';

interface GroupCardActionsProps {
  onViewDetails?: () => void;
  onJoin?: () => void;
}

export function GroupCardActions({ onViewDetails, onJoin }: GroupCardActionsProps) {
  return (
    <div className="group-card-footer">
      {onViewDetails && (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
        >
          View Details
        </Button>
      )}
      {onJoin && (
        <Button
          variant="primary"
          size="sm"
          onClick={(e) => { e.stopPropagation(); onJoin(); }}
        >
          Join Group
        </Button>
      )}
    </div>
  );
}
