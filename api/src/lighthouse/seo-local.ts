/**
 * Parser de SEO Local.
 * Extrai dados de localização do HTML (NAP, Schema, Map, Horários).
 */

export interface SeoLocalCheck {
  id: string;
  label: string;
  ok: boolean;
  weight: number; // peso no score
  detail: string;
}

export interface SeoLocalResult {
  score: number;
  checks: SeoLocalCheck[];
  nap: {
    name: string | null;
    address: string | null;
    phone: string | null;
    phoneIsLink: boolean;
  };
  schemaLocalBusiness: {
    present: boolean;
    type: string | null;
    hasAddress: boolean;
    hasPhone: boolean;
    hasOpeningHours: boolean;
    hasRating: boolean;
  };
  mapEmbed: {
    present: boolean;
    provider: string | null;
  };
  socialLinks: {
    facebook: boolean;
    instagram: boolean;
    googleMaps: boolean;
    whatsapp: boolean;
  };
}

/**
 * Extrai nome, endereço, telefone do HTML.
 * Heurística: busca por padrões comuns de NAP em sites de negócios locais.
 */
function extractNps(html: string): SeoLocalResult["nap"] {
  // Telefone: procura link tel: (mais confiável)
  const telLinkMatch = html.match(/href=["']tel:([^"']+)["']/i);
  const phoneIsLink = telLinkMatch !== null;

  // Telefone (texto): padrões brasileiros (11) 99999-9999, (11) 9999-9999, etc
  const phoneRegex = /\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}/g;
  const phoneMatches = html.match(phoneRegex) ?? [];
  const phoneFromText = phoneMatches[0]?.trim() ?? null;

  const phone = telLinkMatch
    ? telLinkMatch[1].replace(/^\+?55/, "").trim()
    : phoneFromText;

  // Endereço: procura por padrões de CEP brasileiro
  const cepRegex = /\d{5}-?\d{3}/;
  const cepMatch = html.match(cepRegex);
  const hasCep = cepMatch !== null;

  // Extrai o trecho próximo ao CEP como "endereço"
  let address: string | null = null;
  if (hasCep && cepMatch) {
    const idx = html.indexOf(cepMatch[0]);
    const start = Math.max(0, idx - 200);
    const end = Math.min(html.length, idx + 50);
    const snippet = html.slice(start, end);
    // Remove tags HTML pra pegar só texto
    const text = snippet.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    // Pega os últimos 150 chars (antes do CEP)
    address = text.slice(-150);
  }

  return {
    name: null, // difícil extrair sem schema
    address,
    phone,
    phoneIsLink,
  };
}

/**
 * Extrai JSON-LD de LocalBusiness.
 */
function extractLocalBusinessSchema(html: string): SeoLocalResult["schemaLocalBusiness"] {
  const jsonLdMatches = [
    ...html.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    ),
  ];

  const localBusinessTypes = [
    "LocalBusiness",
    "Restaurant",
    "Store",
    "Dentist",
    "LegalService",
    "MedicalBusiness",
    "ProfessionalService",
    "HomeAndConstructionBusiness",
    "AutomotiveBusiness",
    "HealthAndBeautyBusiness",
    "SportsActivityLocation",
    "LodgingBusiness",
    "FinancialService",
    "RealEstateAgent",
    "TravelAgency",
  ];

  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        const type = item["@type"];
        if (
          typeof type === "string" &&
          localBusinessTypes.includes(type)
        ) {
          return {
            present: true,
            type,
            hasAddress: !!item.address,
            hasPhone: !!item.telephone,
            hasOpeningHours:
              !!item.openingHours || !!item.openingHoursSpecification,
            hasRating: !!item.aggregateRating,
          };
        }
      }
    } catch {
      /* ignora JSON-LD inválido */
    }
  }

  return {
    present: false,
    type: null,
    hasAddress: false,
    hasPhone: false,
    hasOpeningHours: false,
    hasRating: false,
  };
}

/**
 * Detecta mapa incorporado.
 */
