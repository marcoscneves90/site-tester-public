import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { api } from "./lib/api";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
});

/**
 * Componente que sincroniza meta tags dinâmicas com PUBLIC_URL do backend.
 * Executa uma vez, ao carregar a app.
 */
function MetaTagsSync() {
  const { data: config } = useQuery({
    queryKey: ["config-meta"],
    queryFn: api.getConfig,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!config?.publicUrl) return;

    const base = config.publicUrl.replace(/\/$/, "");

    // og:url
    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute("content", `${base}/`);
    else {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      ogUrl.setAttribute("content", `${base}/`);
      document.head.appendChild(ogUrl);
    }

    // og:image
    let ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) ogImage.setAttribute("content", `${base}/og-image.png`);

    // twitter:image
    let twImage = document.querySelector('meta[name="twitter:image"]');
    if (twImage) twImage.setAttribute("content", `${base}/og-image.png`);

    // canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.setAttribute("href", `${base}/`);
    else {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      canonical.setAttribute("href", `${base}/`);
      document.head.appendChild(canonical);
    }
  }, [config]);

  return null;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MetaTagsSync />
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
