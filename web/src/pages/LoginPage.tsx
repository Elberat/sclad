import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useViewportHeight } from '@/hooks/useViewportHeight'
import { isSupabaseConfigured } from '@/lib/supabase'

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Минимум 6 символов'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const viewportHeight = useViewportHeight(!isDesktop)
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState('')

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (values: LoginValues) => {
    setFormError('')
    try {
      await signIn(values.email, values.password)
      const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
      navigate(from || '/dashboard', { replace: true })
    } catch (error) {
      setFormError(error instanceof Error && !isSupabaseConfigured ? error.message : 'Неверный email или пароль')
    }
  }

  return (
    <div
      className="flex items-start justify-center p-4 pt-24 pb-[max(1rem,env(safe-area-inset-bottom))] md:min-h-dvh md:items-center md:pt-4"
      style={{ minHeight: viewportHeight ? `${viewportHeight}px` : '100dvh' }}
    >
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>Войдите в систему управления складом.</CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Добавьте `.env` в папку `web` с `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`, затем перезапустите dev server.
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" inputMode="email" {...form.register('email')} />
              {form.formState.errors.email ? <p className="text-xs text-destructive">{form.formState.errors.email.message}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-12"
                  {...form.register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {form.formState.errors.password ? <p className="text-xs text-destructive">{form.formState.errors.password.message}</p> : null}
            </div>

            {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

            <Button type="submit" className="min-h-[48px] w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Входим...' : 'Войти'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
