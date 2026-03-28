"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { WheatIcon as Sheep, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react"
import { config } from "@/config"
import { useTranslations } from 'next-intl';
import { useRouter } from "@/i18n/navigation"
import {
  validateSignupForm,
  validateField,
  validatePassword,
  createFieldValidation,
  type PasswordStrength
} from "@/lib/validation";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { createClient } from "@/lib/supabase/client"

export default function SignUpPage() {
  const t = useTranslations('AuthPage');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form data state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })

  // Invitation state
  const [invitationData, setInvitationData] = useState<{
    valid: boolean;
    email?: string;
    role?: string;
    name?: string;
  } | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);

  // Validation state for each field
  const [fieldValidations, setFieldValidations] = useState({
    name: createFieldValidation(),
    email: createFieldValidation(),
    phone: createFieldValidation(),
    password: createFieldValidation(),
    confirmPassword: createFieldValidation(),
  })

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  // Removed selectedPlanId since plan selection moved to checkout
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false })

  const handlePostSignupRedirect = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    if (typeof window !== 'undefined') {
      localStorage.setItem('pendingSignupEmail', normalizedEmail)
    }
    setMessage("Account created successfully! Redirecting you to login.")
    setTimeout(() => {
      router.push(`/auth/login?prefill=${encodeURIComponent(normalizedEmail)}`)
    }, 1500)
  }

  // Verify invitation token and handle payment success on component mount
  useEffect(() => {
    const token = searchParams.get('token');
    const paymentSuccess = searchParams.get('payment');
    const email = searchParams.get('email');

    if (token) {
      setInvitationToken(token);
      verifyInvitation(token);
    }

    // Handle payment success redirect
    if (paymentSuccess === 'success' && email) {
      setFormData(prev => ({
        ...prev,
        email: email
      }));
      setMessage("🎉 Payment successful! Complete your account setup below.");
    }
  }, [searchParams]);

  const verifyInvitation = async (token: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles') // Assuming invitations or profiles table for validation
        .select('*')
        .eq('invitation_token', token)
        .single()

      if (!error && data) {
        setInvitationData({
          valid: true,
          email: data.email,
          role: data.role,
          name: data.full_name
        });
        setFormData(prev => ({
          ...prev,
          email: data.email,
          name: data.full_name || ''
        }));
      } else {
        setMessage('Invalid or expired invitation token');
      }
    } catch (err) {
      console.error('Invitation verification error:', err)
      setMessage('Failed to verify invitation token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setMessage(null)

    // Validate entire form
    const validation = validateSignupForm(formData)

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
      const supabase = createClient()
      
      // 1. Initial Signup with Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.name.trim(),
            phone: formData.phone.trim() || undefined,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        }
      })

      if (authError) {
        setMessage(authError.message)
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        setMessage("Signup failed. Please try again.")
        setIsLoading(false)
        return
      }

      // 2. Create/Update user profile in public.users table
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: formData.email.trim().toLowerCase(),
          full_name: formData.name.trim(),
          phone: formData.phone.trim() || undefined,
          role: invitationData?.role || 'admin', // Default to admin for first-time signups
        })

      if (profileError) {
        console.error('Profile creation error:', profileError)
        // Note: auth was successful, but profile failed. 
        // We might want to handle this, but for now we'll proceed as auth is the main part.
      }

      // 3. Handle post-signup logic (payment verification or direct redirect)
      if (invitationData) {
        handlePostSignupRedirect(formData.email)
      } else {
        // If not an invited user, they likely need to pay
        // We can check if they already have a payment record
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('tenant_id', authData.user.id) // Assuming user ID is tenant ID for now
          .single()

        if (!subscription || subscription.status !== 'active') {
          setMessage("Account created! Now redirecting to checkout to choose your plan.")
          setTimeout(() => {
            router.push(`/checkout?email=${encodeURIComponent(formData.email)}`)
          }, 2000)
        } else {
          handlePostSignupRedirect(formData.email)
        }
      }
    } catch (err) {
      console.error('Signup error:', err)
      setMessage("An unexpected error occurred. Please try again.")
    }
    setIsLoading(false)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Real-time validation
    const validation = validateField(field, value)

    // Special handling for password confirmation
    if (field === 'confirmPassword') {
      if (formData.password && value) {
        const passwordsMatch = formData.password === value
        setFieldValidations(prev => ({
          ...prev,
          confirmPassword: {
            ...prev.confirmPassword,
            value,
            touched: true,
            isValid: passwordsMatch,
            message: passwordsMatch ? "" : "Passwords do not match"
          }
        }))
      } else {
        setFieldValidations(prev => ({
          ...prev,
          confirmPassword: {
            ...prev.confirmPassword,
            value,
            touched: true,
            isValid: validation.isValid,
            message: validation.message
          }
        }))
      }
    } else {
      setFieldValidations(prev => ({
        ...prev,
        [field]: {
          ...prev[field as keyof typeof prev],
          value,
          touched: true,
          isValid: validation.isValid,
          message: validation.message
        }
      }))
    }

    // Update password strength for password field
    if (field === 'password') {
      const passwordValidation = validatePassword(value)
      setPasswordStrength(passwordValidation.strength)
    }
  }

  // Check if form is valid for submit button
  const isFormValid = Object.values(fieldValidations).every(field => field.isValid) &&
    formData.name && formData.email && formData.password && formData.confirmPassword

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="w-full max-w-md">
        {/* Left: Signup Form */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sheep className="h-10 w-10 text-green-600" />
              <div>
                <CardTitle className="text-2xl">
                  {invitationData ? `Accept Invitation - ${invitationData.role}` : t('createAccount')}
                </CardTitle>
                <CardDescription>
                  {invitationData
                    ? `You've been invited to join GrainHero as a ${invitationData.role}. Complete your account setup below.`
                    : t('signUpForFarmHome')
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('fullName')}</Label>
                <div className="relative">
                  <Input
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={`pr-10 ${fieldValidations.name.touched && !fieldValidations.name.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.name.touched && fieldValidations.name.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                    required
                  />
                  {fieldValidations.name.touched && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {fieldValidations.name.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {fieldValidations.name.touched && !fieldValidations.name.isValid && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldValidations.name.message}
                  </p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={`pr-10 ${fieldValidations.email.touched && !fieldValidations.email.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.email.touched && fieldValidations.email.isValid ? 'border-green-500 focus:border-green-500' : ''} ${invitationData || searchParams.get('payment') === 'success' ? 'bg-gray-50' : ''}`}
                    readOnly={!!invitationData || searchParams.get('payment') === 'success'}
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

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phoneNumber')} <span className="text-gray-400 text-sm">{t('optional')}</span></Label>
                <div className="relative">
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className={`pr-10 ${fieldValidations.phone.touched && !fieldValidations.phone.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.phone.touched && fieldValidations.phone.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                  />
                  {fieldValidations.phone.touched && fieldValidations.phone.value && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      {fieldValidations.phone.isValid ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {fieldValidations.phone.touched && !fieldValidations.phone.isValid && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {fieldValidations.phone.message}
                  </p>
                )}
              </div>

              {/* Password Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">{t('password')}</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleChange("password", e.target.value)}
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange("confirmPassword", e.target.value)}
                      className={`pr-10 ${fieldValidations.confirmPassword.touched && !fieldValidations.confirmPassword.isValid ? 'border-red-500 focus:border-red-500' : fieldValidations.confirmPassword.touched && fieldValidations.confirmPassword.isValid ? 'border-green-500 focus:border-green-500' : ''}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {fieldValidations.confirmPassword.touched && !fieldValidations.confirmPassword.isValid && (
                    <p className="text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldValidations.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password Strength</Label>
                  <PasswordStrengthIndicator strength={passwordStrength} />
                </div>
              )}

              {/* Message Display */}
              {message && (
                <div className={`text-sm rounded-md p-3 flex items-center gap-2 ${message.includes('successfully') || message.includes('success')
                  ? 'text-green-600 bg-green-50 border border-green-200'
                  : 'text-red-600 bg-red-50 border border-red-200'
                  }`}>
                  {message.includes('successfully') || message.includes('success') ? (
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
                aria-label="Create account and continue to payment"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
