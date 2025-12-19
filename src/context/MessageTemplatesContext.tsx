
'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { MessageTemplate } from '@/lib/definitions';
import { messageTemplates as initialTemplates } from '@/lib/data';

interface MessageTemplatesContextType {
  messageTemplates: MessageTemplate[];
  setMessageTemplates: React.Dispatch<React.SetStateAction<MessageTemplate[]>>;
}

const MessageTemplatesContext = createContext<MessageTemplatesContextType | undefined>(undefined);

export function MessageTemplatesProvider({ children }: { children: ReactNode }) {
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>(initialTemplates);

  return (
    <MessageTemplatesContext.Provider value={{ messageTemplates, setMessageTemplates }}>
      {children}
    </MessageTemplatesContext.Provider>
  );
}

export function useMessageTemplates() {
  const context = useContext(MessageTemplatesContext);
  if (context === undefined) {
    throw new Error('useMessageTemplates must be used within a MessageTemplatesProvider');
  }
  return context;
}
