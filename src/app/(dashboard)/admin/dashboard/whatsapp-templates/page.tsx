import dynamic from "next/dynamic";

const WhatsAppTemplatesPage = dynamic(() => import("./page.client"), { ssr: false });

export default function Page() {
  return <WhatsAppTemplatesPage />;
}
