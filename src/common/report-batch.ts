export type ReportBatch = {
  id: string;
  status: 'sending' | 'complete';
  totalSelected: number;
  sent: number;
  failed: number;
  skipped: number;
  results: Array<{
    id: string;
    status: 'sent' | 'failed' | 'skipped';
    reason?: string;
    statusCode?: number;
  }>;
};

export type ReportBatchReply =
  | { status: 'ok'; batch: ReportBatch }
  | { status: 'stale-state' | 'batch-unavailable' };
