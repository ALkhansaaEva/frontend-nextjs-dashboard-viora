'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import rulesService from '@/services/rules.service';
import campaignsService from '@/services/campaigns.service';

/**
 * Reference pickers for TASK_REFERENCE / ACHIEVEMENT_REFERENCE /
 * CAMPAIGN_REFERENCE config fields. Options come from real backend list
 * endpoints (search by definition key); the stored value stays the raw id
 * the backend expects. Only used where a legitimate read endpoint exists.
 */

interface RefPickerProps {
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}

function useDebounced(search: string): string {
  const [debounced, setDebounced] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  return debounced;
}

export function RuleRefPicker({
  kind,
  value,
  onChange,
  disabled,
}: RefPickerProps & { kind: 'TASK' | 'ACHIEVEMENT' }) {
  const [search, setSearch] = useState('');
  const debounced = useDebounced(search);
  const { data } = useQuery({
    queryKey: ['rule-ref-picker', kind, debounced],
    queryFn: () =>
      rulesService.listRules({
        kind,
        definitionKey: debounced || undefined,
        state: 'PUBLISHED',
        limit: 20,
      }),
  });
  const rules = data?.items ?? [];
  const selected = rules.find((rule) => rule.id === value);

  return (
    <div className="space-y-1.5">
      <Input
        placeholder="Search definition key…"
        value={search}
        disabled={disabled}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: '', label: selected ? '' : 'Select a rule…' },
          ...rules.map((rule) => ({
            value: rule.id,
            label: `${rule.definitionKey} v${rule.definitionVersion} (${rule.state})`,
          })),
        ].filter((option, index) => index > 0 || option.label)}
      />
      {value && (
        <p className="break-all font-mono text-[10px] text-gray-400">{value}</p>
      )}
    </div>
  );
}

export function CampaignRefPicker({ value, onChange, disabled }: RefPickerProps) {
  const { data } = useQuery({
    queryKey: ['campaign-ref-picker'],
    queryFn: () => campaignsService.list(),
    staleTime: 5 * 60_000,
  });
  const campaigns = data ?? [];
  return (
    <div className="space-y-1.5">
      <Select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: '', label: 'Select a campaign…' },
          ...campaigns.map((campaign) => ({
            value: campaign.id,
            label: `${campaign.campaignKey} v${campaign.version} (${campaign.status})`,
          })),
        ]}
      />
      {value && (
        <p className="break-all font-mono text-[10px] text-gray-400">{value}</p>
      )}
    </div>
  );
}
