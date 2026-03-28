"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { useTranslations } from 'next-intl';
import {
  validateLoginForm,
  validateEmail,
  createFieldValidation
} from "@/lib/validation";
import { Link, useRouter } from "@/i18n/navigation"
import { loginWithEmail } from "@/lib/actions/auth"
import { useParams } from "next/navigation"

export default function LoginPage() {
  const t = useTranslations('AuthPage');
  const params = useParams()
  const locale = params.locale as string

  // Form state
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Validation state
  const [fieldValidations, setFieldValidations] = useState({
    email: createFieldValidation(),
    password: createFieldValidation(),
  })

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)
    const normalizedEmail = email.trim().toLowerCase()

    // Validate form
    const validation = validateLoginForm(normalizedEmail, password)

    if (!validation.isValid) {
      // Mark all fields as touched and update validation state
      const updatedValidations = { ...fieldValidations }
      Object.keys(validation.errors).forEach(fieldName => {
        if (fieldName in updatedValidations) {
          updatedValidations[fieldName as keyof typeof updatedValidations] = {
            ...updatedValidations[fieldName as keyof typeof updatedValidations],
            touched: true,
            isValid: false,
            message: validation.errors[fieldName]
          }
        }
      })
      setFieldValidations(updatedValidations)
      setMessage("Please fix the errors below before submitting.")
      setIsLoading(false)
      return
    }

    try {
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      })
      
      if (error) {
        setMessage(error.message)
      } else {
        setMessage("Login successful! Redirecting...")
        const redirectTo = searchParams?.get('redirect_to') || '/dashboard'
        setTimeout(() => {
          router.push(redirectTo)
        }, 1000)
      }
    } catch (err) {
      setMessage("An unexpected error occurred. Please try again.")
      console.error(err)
    }
    setIsLoading(false)
  }

  // Handle field changes with real-time validation
  const handleEmailChange = (value: string) => {
    setEmail(value)
    const validation = validateEmail(value)
    setFieldValidations(prev => ({
      ...prev,
      email: {
        ...prev.email,
        value,
        touched: true,
        isValid: validation.isValid,
        message: validation.message
      }
    }))
  }

  const handlePasswordChange = (value: string) => {
    setPassword(value)
    setFieldValidations(prev => ({
      ...prev,
      password: {
        ...prev.password,
        value,
        touched: true,
        isValid: value.trim().length > 0,
        message: value.trim().length === 0 ? "Password is required" : ""
      }
    }))
  }

  useEffect(() => {
    if (!searchParams) return
    let prefillEmail = searchParams.get('prefill') || searchParams.get('email') || ""
    if (!prefillEmail && typeof window !== 'undefined') {
      prefillEmail = localStorage.getItem('pendingSignupEmail') || ""
    }
    if (prefillEmail) {
      setEmail(prefillEmail)
      const validation = validateEmail(prefillEmail)
      setFieldValidations(prev => ({
        ...prev,
        email: {
          ...prev.email,
          value: prefillEmail,
          touched: true,
          isValid: validation.isValid,
          message: validation.message
        }
      }))
    }
  }, [searchParams])

  // Check if form is valid
  const isFormValid = fieldValidations.email.isValid && fieldValidations.password.isValid &&
    email.trim() && password.trim()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Sheep className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl">{t('welcomeBack')}</CardTitle>
          <CardDescription>{t('signInToAccount')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`pr-10 ${fieldValidations.email.touched && !fieldValidations.email.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.email.touched && fieldValidations.email.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                  required
                />
                {fieldValidations.email.touched && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {fieldValidations.email.isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {fieldValidations.email.touched && !fieldValidations.email.isValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldValidations.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <div className="relative">
                <Input
                  id="password"
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`pr-10 ${fieldValidations.password.touched && !fieldValidations.password.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.password.touched && fieldValidations.password.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldValidations.password.touched && !fieldValidations.password.isValid && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {fieldValidations.password.message}
                </p>
              )}
            </div>

            {/* Message */}
            {message && (
              <div className={`text-sm rounded-md p-3 flex items-center gap-2 ${message.includes('successful') || message.includes('Redirecting')
                ? 'text-green-600 bg-green-50 border border-green-200'
                : 'text-red-600 bg-red-50 border border-red-200'
                }`}>
                {message.includes('successful') || message.includes('Redirecting') ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                )}
                {message}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5"
              disabled={isLoading || !isFormValid}
            >
              {isLoading ? 'Logging in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            <Link href="/auth/forget-password" className="text-sm text-blue-600 hover:underline">
              {t('forgotPassword')}
            </Link>
            <div className="text-sm text-gray-600">
              New to GrainHero?{' '}
              <Link href="/checkout" className="text-blue-600 hover:underline">
                Get Started
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
