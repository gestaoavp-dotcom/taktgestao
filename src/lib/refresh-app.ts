import "server-only";
import { revalidatePath } from "next/cache";

/**
 * After new data lands, every screen that adds it up is out of date — not just
 * the client's tab that took the upload, but the dashboards that consolidate
 * every client, the client's own dashboard and its reports. Revalidating the
 * root layout marks all of them, so whichever is opened next is read fresh.
 */
export function refreshEverything() {
  revalidatePath("/", "layout");
}
