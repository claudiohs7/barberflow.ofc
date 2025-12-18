
// This file is no longer used for the main booking flow and can be removed or repurposed.
// The new public booking flow is handled by /agendar/[slug]/page.tsx.

export default function DeprecatedBookingPage() {
    return (
        <div className="container mx-auto py-12 px-4">
            <h1 className="text-2xl font-bold text-center">Página de Agendamento Desativada</h1>
            <p className="text-center text-muted-foreground mt-2">
                Para agendar, por favor, use o link específico fornecido pela sua barbearia.
            </p>
        </div>
    )
}
