import * as icons from "simple-icons";

export type Platform = {
  id: string;
  name: string;
  color: string; // color de marca (hex sin #)
  path?: string; // path SVG de simple-icons
  placeholder: string;
};

type SI = { path: string; hex: string };
const si = (key: string): SI | undefined => (icons as unknown as Record<string, SI>)[key];

function p(id: string, name: string, iconKey: string | null, placeholder: string, fallbackColor = "555555"): Platform {
  const icon = iconKey ? si(iconKey) : undefined;
  return { id, name, color: icon?.hex ?? fallbackColor, path: icon?.path, placeholder };
}

export const PLATFORMS: Platform[] = [
  p("tiktok", "TikTok", "siTiktok", "https://www.tiktok.com/@usuario"),
  p("youtube", "YouTube", "siYoutube", "https://youtube.com/@canal"),
  p("twitch", "Twitch", "siTwitch", "https://twitch.tv/usuario"),
  p("kick", "Kick", "siKick", "https://kick.com/usuario"),
  p("instagram", "Instagram", "siInstagram", "https://instagram.com/usuario"),
  p("x", "X (Twitter)", "siX", "https://x.com/usuario"),
  p("threads", "Threads", "siThreads", "https://threads.net/@usuario"),
  p("facebook", "Facebook", "siFacebook", "https://facebook.com/pagina"),
  p("discord", "Discord", "siDiscord", "https://discord.gg/invitacion"),
  p("steam", "Steam", "siSteam", "https://steamcommunity.com/id/usuario"),
  p("spotify", "Spotify", "siSpotify", "https://open.spotify.com/artist/..."),
  p("amazon", "Amazon", "siAmazon", "https://www.amazon.com/shop/usuario"),
  p("mercadolibre", "Mercado Libre", null, "https://www.mercadolibre.com/...", "FFE600"),
  p("shopify", "Shopify", "siShopify", "https://tutienda.myshopify.com"),
  p("etsy", "Etsy", "siEtsy", "https://etsy.com/shop/tienda"),
  p("paypal", "PayPal", "siPaypal", "https://paypal.me/usuario"),
  p("patreon", "Patreon", "siPatreon", "https://patreon.com/usuario"),
  p("kofi", "Ko-fi", "siKofi", "https://ko-fi.com/usuario"),
  p("linkedin", "LinkedIn", "siLinkedin", "https://linkedin.com/in/usuario"),
  p("whatsapp", "WhatsApp", "siWhatsapp", "https://wa.me/5215555555555"),
  p("telegram", "Telegram", "siTelegram", "https://t.me/usuario"),
  p("pinterest", "Pinterest", "siPinterest", "https://pinterest.com/usuario"),
  p("snapchat", "Snapchat", "siSnapchat", "https://snapchat.com/add/usuario"),
  p("github", "GitHub", "siGithub", "https://github.com/usuario"),
  p("web", "Sitio web", null, "https://tusitio.com", "4B5563"),
  p("email", "Correo", null, "mailto:hola@tusitio.com", "4B5563"),
];

export const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map((x) => [x.id, x]));

export function getPlatform(id: string): Platform {
  return PLATFORM_MAP[id] ?? PLATFORM_MAP.web;
}
