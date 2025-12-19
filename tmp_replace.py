from pathlib import Path
path = Path('src/app/(dashboard)/admin/dashboard/schedule/page.tsx')
text = path.read_text()
old = '''  const handleSendWhatsAppMessage = () => {
    if (!appointmentToMessage || !manualMessage || !appointmentToMessage.clientPhone) return;
    const cleanedPhone = appointmentToMessage.clientPhone.replace(/\D/g, );
 const encodedMessage = encodeURIComponent(manualMessage);
 window.open(https://wa.me/55?text=,  _blank);
 toast({ title: Abrindo WhatsApp, description: A mensagem está pronta para ser enviada. });
 setIsMessageDialogOpen(false);
 };
'''
new = ''' const [isSendingWhatsAppMessage, setIsSendingWhatsAppMessage] = useState(false);

 const handleSendWhatsAppMessage = async () => {
 if (!appointmentToMessage || !manualMessage || !appointmentToMessage.clientPhone || !barbershopId) {
 return;
 }

 setIsSendingWhatsAppMessage(true);
 try {
 await fetchJson<{ success: boolean; message?: string }>(/api/bitsafira/message/send-message, {
 method: POST,
 headers: { Content-Type: application/json },
 body: JSON.stringify({
 barbershopId,
 number: appointmentToMessage.clientPhone,
 message: manualMessage,
 }),
 });
 toast({
 title: Mensagem enviada,
 description: O WhatsApp irá receber o disparo automaticamente.,
 });
 } catch (error: any) {
 toast({
 variant: destructive,
 title: Erro ao enviar,
 description: error.message || Não foi possível disparar a mensagem.,
 });
 } finally {
 setIsSendingWhatsAppMessage(false);
 setIsMessageDialogOpen(false);
 }
 };
'''
if old not in text:
 raise SystemExit('old block not found')
path.write_text(text.replace(old, new, 1))
