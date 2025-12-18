const fs = require('fs');
const path = require('path');
const file = path.join('src','app','(dashboard)','admin','dashboard','schedule','page.tsx');
let text = fs.readFileSync(file, 'utf8');
const marker = '  const handleSendWhatsAppMessage = () => {';
const start = text.indexOf(marker);
if (start === -1) throw new Error('marker not found');
const endMarker = '  const handleRegisterGuest';
const end = text.indexOf(endMarker, start);
if (end === -1) throw new Error('end marker not found');
const blockLines = [
  '  const [isSendingWhatsAppMessage, setIsSendingWhatsAppMessage] = useState(false);',
  '',
  '  const handleSendWhatsAppMessage = async () => {',
  '    if (!appointmentToMessage || !manualMessage || !appointmentToMessage.clientPhone || !barbershopId) {',
  '      return;',
  '    }',
  '',
  '    setIsSendingWhatsAppMessage(true);',
  '    try {',
  '      await fetchJson<{ success: boolean; message?: string }>( /api/bitsafira/message/send-message, {',
  '        method: POST,',
  '        headers: { Content-Type: application/json },',
  '        body: JSON.stringify({',
  '          barbershopId,',
  '          number: appointmentToMessage.clientPhone,',
  '          message: manualMessage,',
  '        }),',
  '      });',
  '      toast({',
  '        title: Mensagem enviada,',
  '        description: O WhatsApp irá receber o disparo automaticamente.,',
  '      });',
  '    } catch (error) {',
  '      toast({',
  '        variant: destructive,',
  '        title: Erro ao enviar,',
  '        description: error.message || Não foi possível disparar a mensagem.,',
  '      });',
  '    } finally {',
  '      setIsSendingWhatsAppMessage(false);',
  '      setIsMessageDialogOpen(false);',
  '    }',
  '  };',
];
const newBlock = blockLines.join('\n');
text = text.slice(0, start) + newBlock + '\n' + text.slice(end);
fs.writeFileSync(file, text, 'utf8');
