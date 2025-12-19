import dynamic from "next/dynamic";

const WhatsAppPage = dynamic(() => import("./page.client"), { ssr: false });

export default function Page() {
  return <WhatsAppPage />;
}
