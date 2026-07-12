export const ok = <T>(data: T, meta?: Record<string, unknown>) =>
  meta ? { data, meta } : { data };
export const pageMeta = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});
