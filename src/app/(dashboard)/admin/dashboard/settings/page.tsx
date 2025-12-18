
"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Crown, Sparkles, Edit, Save, Lock, Upload, Check, AlertCircle, ShoppingCart, Copy, Loader2, Info, QrCode, Eye, EyeOff, Building, CreditCard } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { fetchJson, setAccessToken } from "@/lib/fetcher";
import type { AuthUser, Barbershop } from "@/lib/definitions";
import { useBarbershopId } from "@/context/BarbershopIdContext";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { differenceInDays, startOfDay, format, isBefore } from "date-fns";
import { formatCurrency, capitalizeWords } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";


type OperatingHoursState = {
  [key: string]: {
    active: boolean;
    open: string;
    close: string;
  };
};

const weekDays = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const DEFAULT_OPEN_TIME = "08:00";
const DEFAULT_CLOSE_TIME = "18:00";

const formatCpfCnpjValue = (value: string) => {
  const raw = value.replace(/\D/g, "");
  if (raw.length <= 11) {
    return raw
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return raw
    .substring(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

const planPrices = {
    'Básico': 49.90,
    'Premium': 119.90,
};


const digitsOnly = (value: string) => value.replace(/\D/g, "");
const isSequentialDigits = (value: string) => /^(\d)\1+$/.test(value);

const isValidCpf = (value: string) => {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || isSequentialDigits(cpf)) return false;

  const calcDigit = (slice: number) => {
    const sum = cpf
      .slice(0, slice)
      .split("")
      .reduce((acc, num, idx) => acc + parseInt(num, 10) * (slice + 1 - idx), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const digit1 = calcDigit(9);
  const digit2 = calcDigit(10);

  return digit1 === parseInt(cpf[9], 10) && digit2 === parseInt(cpf[10], 10);
};

const isValidCnpj = (value: string) => {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || isSequentialDigits(cnpj)) return false;

  const calcDigit = (slice: number) => {
    const factors = slice === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = cnpj
      .slice(0, slice)
      .split("")
      .reduce((acc, num, idx) => acc + parseInt(num, 10) * factors[idx], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const digit1 = calcDigit(12);
  const digit2 = calcDigit(13);

  return digit1 === parseInt(cnpj[12], 10) && digit2 === parseInt(cnpj[13], 10);
};

const validateCpfCnpj = (value: string) => {
  const clean = digitsOnly(value);
  if (!clean) return { valid: false, type: null as "CPF" | "CNPJ" | null };
  if (clean.length === 11) return { valid: isValidCpf(clean), type: "CPF" as const };
  if (clean.length === 14) return { valid: isValidCnpj(clean), type: "CNPJ" as const };
  return { valid: false, type: null as "CPF" | "CNPJ" | null };
};

const normalizeDay = (value: string) =>
  value?.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "") || "";

const createDefaultScheduleState = () =>
  weekDays.reduce((acc, day) => {
    acc[day] = { active: false, open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME };
    return acc;
  }, {} as OperatingHoursState);

const mapOperatingHoursToState = (shop: Barbershop | null) => {
  const base = createDefaultScheduleState();
  if (!shop?.operatingHours) return base;

  return weekDays.reduce((acc, day) => {
    const daySchedule = shop.operatingHours.find(
      (h: { day: string }) => normalizeDay(h.day) === normalizeDay(day)
    );
    const open = daySchedule?.open && daySchedule.open !== "closed"
      ? daySchedule.open
      : DEFAULT_OPEN_TIME;
    const close = daySchedule?.close && daySchedule.close !== "closed"
      ? daySchedule.close
      : DEFAULT_CLOSE_TIME;

    acc[day] = {
      active: !!daySchedule && daySchedule.open !== "closed",
      open,
      close,
    };
    return acc;
  }, base);
};

const initialScheduleState = createDefaultScheduleState();

export default function SettingsPage() {
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const { barbershopId, isLoading: isBarbershopIdLoading } = useBarbershopId();
  const [barbershopData, setBarbershopData] = useState<Barbershop | null>(null);
  const [isLoadingBarbershop, setIsLoadingBarbershop] = useState(true);
  const [isSecurityUpdating, setIsSecurityUpdating] = useState(false);

  const isSuperAdmin = user?.email === 'claudiohs@hotmail.com';

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);
  const [isCropDialogOpen, setIsCropDialogOpen] = useState(false);
  const [rawLogoImage, setRawLogoImage] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [rawLogoDims, setRawLogoDims] = useState<{ w: number; h: number } | null>(null);
  
  // State for form edits, only holds data while editing.
  const [formState, setFormState] = useState<Partial<Barbershop>>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cpfCnpjError, setCpfCnpjError] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<OperatingHoursState>(initialScheduleState);
  useEffect(() => {
    setSchedule(mapOperatingHoursToState(barbershopData));
  }, [barbershopData]);
  
  const [userEmail, setUserEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const parseErrorMessage = (err: any) => {
    const raw = err?.message || err?.toString?.() || "";
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.error) return String(parsed.error);
    } catch {
      /* ignore */
    }
    return raw || "Não foi possível atualizar a barbearia.";
  };

  const fetchBarbershop = useCallback(async () => {
    if (!barbershopId) {
      setBarbershopData(null);
      setIsLoadingBarbershop(false);
      return null;
    }

    setIsLoadingBarbershop(true);
    try {
      const response = await fetchJson<{ data: Barbershop }>(`/api/barbershops/${encodeURIComponent(barbershopId)}`);
      const shop = response.data ?? null;
      setBarbershopData(shop);
      return shop;
    } catch (error: any) {
      const message = error.message || "Erro ao carregar os dados da barbearia.";
      toast({
        variant: "destructive",
        title: "Erro ao carregar barbearia",
        description: message,
      });
      return null;
    } finally {
      setIsLoadingBarbershop(false);
    }
  }, [barbershopId, toast]);

  useEffect(() => {
    if (!barbershopId) {
      setBarbershopData(null);
      setIsLoadingBarbershop(false);
      return;
    }
    void fetchBarbershop();
  }, [barbershopId, fetchBarbershop]);

  useEffect(() => {
    if (!isEditingSecurity && user?.email) {
      setUserEmail(user.email);
    }
  }, [user, isEditingSecurity]);

  // Function to initialize editing state
  const startEditing = (section: 'info' | 'address' | 'security') => {
    if (!barbershopData) return;
    
    setFormState({
      ...barbershopData,
      cpfCnpj: barbershopData.cpfCnpj ? formatCpfCnpjValue(barbershopData.cpfCnpj) : barbershopData.cpfCnpj,
    });
    setLogoPreview(barbershopData.logoUrl || null);

    const initialSchedule = weekDays.reduce((acc, day) => {
        const daySchedule = barbershopData.operatingHours?.find(
          (h: { day: string }) => normalizeDay(h.day) === normalizeDay(day)
        );
        const open = daySchedule?.open && daySchedule.open !== "closed"
          ? daySchedule.open
          : DEFAULT_OPEN_TIME;
        const close = daySchedule?.close && daySchedule.close !== "closed"
          ? daySchedule.close
          : DEFAULT_CLOSE_TIME;
        acc[day] = {
          active: !!daySchedule && daySchedule.open !== "closed",
          open,
          close,
        };
        return acc;
    }, {} as OperatingHoursState);
    setSchedule(initialSchedule);

    if (user?.email) setUserEmail(user.email);
    
    if (section === 'info') {
      const { valid, type } = validateCpfCnpj(barbershopData.cpfCnpj || "");
      setCpfCnpjError(valid || !barbershopData.cpfCnpj ? null : type ? `${type} inválido` : "CPF/CNPJ inválido");
      setIsEditingInfo(true);
    } else if (section === 'address') {
      setIsEditingAddress(true);
    } else if (section === 'security') {
      setIsEditingSecurity(true);
    }
  };

  const formCep = formState.address?.cep || '';
  
  const handleFormChange = useCallback((fieldName: keyof Barbershop, value: any) => {
    setFormState(prev => ({ ...prev, [fieldName]: value }));
  }, []);

  useEffect(() => {
    const fetchAddress = async () => {
      if (!isEditingAddress) return;
      const cleanedCep = formCep.replace(/\D/g, "");
      if (cleanedCep.length === 8) {
        try {
          const response = await fetch(`/api/cep/${cleanedCep}`);
          const data = await response.json();
          if (!data.error) {
            handleFormChange("address", {
                ...formState.address,
                street: data.street,
                neighborhood: data.neighborhood,
                city: data.city,
                state: data.state,
            });
          } else {
             toast({ variant: "destructive", title: "Erro de CEP", description: data.error });
          }
        } catch (error) {
          console.error("Failed to fetch address:", error);
          toast({ variant: "destructive", title: "Erro de Rede", description: "Não foi possível buscar o endereço." });
        }
      }
    };
    fetchAddress();
  }, [formCep, isEditingAddress]);

  const formCpfCnpj = formState.cpfCnpj || '';
  const fetchCompanyData = useCallback(
    async (cleanedCnpj: string) => {
      if (!isEditingInfo || cleanedCnpj.length !== 14) return;
      try {
        const response = await fetch(`/api/cnpj/${cleanedCnpj}`);
        const data = await response.json();
        if (!data.error) {
          setFormState(prev => ({
            ...prev,
            legalName: data.razao_social || prev.legalName,
            name: data.nome_fantasia || prev.name,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch CNPJ data:", error);
      }
    },
    [isEditingInfo]
  );

  useEffect(() => {
    const cleanedCnpj = formCpfCnpj.replace(/\D/g, "");
    if (cleanedCnpj.length === 14) {
      void fetchCompanyData(cleanedCnpj);
    }
  }, [formCpfCnpj, fetchCompanyData]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isEditingInfo) return;
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setRawLogoImage(dataUrl);
        setCropZoom(1);
        setIsCropDialogOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!rawLogoImage) {
      setRawLogoDims(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setRawLogoDims({ w: img.width, h: img.height });
    };
    img.src = rawLogoImage;
  }, [rawLogoImage]);

  const resetCropState = () => {
    setIsCropDialogOpen(false);
    setRawLogoImage(null);
    setCropZoom(1);
    setRawLogoDims(null);
  };

  const handleApplyLogoCrop = async () => {
    if (!rawLogoImage || !rawLogoDims) {
      resetCropState();
      return;
    }
    const img = new Image();
    img.src = rawLogoImage;
    await new Promise((resolve) => {
      img.onload = resolve;
    });
    const canvasSize = 400;
    const canvas = document.createElement("canvas");
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      resetCropState();
      return;
    }
    const { w, h } = rawLogoDims;
    const cropSize = Math.min(w, h) / cropZoom;
    const sx = (w - cropSize) / 2;
    const sy = (h - cropSize) / 2;
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, canvasSize, canvasSize);
    const dataUrl = canvas.toDataURL("image/png");
    setLogoPreview(dataUrl);
    handleFormChange("logoUrl", dataUrl);
    resetCropState();
  };

  const persistOperatingHours = useCallback(
    async (nextSchedule: OperatingHoursState) => {
      if (!barbershopId) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Usuario nao autenticado.",
        });
        return;
      }

      const isValidTime = (value?: string) => !!value && /^\d{2}:\d{2}$/.test(value);
      const invalidDay = weekDays.find((day) => {
        const daySchedule = nextSchedule[day];
        return daySchedule?.active && (!isValidTime(daySchedule.open) || !isValidTime(daySchedule.close));
      });
      if (invalidDay) {
        toast({
          variant: "destructive",
          title: "Coloque o horario de funcionamento para salvar",
          description: `Preencha abertura e fechamento em ${invalidDay}.`,
        });
        return;
      }

      const nextOperatingHours = weekDays.map((day) => {
        const daySchedule = nextSchedule[day];
        return {
          day,
          open: daySchedule?.active ? daySchedule.open : "closed",
          close: daySchedule?.active ? daySchedule.close : "closed",
        };
      });

      try {
        await fetchJson(`/api/barbershops/${barbershopId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operatingHours: nextOperatingHours }),
        });
        const updatedShop = barbershopData
          ? { ...barbershopData, operatingHours: nextOperatingHours as any }
          : null;

        if (updatedShop) {
          setBarbershopData(updatedShop);
          try {
            window.dispatchEvent(new CustomEvent("barbershop-updated", { detail: updatedShop }));
            localStorage.setItem("barbershop-updated", JSON.stringify({ ...updatedShop, _ts: Date.now() }));
          } catch (error) {
            console.warn("Nao foi possivel propagar atualizacao da barbearia:", error);
          }
        }
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar configuracoes",
          description: error.message || "Nao foi possivel atualizar a barbearia.",
        });
      }
    },
    [barbershopId, toast, barbershopData]
  );

  const handleScheduleChange = useCallback(
    (day: string, updates: Partial<OperatingHoursState[string]>) => {
      setSchedule((prev) => {
        const currentDay = prev[day] || { active: false, open: DEFAULT_OPEN_TIME, close: DEFAULT_CLOSE_TIME };
        const nextState = { ...prev, [day]: { ...currentDay, ...updates } };
        void persistOperatingHours(nextState);
        return nextState;
      });
    },
    [persistOperatingHours]
  );

  const handleSaveChanges = async (section: 'info' | 'address') => {
    if (!barbershopId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuario nao autenticado.",
      });
      return;
    }

    let payload: Partial<Barbershop> = {};

    if (section === 'info') {
      const { valid, type } = validateCpfCnpj(formState.cpfCnpj || "");
      if (!valid) {
        const message = type ? `${type} inválido` : "CPF/CNPJ inválido";
        setCpfCnpjError(message);
        toast({
          variant: "destructive",
          title: "Documento inválido",
          description: "Informe um CPF ou CNPJ válido para salvar.",
        });
        return;
      }

      payload = {
        name: formState.name,
        legalName: formState.legalName,
        phone: formState.phone,
        cpfCnpj: formState.cpfCnpj,
      };
      const logoToSave = logoPreview ?? barbershopData?.logoUrl;
      if (logoToSave) {
        payload.logoUrl = logoToSave;
      }
    } else if (section === 'address') {
      const address = formState.address || {};
      const cleanedCep = (address.cep || "").replace(/\D/g, "");
      const street = address.street?.toString().trim() || "";
      const number = address.number?.toString().trim() || "";
      const neighborhood = address.neighborhood?.toString().trim() || "";
      const city = address.city?.toString().trim() || "";
      const state = address.state?.toString().trim() || "";

      if (
        !cleanedCep ||
        cleanedCep.length !== 8 ||
        !street ||
        !number ||
        !neighborhood ||
        !city ||
        !state
      ) {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Preencha CEP, rua, número, bairro, cidade e estado.",
        });
        return;
      }

      payload = {
        address: {
          ...address,
          cep: cleanedCep.replace(/^(\d{5})(\d{3})$/, "$1-$2"),
          street,
          number,
          neighborhood,
          city,
          state,
        },
      };
    }

    try {
      await fetchJson(`/api/barbershops/${barbershopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast({
        title: "Configuracoes salvas!",
        description: "As informacoes da sua barbearia foram atualizadas.",
      });
      const updatedShop = await fetchBarbershop();
      if (updatedShop) {
        try {
          window.dispatchEvent(new CustomEvent("barbershop-updated", { detail: updatedShop }));
          localStorage.setItem("barbershop-updated", JSON.stringify({ ...updatedShop, _ts: Date.now() }));
        } catch (error) {
          console.warn("Nao foi possivel propagar atualizacao da barbearia:", error);
        }
      }
      setFormState({});
      if (section === 'info') {
        setIsEditingInfo(false);
        setLogoPreview(null);
        setCpfCnpjError(null);
      } else if (section === 'address') {
        setIsEditingAddress(false);
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar configuracoes",
        description: parseErrorMessage(error),
      });
    }
  };

  const handleSecurityChanges = async () => {
    if (!user || !barbershopId) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você não está logado.",
      });
      return;
    }

    const passwordChanged = newPassword !== "";

    if (!passwordChanged) {
      toast({
        title: "Nenhuma alteração",
        description: "Nenhuma alteração de senha foi detectada.",
      });
      setIsEditingSecurity(false);
      return;
    }

    if (passwordChanged && newPassword !== confirmNewPassword) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "A nova senha e a confirmação não são iguais.",
      });
      return;
    }

    if (!currentPassword) {
      toast({
        variant: "destructive",
        title: "Senha necessária",
        description: "Você deve fornecer sua senha atual para fazer alterações.",
      });
      return;
    }

    setIsSecurityUpdating(true);
    try {
      const body: { currentPassword: string; newPassword?: string } = {
        currentPassword,
      };
      if (passwordChanged) {
        body.newPassword = newPassword;
      }

      const response = await fetchJson<{
        data: { user: AuthUser; accessToken: string };
      }>("/api/auth/update-profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      setAccessToken(response.data.accessToken);
      await refreshUser();
      toast({
        title: "Segurança atualizada!",
        description: "Suas credenciais foram sincronizadas.",
      });
      setIsEditingSecurity(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      const description =
        error.message || "Não foi possível atualizar seus dados de segurança.";
      toast({
        variant: "destructive",
        title: "Falha na atualização de segurança",
        description,
      });
    } finally {
      setIsSecurityUpdating(false);
    }
  };

  const handleCancelEdit = (section: 'info' | 'address' | 'security') => {
    if (section === 'info') {
      setIsEditingInfo(false);
      setCpfCnpjError(null);
    }
    else if (section === 'address') setIsEditingAddress(false);
    else if (section === 'security') {
        setIsEditingSecurity(false);
        if (user?.email) setUserEmail(user.email);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
    }
    setFormState({}); // Clear editing state
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'phone') {
        let phoneValue = value.replace(/\D/g, '');
        phoneValue = phoneValue.replace(/^(\d{2})(\d)/g, '($1) $2');
        phoneValue = phoneValue.replace(/(\d{5})(\d)/, '$1-$2');
        if (phoneValue.length > 15) phoneValue = phoneValue.substring(0, 15);
        finalValue = phoneValue;
    } else if (name === 'cpfCnpj') {
        const raw = value.replace(/\D/g, '');
        let formatted = raw;
        if (formatted.length <= 11) {
            formatted = formatted.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            formatted = formatted.substring(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
        }

        const { valid, type } = validateCpfCnpj(raw);
        if (!raw) {
          setCpfCnpjError(null);
        } else if (raw.length !== 11 && raw.length !== 14) {
          setCpfCnpjError("CPF/CNPJ incompleto");
        } else if (!valid) {
          setCpfCnpjError(type ? `${type} inválido` : "CPF/CNPJ inválido");
        } else {
          setCpfCnpjError(null);
        }

        if (isEditingInfo && raw.length === 14) {
          void fetchCompanyData(raw);
        }

        finalValue = formatted;
    } else if (name === 'cep') {
        let cepValue = value.replace(/\D/g, "").replace(/^(\d{5})(\d)/, "$1-$2");
        if (cepValue.length > 9) cepValue = cepValue.substring(0, 9);
        finalValue = cepValue;
    } else if (name === "address.number") {
        const digits = value.replace(/\D/g, "").slice(0, 7);
        finalValue = digits;
    } else if (name === 'name' || name === 'legalName') {
        finalValue = capitalizeWords(value);
    }
     if (name.includes('.')) {
        const [parent, child] = name.split('.');
        handleFormChange(parent as keyof Barbershop, { ...formState[parent as keyof Barbershop], [child]: finalValue });
    } else {
        handleFormChange(name as keyof Barbershop, finalValue);
    }
  };
  
  if (isBarbershopIdLoading || isLoadingBarbershop) {
      return <div className="p-6">Carregando configurações...</div>;
  }
  
  const infoData = isEditingInfo ? formState : barbershopData;
  const addressData = isEditingAddress ? formState.address : barbershopData?.address;

  const displayHours = weekDays.map((day) => ({
    day,
    ...schedule[day],
  }));


  return (
    <>
      <Dialog open={isCropDialogOpen} onOpenChange={(open) => { if (!open) resetCropState(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recortar Logo</DialogTitle>
            <DialogDescription>Use o zoom para ajustar o recorte quadrado da logo.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative w-full aspect-square bg-slate-900 rounded-lg overflow-hidden border border-slate-700">
              {rawLogoImage ? (
                <img
                  src={rawLogoImage}
                  alt="Prévia da logo"
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ transform: `scale(${cropZoom})`, transformOrigin: "center" }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">Selecione uma imagem</div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="crop-zoom">Zoom</Label>
              <Input
                id="crop-zoom"
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={resetCropState}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleApplyLogoCrop} disabled={!rawLogoImage}>Aplicar recorte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5"/>Informações da Barbearia</CardTitle>
              <CardDescription>
                Edite os dados principais da sua barbearia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="flex-shrink-0">
                    <Label>Logo da Barbearia</Label>
                    <div className="relative group mt-2">
                        <Avatar className="h-32 w-32 border-2 border-solid border-blue-500 p-1">
                        <AvatarImage src={logoPreview || barbershopData?.logoUrl} />
                        <AvatarFallback>
                            <Building className="h-12 w-12 text-muted-foreground" />
                        </AvatarFallback>
                        </Avatar>
                        {isEditingInfo && (
                        <label htmlFor="logo-upload" className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="h-6 w-6" />
                        </label>
                        )}
                        <Input id="logo-upload" type="file" onChange={handleLogoChange} className="sr-only" accept="image/*" disabled={!isEditingInfo} />
                    </div>
                </div>
                <div className="space-y-4 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="shop-name">Nome da Barbearia (Nome Fantasia)</Label>
                    <Input id="shop-name" name="name" value={infoData?.name || ''} onChange={handleInputChange} disabled={!isEditingInfo} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="legal-name">Nome/Empresa (Razão Social ou Proprietário)</Label>
                    <Input id="legal-name" name="legalName" value={infoData?.legalName || ''} onChange={handleInputChange} disabled={!isEditingInfo} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shop-phone">WhatsApp Principal</Label>
                    <Input id="shop-phone" name="phone" value={infoData?.phone || ''} onChange={handleInputChange} maxLength={16} disabled={!isEditingInfo} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="shop-cpf-cnpj">CPF/CNPJ</Label>
                      <Input
                        id="shop-cpf-cnpj"
                        name="cpfCnpj"
                        value={infoData?.cpfCnpj ? formatCpfCnpjValue(infoData.cpfCnpj) : ''}
                        onChange={handleInputChange}
                        disabled={!isEditingInfo}
                        placeholder="Seu CPF ou CNPJ"
                      />
                      {cpfCnpjError && <p className="text-sm text-destructive">{cpfCnpjError}</p>}
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              {isEditingInfo ? (
                <div className="flex gap-2">
                  <Button onClick={() => handleSaveChanges('info')} className="hover:bg-[#044a7b]"><Save className="mr-2 h-4 w-4"/>Salvar</Button>
                  <Button variant="ghost" onClick={() => handleCancelEdit('info')}>Cancelar</Button>
                </div>
              ) : (
                <Button onClick={() => startEditing('info')} className="hover:bg-[#044a7b]"><Edit className="mr-2 h-4 w-4"/>Editar Informações</Button>
              )}
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Horario de Funcionamento</CardTitle>
                <CardDescription>
                Defina os dias e horarios que sua barbearia estara aberta.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {displayHours.map((day) => (
                <div key={day.day} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-3 gap-4 sm:gap-2">
                    <div className="flex items-center gap-4 flex-1">
                        <Switch
                            id={`switch-${day.day}`}
                            checked={day.active}
                            onCheckedChange={(checked) => handleScheduleChange(day.day, { active: checked })}
                            aria-label={`Ativar ${day.day}`}
                        />
                        <Label htmlFor={`switch-${day.day}`} className="w-24 font-medium">
                            {day.day}
                        </Label>
                    </div>
                    {day.active ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Input
                            type="time"
                            className="w-full sm:w-28"
                            value={day.open}
                            onChange={(e) => handleScheduleChange(day.day, { open: e.target.value })}
                        />
                        <span className="text-sm text-muted-foreground">ate</span>
                        <Input
                            type="time"
                            className="w-full sm:w-28"
                            value={day.close}
                            onChange={(e) => handleScheduleChange(day.day, { close: e.target.value })}
                        />
                        </div>
                    ) : (
                        <Badge variant="destructive">FECHADO</Badge>
                    )}
                </div>
                ))}
            </CardContent>
            </Card>
        </div>

        <div className="flex flex-col gap-6">
           <Card>
            <CardHeader>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>
                Informe o endereço físico da sua barbearia.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="cep">CEP</Label>
                    <Input id="cep" name="address.cep" value={addressData?.cep || ''} onChange={handleInputChange} maxLength={9} disabled={!isEditingAddress} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="street">Rua</Label>
                    <Input id="street" name="address.street" value={addressData?.street || ''} onChange={handleInputChange} disabled={!isEditingAddress} />
                </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-1">
                    <Label htmlFor="number">Número</Label>
                    <Input id="number" name="address.number" value={addressData?.number || ''} onChange={handleInputChange} disabled={!isEditingAddress} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="complement">Complemento (Opcional)</Label>
                    <Input id="complement" name="address.complement" value={addressData?.complement || ''} onChange={handleInputChange} disabled={!isEditingAddress} />
                </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="neighborhood">Bairro</Label>
                    <Input id="neighborhood" name="address.neighborhood" value={addressData?.neighborhood || ''} onChange={handleInputChange} disabled={!isEditingAddress} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="city">Cidade</Label>
                    <Input id="city" name="address.city" value={addressData?.city || ''} onChange={handleInputChange} disabled={!isEditingAddress} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="state">Estado</Label>
                    <Input id="state" name="address.state" value={addressData?.state || ''} onChange={handleInputChange} disabled={!isEditingAddress} />
                </div>
                </div>
            </CardContent>
             <CardFooter className="border-t px-6 py-4">
              {isEditingAddress ? (
                <div className="flex gap-2">
                  <Button onClick={() => handleSaveChanges('address')} className="hover:bg-[#044a7b]"><Save className="mr-2 h-4 w-4"/>Salvar Endereço</Button>
                  <Button variant="ghost" onClick={() => handleCancelEdit('address')}>Cancelar</Button>
                </div>
              ) : (
                <Button onClick={() => startEditing('address')} className="hover:bg-[#044a7b]"><Edit className="mr-2 h-4 w-4"/>Editar Endereço</Button>
              )}
            </CardFooter>
          </Card>
          
              <Card>
              <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Lock className="h-5 w-5"/>Segurança e Acesso</CardTitle>
                  <CardDescription>
                  Atualize sua senha de login.
                  </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="space-y-2">
                  <Label htmlFor="email">E-mail de Login</Label>
                  <Input id="email" type="email" value={userEmail} disabled readOnly />
                  </div>
                  {isEditingSecurity && (
                  <div className="space-y-2">
                      <Label htmlFor="current-password">Senha Atual</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={!isEditingSecurity}
                          className="pr-12"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                          onClick={() => setShowCurrentPassword(prev => !prev)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Necessária para confirmar qualquer alteração de segurança.</p>
                  </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Nova Senha</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={!isEditingSecurity}
                            className="pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                            onClick={() => setShowNewPassword(prev => !prev)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm-new-password">Confirmar Nova Senha</Label>
                        <div className="relative">
                          <Input
                            id="confirm-new-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={!isEditingSecurity}
                            className="pr-12"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2"
                            onClick={() => setShowConfirmPassword(prev => !prev)}
                          >
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                    </div>
                  </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                  {isEditingSecurity ? (
                  <div className="flex gap-2">
                      <Button onClick={handleSecurityChanges} disabled={isSecurityUpdating} className="hover:bg-[#044a7b]">
                        {isSecurityUpdating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        {isSecurityUpdating ? "Atualizando..." : "Salvar Alterações"}
                      </Button>
                      <Button variant="ghost" onClick={() => handleCancelEdit('security')}>Cancelar</Button>
                  </div>
                  ) : (
                  <Button
                    onClick={() => startEditing('security')}
                    className="hover:bg-[#044a7b]"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Alterar Segurança
                  </Button>
                  )}
              </CardFooter>
          </Card>
        </div>
      </div>
    </div>
    </>
  );
}
