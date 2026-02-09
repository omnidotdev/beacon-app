import app from "@/lib/config/app.config";
import { BASE_URL as ENV_BASE_URL } from "@/lib/config/env.config";

const BASE_URL = ENV_BASE_URL ?? "https://beacon.omni.dev";

interface MetaTagParams {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Create meta tags for SEO and social sharing
 */
const createMetaTags = ({
  title: _title,
  description: _description,
  image,
  url: _url,
}: MetaTagParams = {}) => {
  const title = _title
    ? `${_title} | ${app.name}`
    : `${app.name} - AI Voice & Messaging Gateway`;
  const description =
    _description ??
    "Your personal AI companion with voice and messaging. Connect to any AI provider, run locally or in the cloud.";
  const url = _url ?? BASE_URL;
  const ogImage = image ?? `${BASE_URL}/og.png`;

  const meta = [
    // Basic
    { title },
    { name: "description", content: description },

    // OpenGraph
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: url },
    { property: "og:site_name", content: app.name },
    { property: "og:image", content: ogImage },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },

    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: ogImage },
    { name: "twitter:url", content: url },
    { name: "twitter:site", content: "@omnidotdev" },
    { name: "twitter:creator", content: "@omnidotdev" },
  ];

  const links = [{ rel: "canonical", href: url }];

  return { meta, links };
};

export default createMetaTags;
