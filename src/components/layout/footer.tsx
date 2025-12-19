
import Link from "next/link";
import { Logo } from "@/components/icons/logo";
import { WhatsAppIcon } from "../icons/whatsapp-icon";

export function Footer() {
    return (
        <>
        <footer className="bg-card border-t border-white/10">
            <div className="container py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-4 md:col-span-1">
                         <Link href="/" className="flex items-center gap-2">
                            <Logo className="h-7 w-7 text-primary" />
                            <span className="text-lg font-semibold font-headline">BarberFlow</span>
                        </Link>
                        <p className="text-muted-foreground text-sm">
                            A forma moderna de gerenciar sua barbearia.
                        </p>
                    </div>
                    <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="font-semibold text-foreground">Navegação</h3>
                            <ul className="mt-4 space-y-2">
                                <li><Link href="/#features" className="text-sm text-muted-foreground hover:text-primary">Funcionalidades</Link></li>
                                <li><Link href="/#pricing" className="text-sm text-muted-foreground hover:text-primary">Preços</Link></li>
                                <li><Link href="/#how-it-works" className="text-sm text-muted-foreground hover:text-primary">Como Funciona</Link></li>
                            </ul>
                        </div>
                         <div>
                            <h3 className="font-semibold text-foreground">Suporte</h3>
                            <ul className="mt-4 space-y-2">
                                <li><a href="mailto:contato@barberflow.com" className="text-sm text-muted-foreground hover:text-primary">Contato</a></li>
                                <li><Link href="/#faq" className="text-sm text-muted-foreground hover:text-primary">FAQ</Link></li>
                            </ul>
                        </div>
                         <div>
                            <h3 className="font-semibold text-foreground">Legal</h3>
                            <ul className="mt-4 space-y-2">
                                <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary">Termos de Serviço</Link></li>
                                <li><Link href="#" className="text-sm text-muted-foreground hover:text-primary">Política de Privacidade</Link></li>
                            </ul>
                        </div>
                    </div>
                </div>
                <div className="mt-12 border-t border-white/10 pt-8 flex items-center justify-between">
                     <p className="text-sm text-muted-foreground">
                       &copy; {new Date().getFullYear()} BarberFlow. Todos os direitos reservados.
                    </p>
                </div>
            </div>
        </footer>
         <Link
            href="https://wa.me/5531994371680"
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition-transform hover:scale-110"
            aria-label="Fale Conosco no WhatsApp"
        >
            <WhatsAppIcon className="h-8 w-8" />
        </Link>
      </>
    )
}
