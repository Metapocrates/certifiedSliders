import { createClient, type ClientConfig } from "@sanity/client";

export function getSanity() {
    const projectId = process.env.SANITY_PROJECT_ID;
    const dataset = process.env.SANITY_DATASET || "production";
    const token = process.env.SANITY_API_READ_TOKEN;

    if (!projectId) return null; // no CMS configured yet

    const config: ClientConfig = {
        projectId,
        dataset,
        apiVersion: "2025-01-01",
        useCdn: true, // fine for public reads
        token,        // omit if dataset is public
    };
    return createClient(config);
}
