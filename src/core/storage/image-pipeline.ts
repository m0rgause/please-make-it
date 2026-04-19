/**
 * Storage — Chapter image download & upload pipeline.
 *
 * Downloads chapter page images from the source (komiku.org),
 * uploads them to TG-S3, and returns the stored public URLs.
 *
 * Skip logic: if the S3 object already exists (headObject check),
 * the download+upload step is skipped — only the public URL is returned.
 * This makes the pipeline idempotent and safe to call on re-ingestion.
 */

import { FETCHER } from "../../config/app.config";
import { STORAGE } from "../../config/app.config";
import { putObject, headObject, getPublicUrl } from "./index";

/**
 * Download chapter images from source URLs and store them in TG-S3.
 *
 * @param originalUrls - Ordered list of komiku.org image URLs
 * @param chapterSlug  - Chapter slug (used as part of the S3 key path)
 * @returns Ordered array of public TG-S3 URLs (same order as input)
 */
export async function downloadAndStoreChapterImages(
  originalUrls: string[],
  chapterSlug: string
): Promise<string[]> {
  const storedUrls: string[] = [];

  for (let i = 0; i < originalUrls.length; i++) {
    const originalUrl = originalUrls[i] ?? "";
    const ext = originalUrl.split(".").pop()?.split("?")[0] ?? "jpg";
    const key = `${STORAGE.CHAPTER_KEY_PREFIX}/${chapterSlug}/${i}.${ext}`;

    // Check if already stored — skip download if so
    const exists = await headObject(key);
    if (exists) {
      storedUrls.push(getPublicUrl(key));
      continue;
    }

    // Fetch image binary from source
    const response = await fetch(originalUrl, {
      headers: {
        "User-Agent": FETCHER.USER_AGENT,
        Referer: "https://komiku.org/",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      // On failure, fall back to the original URL so the chapter is still usable
      storedUrls.push(originalUrl);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "image/jpeg";

    await putObject(key, buffer, contentType);
    storedUrls.push(getPublicUrl(key));
  }

  return storedUrls;
}
