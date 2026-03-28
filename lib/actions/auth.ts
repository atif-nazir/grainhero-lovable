'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function loginWithEmail(
  email: string,
  password: string,
  locale: string
) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password,
    })

    if (error) {
      return { error: error.message, data: null }
    }

    // Verify user profile exists in public.users table
    if (data.user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single()

      if (profileError || !userProfile) {
        // Create user profile if it doesn't exist
        await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            full_name: data.user.user_metadata?.full_name || '',
          })
      }
    }

    return { error: null, data: data.user }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Login failed',
      data: null,
    }
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
  locale: string
) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${getBaseUrl()}/auth/callback`,
      },
    })

    if (error) {
      return { error: error.message, data: null }
    }

    // Create user profile in public.users table
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: 'buyer',
        })

      if (profileError) {
        console.error('Error creating user profile:', profileError)
      }
    }

    return {
      error: null,
      data: {
        user: data.user,
        message: 'Check your email to confirm your account',
      },
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Signup failed',
      data: null,
    }
  }
}

export async function logout(locale: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Logout failed',
    }
  }
}

export async function getCurrentUser() {
  const supabase = await createClient()

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { user: null, error: error?.message || 'Not authenticated' }
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      return { user, error: profileError.message }
    }

    return { user: { ...user, ...userProfile }, error: null }
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Error fetching user',
    }
  }
}

export async function resetPassword(email: string, locale: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${getBaseUrl()}/${locale}/auth/reset-password`,
      }
    )

    if (error) {
      return { error: error.message }
    }

    return {
      error: null,
      message: 'Check your email for password reset instructions',
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Password reset failed',
    }
  }
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return { error: error.message }
    }

    return { error: null, message: 'Password updated successfully' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Password update failed',
    }
  }
}

function getBaseUrl() {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  const headersList = headers()
  const host = headersList.get('x-forwarded-host') || headersList.get('host')
  const protocol = headersList.get('x-forwarded-proto') || 'http'

  return `${protocol}://${host}`
}
