// PostgREST caps every response at 1000 rows, and it does it silently: the
// query succeeds, the count looks plausible, and the total is wrong.
//
// That has cost this project four separate bugs — the Pedidos tab totalling
// 1000 of 1800 orders, the import screen reporting "980 pedidos" for 1754, the
// dashboard summing the first thousand rows it happened to get, and an
// analysis script that nearly concluded two identical files were different.
//
// Any query that can return more than a thousand rows goes through here.

const PAGE = 1000;

/**
 * Reads every row a query matches, a page at a time.
 *
 * `order` matters: without a stable sort the pages can overlap or skip, so
 * this sorts by id unless the caller sorted already. Pass `ordered: true` when
 * the query has its own tie-broken ordering.
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const all: T[] = [];

  for (let from = 0; ; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) return all;

    all.push(...data);
    if (data.length < PAGE) return all;
  }
}
