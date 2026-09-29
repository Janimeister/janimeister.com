export function escapeHtml(s: string): string;

export function buildCsp(liveApiUrl: string | undefined): { csp: string; warning?: string };

export function renderNoscriptVideoList(data: unknown): string;
