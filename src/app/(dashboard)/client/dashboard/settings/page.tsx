"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { fetchJson, setAccessToken } from "@/lib/fetcher";
import { capitalizeWords } from "@/lib/utils";
import { ArrowLeft, Edit, Eye, EyeOff, Save } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthUser, Client } from "@/lib/definitions";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  phone: z.string().min(10, { message: "Um número de WhatsApp válido é obrigatório." }),
});

const passwordFormSchema = z
  .object({
    currentPassword: z.string().min(6, { message: "Senha atual é obrigatória." }),
    newPassword: z.string().min(6, { message: "A nova senha deve ter pelo menos 6 caracteres." }),
    confirmPassword: z.string().min(6, { message: "Confirmação de senha é obrigatória." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
  });

export default function ClientSettingsPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const { user } = auth;
  const [clientProfile, setClientProfile] = useState<Client | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!user?.id) {
      setClientProfile(null);
      profileForm.reset({ name: "", phone: "" });
      setIsLoadingProfile(false);
      return;
    }

    let didCancel = false;
    const loadProfile = async () => {
      setIsLoadingProfile(true);
      try {
        const response = await fetchJson<{ data: Client[] }>(`/api/clients?userId=${user.id}`);
        const profile = response.data?.[0] || null;
        if (didCancel) return;
        setClientProfile(profile);
        setAvatarPreview(user?.avatarUrl ?? null);
        setOriginalAvatar(user?.avatarUrl ?? null);
        profileForm.reset({
          name: profile?.name || user.name || "",
          phone: profile?.phone || user?.phone || "",
        });
      } catch (error: any) {
        console.error("Erro ao carregar perfil:", error);
        if (!didCancel) {
          toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar seu perfil." });
        }
      } finally {
        if (!didCancel) setIsLoadingProfile(false);
      }
    };
    loadProfile();
    return () => {
      didCancel = true;
    };
  }, [user, profileForm, toast]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    value = value.replace(/\D/g, "");
    value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    if (value.length > 15) {
      value = value.substring(0, 15);
    }
    e.target.value = value;
    return e;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.target.value = capitalizeWords(e.target.value);
    return e;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result?.toString() || null;
      setAvatarPreview(result);
    };
    reader.readAsDataURL(file);
  };

  const onProfileSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user?.id) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível identificar seu perfil." });
      return;
    }
    setIsUpdatingProfile(true);
    try {
      if (avatarPreview !== originalAvatar) {
        setIsUploadingAvatar(true);
        const doUpdateAvatar = async () => {
          const updateRes = await fetchJson<{ data: { user: AuthUser; accessToken: string } }>("/api/auth/update-profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatarUrl: avatarPreview, name: values.name, phone: values.phone }),
          });
          setAccessToken(updateRes.data.accessToken);
          await auth.refreshUser();
        };
        try {
          await doUpdateAvatar();
        } catch (error: any) {
          if (error?.message?.includes("401") || error?.message?.includes("Não autenticado")) {
            await auth.refreshUser();
            await doUpdateAvatar();
          } else {
            throw error;
          }
        }
        setOriginalAvatar(avatarPreview);
      }

      const doUpdateProfile = async () => {
        const updateRes = await fetchJson<{ data: { user: AuthUser; accessToken: string } }>("/api/auth/update-profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: values.name, phone: values.phone }),
        });
        setAccessToken(updateRes.data.accessToken);
        await auth.refreshUser();
      };
      try {
        await doUpdateProfile();
      } catch (error: any) {
        if (error?.message?.includes("401") || error?.message?.includes("Não autenticado")) {
          await auth.refreshUser();
          await doUpdateProfile();
        } else {
          throw error;
        }
      }

      if (clientProfile?.id) {
        const doUpdateClient = async () => {
          const response = await fetchJson<{ data: Client }>(`/api/clients/${clientProfile.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: values.name, phone: values.phone }),
          });
          setClientProfile(response.data);
        };
        try {
          await doUpdateClient();
        } catch (error: any) {
          if (error?.message?.includes("401") || error?.message?.includes("Não autenticado")) {
            await auth.refreshUser();
            await doUpdateClient();
          } else {
            throw error;
          }
        }
      }

      toast({ title: "Perfil atualizado", description: "Suas informações foram salvas com sucesso." });
      if (clientProfile) {
        setClientProfile({ ...clientProfile, name: values.name, phone: values.phone });
      }
      profileForm.reset({ name: values.name, phone: values.phone });
      setIsEditingProfile(false);
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar seu perfil." });
    } finally {
      setIsUpdatingProfile(false);
      setIsUploadingAvatar(false);
    }
  };

  const handleCancelEdit = () => {
    profileForm.reset({
      name: clientProfile?.name || user?.name || "",
      phone: clientProfile?.phone || user?.phone || "",
    });
    setAvatarPreview(originalAvatar);
    setIsEditingProfile(false);
  };

  const handleCancelPasswordEdit = () => {
    passwordForm.reset();
    setIsEditingPassword(false);
  };

  const onPasswordSubmit = async (values: z.infer<typeof passwordFormSchema>) => {
    if (!user) {
      toast({ variant: "destructive", title: "Erro", description: "Usuário não autenticado." });
      return;
    }
    setIsUpdatingPassword(true);
    try {
      const response = await fetchJson<{ data: { user: AuthUser; accessToken: string } }>("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      setAccessToken(response.data.accessToken);
      await auth.refreshUser();
      toast({ title: "Senha atualizada", description: "Sua senha foi redefinida com sucesso." });
      passwordForm.reset();
      setIsEditingPassword(false);
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível alterar a senha." });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const isProfileSectionBusy = isLoadingProfile || isUpdatingProfile || isUploadingAvatar;

  return (
    <div className="grid gap-6">
      <Button variant="outline" asChild className="w-fit">
        <Link href="/client/dashboard">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar ao Menu
        </Link>
      </Button>

      <Card>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
            <CardHeader>
              <CardTitle>Perfil</CardTitle>
              <CardDescription>Atualize suas informações de contato.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex items-center justify-center">
                  <div className="relative group">
                    <Avatar className="h-20 w-20 text-xl">
                      {avatarPreview ? <AvatarImage src={avatarPreview} alt="Avatar" /> : null}
                      <AvatarFallback>{(profileForm.getValues("name") || user?.name || "C").charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isEditingProfile && (
                      <label
                        htmlFor="avatar-upload"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium"
                      >
                        Trocar foto
                      </label>
                    )}
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="sr-only"
                      disabled={!isEditingProfile || isUploadingAvatar}
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="text-sm text-muted-foreground">
                    E-mail cadastrado: <span className="font-medium text-foreground">{user?.email || "Não informado"}</span>
                  </div>
                  <FormField
                    control={profileForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome Completo</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Seu nome"
                            {...field}
                            onChange={(e) => field.onChange(handleNameChange(e))}
                            disabled={!isEditingProfile || isProfileSectionBusy}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone WhatsApp</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="(11) 98765-4321"
                            {...field}
                            onChange={(e) => field.onChange(handlePhoneChange(e))}
                            disabled={!isEditingProfile || isProfileSectionBusy}
                            maxLength={15}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {isEditingProfile ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={isProfileSectionBusy}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Perfil
                  </Button>
                  <Button variant="ghost" type="button" onClick={handleCancelEdit} disabled={isProfileSectionBusy}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button type="button" onClick={() => setIsEditingProfile(true)} disabled={isLoadingProfile}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alterar Senha</CardTitle>
          <CardDescription>Informe a senha atual para definir uma nova.</CardDescription>
        </CardHeader>
        <Form {...passwordForm}>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={!isEditingPassword || isUpdatingPassword}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={!isEditingPassword || isUpdatingPassword}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowNewPassword((prev) => !prev)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          {...field}
                          disabled={!isEditingPassword || isUpdatingPassword}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7"
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              {isEditingPassword ? (
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={isUpdatingPassword}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Senha
                  </Button>
                  <Button variant="ghost" type="button" onClick={handleCancelPasswordEdit} disabled={isUpdatingPassword}>
                    Cancelar
                  </Button>
                </div>
              ) : (
                <Button type="button" onClick={() => setIsEditingPassword(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Alterar Senha
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