function extractMapEmbed(html: string): SeoLocalResult["mapEmbed"] {
  // Google Maps iframe
  if (/<iframe[^>]*src=["'][^"']*google\.com\/maps/i.test(html)) {
    return { present: true, provider: "Google Maps" };
  }
  // OpenStreetMap
  if (/<iframe[^>]*src=["'][^"']*openstreetmap\.org/i.test(html)) {
    return { present: true, provider: "OpenStreetMap" };
  }
  // Apple Maps
  if (/<iframe[^>]*src=["'][^"']*maps\.apple\.com/i.test(html)) {
    return { present: true, provider: "Apple Maps" };
  }
  // Link pro Google Maps (menos ideal que embed)
  if (/href=["'][^"']*google\.com\/maps/i.test(html)) {
    return { present: true, provider: "Google Maps (link)" };
  }

  return { present: false, provider: null };
}

/**
 * Detecta links de redes sociais (relevantes pra SEO local).
 */
function extractSocialLinks(html: string): SeoLocalResult["socialLinks"] {
  return {
    facebook: /href=["'][^"']*facebook\.com/i.test(html),
    instagram: /href=["'][^"']*instagram\.com/i.test(html),
    googleMaps: /href=["'][^"']*google\.com\/maps/i.test(html),
    whatsapp: /href=["'][^"']*wa\.me|whatsapp\.com/i.test(html),
  };
}

/**
 * Função principal: recebe HTML + URL, retorna análise completa.
 */
export function analyzeSeoLocal(html: string): SeoLocalResult {
  const nap = extractNps(html);
  const schema = extractLocalBusinessSchema(html);
  const mapEmbed = extractMapEmbed(html);
  const socialLinks = extractSocialLinks(html);

  const checks: SeoLocalCheck[] = [
    {
      id: "schema-localbusiness",
      label: "Schema LocalBusiness",
      ok: schema.present,
      weight: 25,
      detail: schema.present
        ? `Presente (${schema.type})`
        : "Ausente — Google não sabe que é negócio local",
    },
    {
      id: "schema-address",
      label: "Endereço no Schema",
      ok: schema.hasAddress,
      weight: 10,
      detail: schema.hasAddress
        ? "Endereço estruturado"
        : schema.present
        ? "Schema presente, mas sem endereço"
        : "Adicione endereço no Schema LocalBusiness",
    },
    {
      id: "schema-phone",
      label: "Telefone no Schema",
      ok: schema.hasPhone,
      weight: 10,
      detail: schema.hasPhone
        ? "Telefone estruturado"
        : "Adicione telephone no Schema",
    },
    {
      id: "schema-hours",
      label: "Horário no Schema",
      ok: schema.hasOpeningHours,
      weight: 10,
      detail: schema.hasOpeningHours
        ? "Horário estruturado"
        : "Adicione openingHours no Schema",
    },
    {
      id: "schema-rating",
      label: "Rating no Schema",
      ok: schema.hasRating,
      weight: 5,
      detail: schema.hasRating
        ? "Avaliação estruturada (rich snippet)"
        : "Opcional — melhora CTR nos resultados",
    },
    {
      id: "tel-link",
      label: "Telefone clicável (tel:)",
      ok: nap.phoneIsLink,
      weight: 10,
      detail: nap.phoneIsLink
        ? "Link tel: presente"
        : "Envolva o telefone em <a href='tel:'>",
    },
    {
      id: "map-embed",
      label: "Mapa incorporado",
      ok: mapEmbed.present,
      weight: 10,
      detail: mapEmbed.present
        ? `Presente (${mapEmbed.provider})`
        : "Adicione iframe do Google Maps",
    },
    {
      id: "social-links",
      label: "Redes sociais",
      ok:
        socialLinks.facebook ||
        socialLinks.instagram ||
        socialLinks.googleMaps ||
        socialLinks.whatsapp,
      weight: 10,
      detail:
        socialLinks.facebook || socialLinks.instagram
          ? "Links presentes"
          : "Adicione links pra redes sociais",
    },
    {
      id: "cep",
      label: "CEP no endereço",
      ok: nap.address !== null,
      weight: 10,
      detail: nap.address !== null
        ? "CEP detectado no HTML"
        : "Endereço com CEP não encontrado",
    },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = checks
    .filter((c) => c.ok)
    .reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return {
    score,
    checks,
    nap,
    schemaLocalBusiness: schema,
    mapEmbed,
    socialLinks,
  };
}
