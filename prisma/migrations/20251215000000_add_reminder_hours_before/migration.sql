-- Adiciona coluna para guardar o horário do lembrete por template
ALTER TABLE `MessageTemplate`
  ADD COLUMN `reminderHoursBefore` INT NULL;
