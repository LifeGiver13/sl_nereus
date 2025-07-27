import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface PageSizeSelectorProps {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  totalItems?: number;
  className?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export const PageSizeSelector: React.FC<PageSizeSelectorProps> = ({
  pageSize,
  onPageSizeChange,
  totalItems,
  className = ''
}) => {
  const [isCustomInputVisible, setIsCustomInputVisible] = React.useState(false);
  const [customValue, setCustomValue] = React.useState('');

  const handleSelectChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomInputVisible(true);
      setCustomValue(pageSize.toString());
    } else {
      setIsCustomInputVisible(false);
      onPageSizeChange(parseInt(value));
    }
  };

  const handleCustomSubmit = () => {
    const value = parseInt(customValue);
    if (value > 0 && value <= 1000) { // Reasonable limits
      onPageSizeChange(value);
      setIsCustomInputVisible(false);
    }
  };

  const handleCustomKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomSubmit();
    } else if (e.key === 'Escape') {
      setIsCustomInputVisible(false);
    }
  };

  const isCustomValue = !PAGE_SIZE_OPTIONS.includes(pageSize);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-muted-foreground whitespace-nowrap">
        Results per page:
      </span>
      
      {isCustomInputVisible ? (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={handleCustomKeyPress}
            className="w-16 h-8 text-sm"
            min="1"
            max="1000"
            autoFocus
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCustomSubmit}
            className="h-8 w-8 p-0"
          >
            <Check className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Select 
          value={isCustomValue ? 'custom' : pageSize.toString()} 
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className="w-auto h-8 min-w-[70px] bg-background border border-input shadow-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-50 bg-popover border border-border shadow-md">
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={size.toString()}>
                {size}
              </SelectItem>
            ))}
            <SelectItem value="custom">
              {isCustomValue ? pageSize : 'Custom...'}
            </SelectItem>
          </SelectContent>
        </Select>
      )}
      
      {totalItems !== undefined && (
        <span className="text-xs text-muted-foreground">
          of {totalItems} total
        </span>
      )}
    </div>
  );
};