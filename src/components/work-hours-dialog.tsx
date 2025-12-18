
"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Clock, Save } from "lucide-react";
import type { Barber, BarberSchedule } from '@/lib/definitions';

interface WorkHoursDialogProps {
  barber: Barber | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (newSchedule: BarberSchedule[]) => void;
}

const weekDays = [
    "Domingo", 
    "Segunda-feira", 
    "Terça-feira", 
    "Quarta-feira", 
    "Quinta-feira", 
    "Sexta-feira", 
    "Sábado"
];

type ScheduleDayState = {
    active: boolean;
    start: string;
    end: string;
    lunchStart: string;
    lunchEnd: string;
};

type ScheduleState = {
    [key: string]: ScheduleDayState;
};

export function WorkHoursDialog({ barber, isOpen, onOpenChange, onSave }: WorkHoursDialogProps) {
  const [schedule, setSchedule] = useState<ScheduleState>({});

  useEffect(() => {
    if (barber) {
        const initialSchedule = weekDays.reduce((acc, day) => {
            const daySchedule = barber.schedule.find(s => s.day === day);
            acc[day] = {
                active: !!daySchedule,
                start: daySchedule?.start || '08:00',
                end: daySchedule?.end || '18:00',
                lunchStart: daySchedule?.lunchTime?.start || '12:00',
                lunchEnd: daySchedule?.lunchTime?.end || '13:00',
            };
            return acc;
        }, {} as ScheduleState);
        setSchedule(initialSchedule);
    }
  }, [barber, isOpen]);

  const handleSwitchChange = (day: string, checked: boolean) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], active: checked }
    }));
  };

  const handleTimeChange = (day: string, type: 'start' | 'end' | 'lunchStart' | 'lunchEnd', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [type]: value }
    }));
  };

  const handleSaveChanges = () => {
    const newSchedule: BarberSchedule[] = Object.entries(schedule)
        .filter(([, details]) => details.active)
        .map(([day, details]) => ({
            day,
            start: details.start,
            end: details.end,
            lunchTime: {
                start: details.lunchStart,
                end: details.lunchEnd,
            }
        }));
    onSave(newSchedule);
  };

  if (!barber) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 font-headline'>
            <Clock className="h-5 w-5" />
            Horários de Trabalho - {barber.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            {weekDays.map(day => (
                <div key={day} className="p-4 rounded-md border bg-muted/50 space-y-3">
                    <div className='flex items-center justify-between'>
                        <Label htmlFor={`switch-${day}`} className="font-medium">{day}</Label>
                        <Switch
                            id={`switch-${day}`}
                            checked={schedule[day]?.active}
                            onCheckedChange={(checked) => handleSwitchChange(day, checked)}
                        />
                    </div>
                     {schedule[day]?.active && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className='space-y-1'>
                                    <Label htmlFor={`start-${day}`} className="text-xs">Início</Label>
                                    <Input 
                                        id={`start-${day}`}
                                        type="time" 
                                        value={schedule[day]?.start}
                                        onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
                                    />
                                </div>
                                <div className='space-y-1'>
                                    <Label htmlFor={`end-${day}`} className="text-xs">Fim</Label>
                                    <Input 
                                        id={`end-${day}`}
                                        type="time" 
                                        value={schedule[day]?.end}
                                        onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Intervalo de Almoço</Label>
                                <div className="flex items-center gap-2">
                                    <Input 
                                        type="time" 
                                        value={schedule[day]?.lunchStart}
                                        onChange={(e) => handleTimeChange(day, 'lunchStart', e.target.value)}
                                    />
                                    <span className="text-sm text-muted-foreground">até</span>
                                    <Input 
                                        type="time" 
                                        value={schedule[day]?.lunchEnd}
                                        onChange={(e) => handleTimeChange(day, 'lunchEnd', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
        <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
            </DialogClose>
          <Button onClick={handleSaveChanges} className='gap-2'>
            <Save className="h-4 w-4" />
            Salvar Horários
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
