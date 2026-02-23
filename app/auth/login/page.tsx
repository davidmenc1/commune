"use client";

import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "../client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getJwt } from "../jwt";
import Link from "next/link";
import { Loader2, MessageCircle } from "lucide-react";

export default function Login() {
  const t = useTranslations();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const formSchema = z.object({
    email: z.string().email(t('validation.invalidEmail')),
    password: z.string().min(8, t('validation.passwordMin', { min: 8 })),
  });
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setError(null);
    
    try {
      const { error, data } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setError(error.message ?? t('auth.invalidEmailOrPassword'));
        return;
      }

      await getJwt(data.token);
      router.push("/chat/traffic");
    } catch {
      setError(t('common.somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-subtle flex items-center justify-center px-4 py-12">
      {/* Decorative background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      </div>
      
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo and header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <MessageCircle className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">Commune</span>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('auth.welcomeBack')}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {t('auth.signInToContinue')}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border bg-card p-8 shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={t('auth.emailPlaceholder')}
                        type="email"
                        autoComplete="email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={t('auth.passwordPlaceholder')}
                        autoComplete="current-password"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.signingIn')}
                  </>
                ) : (
                  t('auth.signIn')
                )}
              </Button>
            </form>
          </Form>
        </div>
        
        {/* Footer link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.dontHaveAccount')}{" "}
          <Link 
            href="/auth/register" 
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {t('auth.createOne')}
          </Link>
        </p>
      </div>
    </div>
  );
}
