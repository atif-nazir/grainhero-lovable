"use client"

import type React from "react"

import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { languages, type LanguageCode, type TranslationKey } from "@/lib/languages"
import { createClient } from "@/lib/supabase/client"
import { type Session } from "@supabase/supabase-js"

export interface User {
  id: string
  name: string
  email: string
  role: "super_admin" | "admin" | "manager" | "technician"
  language: LanguageCode
  phone?: string
  avatarUrl?: string
  hasAccess?: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  logout: () => Promise<void>
  updateLanguage: (language: LanguageCode) => void
  isLoading: boolean
}

interface LanguageContextType {
  currentLanguage: LanguageCode
  setLanguage: (language: LanguageCode) => void
  t: (key: TranslationKey) => string
  availableLanguages: Array<{ code: LanguageCode; name: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Plan Context
interface PlanContextType {
  plan: string;
  setPlan: (plan: string) => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}

function LanguageProvider({
  children,
  initialLanguage = "en",
}: { children: React.ReactNode; initialLanguage?: LanguageCode }) {
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(initialLanguage)
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';

  useEffect(() => {
    // Extract locale from the URL
    const segments = pathname.split("/")
    const urlLocale = segments[1]
    const isValidLocale = (code: string): code is LanguageCode => Object.keys(languages).includes(code)
    if (urlLocale && isValidLocale(urlLocale)) {
      setCurrentLanguage(urlLocale)
      localStorage.setItem("farm-home-language", urlLocale)
    } else {
      // fallback to saved or initial
      const savedLanguage = localStorage.getItem("farm-home-language") as LanguageCode
      if (savedLanguage && languages[savedLanguage]) {
        setCurrentLanguage(savedLanguage)
      } else {
        setCurrentLanguage(initialLanguage)
      }
    }
  }, [pathname, initialLanguage])

  const setLanguage = (language: LanguageCode) => {
    setCurrentLanguage(language)
    localStorage.setItem("farm-home-language", language)
  }

  const t = (key: TranslationKey): string => {
    const translations = languages[currentLanguage]?.translations;
    if (translations && key in translations) {
      return translations[key as keyof typeof translations] as string;
    }
    const enTranslations = languages.en.translations;
    if (enTranslations && key in enTranslations) {
      return enTranslations[key as keyof typeof enTranslations] as string;
    }
    return key;
  }

  const availableLanguages = Object.values(languages).map((lang) => ({
    code: lang.code as LanguageCode,
    name: lang.name,
  }))

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, availableLanguages }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Simple (demo) encryption helpers using base64 (replace with real crypto for production)
function encryptPlan(plan: string): string {
  return btoa(plan);
}
function decryptPlan(encrypted: string): string {
  try {
    return atob(encrypted);
  } catch {
    return "basic";
  }
}
function encryptAccess(access: string): string {
  return btoa(access);
}
function decryptAccess(encrypted: string): string {
  try {
    return atob(encrypted);
  } catch {
    return "none";
  }
}

function PlanProvider({ children }: { children: React.ReactNode }) {
  const [plan, setPlanState] = useState<string>("basic");

  useEffect(() => {
    const saved = localStorage.getItem("subscriptionPlan");
    if (saved) setPlanState(decryptPlan(saved));
  }, []);

  const setPlan = (plan: string) => {
    setPlanState(plan);
    localStorage.setItem("subscriptionPlan", encryptPlan(plan));
  };

  return (
    <PlanContext.Provider value={{ plan, setPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.error('Error fetching user profile:', error)
        return null
      }

      return {
        id: data.id,
        name: data.full_name || '',
        email: data.email || '',
        role: data.role || 'technician',
        language: (data.language as LanguageCode) || 'en',
        phone: data.phone || '',
        avatarUrl: data.avatar_url || '',
      } as User
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      return null
    }
  }, [supabase])

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        setSession(initialSession)
        
        if (initialSession?.user) {
          const profile = await fetchUserProfile(initialSession.user.id)
          setUser(profile)
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession)
      
      if (currentSession?.user) {
        const profile = await fetchUserProfile(currentSession.user.id)
        setUser(profile)
      } else {
        setUser(null)
      }
      
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchUserProfile])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  const updateLanguage = (language: LanguageCode) => {
    if (user) {
      setUser({ ...user, language })
    }
  }

  return (
    <AuthContext.Provider value={{ user, session, logout, updateLanguage, isLoading }}>
      <LanguageProvider initialLanguage={user?.language || "en"}>
        <PlanProvider>{children}</PlanProvider>
      </LanguageProvider>
    </AuthContext.Provider>
  )
}
