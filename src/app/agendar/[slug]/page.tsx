import { BookingWizard } from "@/components/booking-wizard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PublicBookingPage({
  params,
}: {
  params: { slug: string };
}) {
  const barbershopId = params.slug;

  if (!barbershopId) {
    return (
      <div className="container mx-auto py-12 px-4">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Barbearia não encontrada</CardTitle>
          </CardHeader>
          <CardContent>
            <p>O link que você acessou parece estar inválido. Por favor, verifique o endereço e tente novamente.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <BookingWizard barbershopIdFromSlug={barbershopId} />
    </div>
  );
}
