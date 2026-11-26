// Configuración de Google AdSense. Sin ADSENSE_CLIENT no se muestra ningún anuncio.
// Solo bloques manuales (nunca "Anuncios automáticos"), en dos sitios poco invasivos.

export type AdPlacement = "profile" | "home";

export function adsConfig() {
  const client = process.env.ADSENSE_CLIENT?.trim(); // ca-pub-XXXXXXXXXXXXXXXX
  if (!client || !/^ca-pub-\d{10,20}$/.test(client)) return null;
  return {
    client,
    slots: { profile: process.env.ADSENSE_SLOT_PROFILE?.trim() ?? "", home: process.env.ADSENSE_SLOT_HOME?.trim() ?? "" } as Record<AdPlacement, string>,
    test: process.env.ADSENSE_TEST === "1", // anuncios de prueba (no cuentan) para revisar la maqueta
  };
}

export function adSlotFor(placement: AdPlacement) {
  const cfg = adsConfig();
  const slot = cfg?.slots[placement];
  return cfg && slot && /^\d{5,20}$/.test(slot) ? { client: cfg.client, slot, test: cfg.test } : null;
}
