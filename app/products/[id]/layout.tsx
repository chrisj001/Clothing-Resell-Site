import { Metadata } from "next";
import { supabase } from "../../../lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  
  const { data: product } = await supabase
    .from("products")
    .select("title, description, brand, condition, era, image_url, price")
    .eq("id", id)
    .single();

  if (!product) {
    return {
      title: "Product Not Found | CJThreads",
    };
  }

  const brandText = product.brand ? `${product.brand} ` : "";
  const eraText = product.era ? `${product.era} ` : "";
  const title = `Vintage ${eraText}${brandText}${product.title} | CJThreads`;
  const description = product.description || `Buy this vintage ${brandText}item in ${product.condition} condition. Shop sustainable secondhand fashion at CJThreads.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.image_url ? [product.image_url] : [],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: product.image_url ? [product.image_url] : [],
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: product } = await supabase
    .from("products")
    .select("title, description, brand, condition, image_url, price, status")
    .eq("id", id)
    .single();

  // Generate JSON-LD Schema
  let jsonLd = null;
  if (product) {
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title,
      "image": product.image_url,
      "description": product.description,
      "brand": {
        "@type": "Brand",
        "name": product.brand || "Vintage"
      },
      "itemCondition": product.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      "offers": {
        "@type": "Offer",
        "url": `https://cjthreads.com/products/${id}`,
        "priceCurrency": "GBP",
        "price": product.price,
        "itemCondition": product.condition === "New" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
        "availability": product.status === "available" ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": "CJThreads"
        }
      }
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
