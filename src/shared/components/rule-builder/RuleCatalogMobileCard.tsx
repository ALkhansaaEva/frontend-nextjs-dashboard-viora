import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, ImageIcon, Target } from 'lucide-react';
import mediaService from '@/services/media.service';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import type { RuleDefinitionSummary } from '@/types/rules';

const STATE_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  DRAFT: 'default',
  VALIDATED: 'warning',
  PUBLISHED: 'success',
  DISABLED: 'danger',
  ROLLED_BACK: 'danger',
  ARCHIVED: 'danger',
};

export function RuleCatalogMobileCard({
  rule,
  title,
  detailLabel,
  detailValue,
  onOpen,
}: {
  rule: RuleDefinitionSummary;
  title: string;
  detailLabel: string;
  detailValue: string;
  onOpen: () => void;
}) {
  return (
    <article className="group flex min-h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-900 dark:hover:border-indigo-700">
      <RuleCatalogArtwork mediaId={rule.mediaId} title={title} />
      <button type="button" onClick={onOpen} className="block w-full min-w-0 flex-1 p-4 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="truncate font-mono text-[10px] text-gray-400">{rule.definitionKey}</p>
          </div>
          <Badge variant={STATE_COLOR[rule.state]}>{rule.state}</Badge>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-gray-400">{detailLabel}</dt>
            <dd className="mt-0.5 truncate text-gray-700 dark:text-gray-200">{detailValue}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400"><Target className="h-3 w-3" /> Target</dt>
            <dd className="mt-0.5 font-mono font-semibold text-gray-700 dark:text-gray-200">{rule.targetCount}</dd>
          </div>
          <div>
            <dt className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-gray-400"><Gift className="h-3 w-3" /> Reward</dt>
            <dd className="mt-0.5 text-gray-700 dark:text-gray-200">
              {rule.rewardSummary?.kind === 'bundle' ? `${rule.rewardSummary.components} component(s)` : rule.rewardSummary?.kind ?? 'none'}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-gray-400">Version</dt>
            <dd className="mt-0.5 text-gray-700 dark:text-gray-200">v{rule.definitionVersion}</dd>
          </div>
        </dl>
      </button>
      <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-800">
        <time className="truncate text-[10px] text-gray-400">{new Date(rule.updatedAt).toLocaleString()}</time>
        <Button size="sm" variant="outline" onClick={onOpen}>Open</Button>
      </div>
    </article>
  );
}

function RuleCatalogArtwork({ mediaId, title }: { mediaId: string | null; title: string }) {
  const [imageFailed, setImageFailed] = useState(false);
  const query = useQuery({
    queryKey: ['media-file', mediaId],
    queryFn: () => mediaService.getAdminFileById(mediaId!),
    enabled: Boolean(mediaId),
    staleTime: 5 * 60_000,
  });
  const source = imageFailed ? null : query.data?.thumbnailUrl;

  return (
    <div className="relative flex aspect-[16/7] w-full items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-50 via-violet-50 to-slate-100 dark:from-indigo-950/50 dark:via-violet-950/30 dark:to-slate-900">
      {source ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt={query.data?.altText || title} loading="lazy" onError={() => setImageFailed(true)} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" />
      ) : (
        <ImageIcon className="h-9 w-9 text-indigo-300 dark:text-indigo-700" aria-hidden="true" />
      )}
      {mediaId && !source && <span className="absolute bottom-2 end-2 rounded-full bg-white/80 px-2 py-0.5 text-[9px] text-gray-500 backdrop-blur dark:bg-gray-900/80">Artwork unavailable</span>}
    </div>
  );
}
