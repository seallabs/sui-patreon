'use client';

import { Label } from '@/components/ui/label';
import { RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AudienceAccess, SubscriptionTier } from '@/types';

interface AudienceSelectorProps {
  access: AudienceAccess;
  onAccessChange: (access: AudienceAccess) => void;
  selectedTiers: string[];
  onTiersChange: (tiers: string[]) => void;
  availableTiers: SubscriptionTier[];
}

export function AudienceSelector({
  access,
  onAccessChange,
  selectedTiers,
  onTiersChange,
  availableTiers,
}: AudienceSelectorProps) {
  const toggleTier = (tierId: string) => {
    if (selectedTiers.includes(tierId)) {
      onTiersChange(selectedTiers.filter((id) => id !== tierId));
    } else {
      onTiersChange([...selectedTiers, tierId]);
    }
  };

  return (
    <div className='space-y-4'>
      <div className='space-y-3'>
        {/* Free access option */}
        <div
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 transition-colors cursor-pointer',
            access === 'free'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-muted-foreground/50'
          )}
          onClick={() => onAccessChange('free')}
        >
          <RadioGroupItem value='free' id='free-access' className='mt-0.5' />
          <div className='flex-1'>
            <Label
              htmlFor='free-access'
              className='cursor-pointer text-base font-medium'
            >
              Free access
            </Label>
            <p className='mt-1 text-sm text-muted-foreground'>
              Let everyone access this post and discover your work
            </p>
          </div>
        </div>

        {/* Paid access option */}
        <div
          className={cn(
            'rounded-lg border transition-colors',
            access === 'paid' ? 'border-primary bg-primary/5' : 'border-border'
          )}
        >
          <div
            className='flex items-start gap-3 p-4 cursor-pointer'
            onClick={() => onAccessChange('paid')}
          >
            <RadioGroupItem value='paid' id='paid-access' className='mt-0.5' />
            <div className='flex-1'>
              <Label
                htmlFor='paid-access'
                className='cursor-pointer text-base font-medium'
              >
                Paid access
              </Label>
              <p className='mt-1 text-sm text-muted-foreground'>
                Limit access to paid members and people who purchased this post
              </p>
            </div>
          </div>

          {/* Tier selection (only shown when paid is selected) */}
          {access === 'paid' && (
            <div className='border-t border-border px-4 pb-4 pt-3'>
              <p className='mb-3 text-sm font-semibold text-foreground'>Select tiers:</p>
              <div className='space-y-2'>
                {availableTiers.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    No tiers available. Create tiers in your settings.
                  </p>
                ) : (
                  availableTiers.map((tier) => (
                    <div
                      key={tier.id}
                      className={cn(
                        'flex items-center gap-3 rounded-md border p-3 transition-all cursor-pointer hover:bg-accent/50',
                        selectedTiers.includes(tier.tierId)
                          ? 'border-primary/50 bg-accent'
                          : 'border-border/50'
                      )}
                      onClick={() => toggleTier(tier.tierId)}
                    >
                      <Checkbox
                        id={`tier-${tier.id}`}
                        checked={selectedTiers.includes(tier.tierId)}
                        onCheckedChange={() => toggleTier(tier.tierId)}
                      />
                      <Label
                        htmlFor={`tier-${tier.id}`}
                        className='flex-1 cursor-pointer font-normal'
                      >
                        <span className='font-medium text-foreground'>{tier.name}</span>
                        <span className='text-muted-foreground'> - ${tier.price}/mo</span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
