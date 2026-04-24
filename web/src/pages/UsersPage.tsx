import { type FormEvent, useMemo, useState } from 'react'
import { Copy, Eye, EyeOff, KeyRound, Plus, ShieldAlert, UserX, Users } from 'lucide-react'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { EmptyState } from '@/components/shared/EmptyState'
import { PageHeader } from '@/components/shared/PageHeader'
import { TableSkeleton } from '@/components/shared/TableSkeleton'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/contexts/AuthContext'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import {
  useCreateUserMutation,
  useDeactivateUserMutation,
  useUpdateUserPasswordMutation,
  useUpdateUserRoleMutation,
  useUsersQuery,
  usersQueryKey,
  type CreateUserPayload,
} from '@/hooks/useUsers'
import type { Profile, Role } from '@/lib/supabase'
import { createActionClassName } from '@/lib/utils'

const ROLE_LABELS: Record<Role, string> = {
  viewer: 'Наблюдатель',
  cashier: 'Кассир',
  warehouse_manager: 'Менеджер склада',
  super_admin: 'Super admin',
}

const ROLES = Object.keys(ROLE_LABELS) as Role[]

type CreatedCredentials = {
  email: string
  password: string
} | null

export function UsersPage() {
  const { user } = useAuth()
  const usersQuery = useUsersQuery()
  const updateRoleMutation = useUpdateUserRoleMutation()
  const deactivateMutation = useDeactivateUserMutation()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [passwordUser, setPasswordUser] = useState<Profile | null>(null)
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials>(null)
  const [pendingRoleChange, setPendingRoleChange] = useState<{ profile: Profile; role: Role } | null>(null)

  usePullToRefresh(usersQueryKey)

  const activeSuperAdminsCount = useMemo(
    () => (usersQuery.data ?? []).filter((profile) => profile.is_active && profile.role === 'super_admin').length,
    [usersQuery.data],
  )
  const users = usersQuery.data ?? []

  const changeRole = async () => {
    if (!pendingRoleChange) return

    try {
      await updateRoleMutation.mutateAsync({ id: pendingRoleChange.profile.id, role: pendingRoleChange.role })
      toast.success('Роль обновлена')
      setPendingRoleChange(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось обновить роль')
    }
  }

  const deactivateUser = async (profile: Profile) => {
    try {
      await deactivateMutation.mutateAsync(profile.id)
      toast.success('Пользователь деактивирован')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось деактивировать пользователя')
    }
  }

  const renderRoleSelect = (profile: Profile) => (
    <Select
      value={profile.role}
      onValueChange={(value) => {
        const nextRole = value as Role
        if (nextRole !== profile.role) setPendingRoleChange({ profile, role: nextRole })
      }}
      disabled={!profile.is_active || updateRoleMutation.isPending}
    >
      <SelectTrigger className="min-h-[44px] w-full min-w-0 md:w-[190px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ROLES.map((role) => (
          <SelectItem key={role} value={role}>
            {ROLE_LABELS[role]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  const renderActions = (profile: Profile) => {
    const isSelf = user?.id === profile.id
    const isLastSuperAdmin = profile.role === 'super_admin' && profile.is_active && activeSuperAdminsCount <= 1
    const canDeactivate = profile.is_active && !isSelf && !isLastSuperAdmin

    return (
      <div className="flex flex-wrap gap-2 md:justify-end">
        <Button variant="outline" size="sm" onClick={() => setPasswordUser(profile)} disabled={!profile.is_active}>
          <KeyRound className="size-4" />
          <span className="hidden sm:inline">Пароль</span>
        </Button>
        <ConfirmDialog
          title="Деактивировать пользователя?"
          description="Профиль будет помечен как неактивный и больше не сможет работать в системе."
          confirmText="Деактивировать"
          onConfirm={() => void deactivateUser(profile)}
          trigger={
            <Button variant="destructive" size="sm" disabled={!canDeactivate || deactivateMutation.isPending}>
              <UserX className="size-4" />
              <span className="hidden sm:inline">Деактивировать</span>
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <PageHeader
        title="Пользователи"
        description="Управление аккаунтами, ролями и доступом."
        action={
          <Button variant="outline" className={createActionClassName()} onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4" />
            Создать пользователя
          </Button>
        }
      />

      {usersQuery.isLoading ? (
        <TableSkeleton columns={5} rows={6} />
      ) : usersQuery.isError ? (
        <EmptyState
          icon={ShieldAlert}
          title="Не удалось загрузить пользователей"
          description="Проверьте подключение к Supabase и права текущего аккаунта."
        />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Пользователи не найдены" description="Создайте первый аккаунт для команды." />
      ) : (
        <UsersTable users={users} renderRoleSelect={renderRoleSelect} renderActions={renderActions} />
      )}

      <CreateUserSheet
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onCreated={(credentials) => setCreatedCredentials(credentials)}
      />
      <PasswordSheet user={passwordUser} onOpenChange={(open) => !open && setPasswordUser(null)} />
      <CredentialsDialog credentials={createdCredentials} onOpenChange={(open) => !open && setCreatedCredentials(null)} />

      <Dialog open={Boolean(pendingRoleChange)} onOpenChange={(open) => !open && setPendingRoleChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтвердить смену роли</DialogTitle>
            <DialogDescription>
              Новая роль для {pendingRoleChange?.profile.email}: {pendingRoleChange ? ROLE_LABELS[pendingRoleChange.role] : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingRoleChange(null)}>
              Отмена
            </Button>
            <Button onClick={() => void changeRole()} disabled={updateRoleMutation.isPending}>
              Подтвердить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function UsersTable({
  users,
  renderRoleSelect,
  renderActions,
}: {
  users: Profile[]
  renderRoleSelect: (profile: Profile) => JSX.Element
  renderActions: (profile: Profile) => JSX.Element
}) {
  return (
    <div data-no-pull-refresh="true" className="overflow-hidden rounded-md border">
      <Table className="w-full table-fixed md:table-auto">
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[42%] md:w-auto">Пользователь</TableHead>
            <TableHead className="hidden md:table-cell">Имя</TableHead>
            <TableHead className="w-[32%] md:w-auto">Роль</TableHead>
            <TableHead className="w-[26%] md:w-auto">Статус</TableHead>
            <TableHead className="hidden text-right md:table-cell">Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((profile) => (
            <TableRow key={profile.id}>
              <TableCell className="whitespace-normal break-words font-medium">
                {profile.email}
                <p className="mt-1 text-xs font-normal text-muted-foreground md:hidden">{profile.full_name || 'Без имени'}</p>
                <div className="mt-3 md:hidden">{renderActions(profile)}</div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{profile.full_name || 'Без имени'}</TableCell>
              <TableCell>{renderRoleSelect(profile)}</TableCell>
              <TableCell>
                <StatusBadge profile={profile} />
              </TableCell>
              <TableCell className="hidden md:table-cell">{renderActions(profile)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StatusBadge({ profile }: { profile: Profile }) {
  return <Badge variant={profile.is_active ? 'default' : 'secondary'}>{profile.is_active ? 'Активен' : 'Архив'}</Badge>
}

function CreateUserSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (credentials: { email: string; password: string }) => void
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const createUserMutation = useCreateUserMutation()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState<CreateUserPayload>({
    email: '',
    full_name: '',
    password: '',
    role: 'viewer',
  })

  const updateForm = <K extends keyof CreateUserPayload>(key: K, value: CreateUserPayload[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      await createUserMutation.mutateAsync({
        ...form,
        email: form.email.trim(),
        full_name: form.full_name?.trim() || null,
      })
      toast.success('Пользователь создан')
      onOpenChange(false)
      onCreated({ email: form.email.trim(), password: form.password })
      setForm({ email: '', full_name: '', password: '', role: 'viewer' })
      setShowPassword(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось создать пользователя')
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isDesktop ? 'right' : 'bottom'} className={isDesktop ? 'w-[460px] max-w-[460px]' : 'h-[100dvh] w-full pb-[env(safe-area-inset-bottom)]'}>
        <SheetHeader className="border-b p-4 md:p-6">
          <SheetTitle>Создать пользователя</SheetTitle>
          <SheetDescription>После создания пароль будет показан один раз.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(event) => updateForm('email', event.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Полное имя</Label>
            <Input value={form.full_name ?? ''} onChange={(event) => updateForm('full_name', event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Пароль</Label>
            <div className="flex gap-2">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(event) => updateForm('password', event.target.value)}
                minLength={6}
                required
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{showPassword ? 'Скрыть пароль' : 'Показать пароль'}</span>
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Роль</Label>
            <Select value={form.role} onValueChange={(value) => updateForm('role', value as Role)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="outline" className={createActionClassName('mt-auto w-full')} disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? 'Создаем...' : 'Создать пользователя'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function PasswordSheet({ user, onOpenChange }: { user: Profile | null; onOpenChange: (open: boolean) => void }) {
  const isDesktop = useMediaQuery('(min-width: 768px)')
  const updatePasswordMutation = useUpdateUserPasswordMutation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return

    try {
      await updatePasswordMutation.mutateAsync({ id: user.id, password })
      toast.success('Пароль обновлен')
      setPassword('')
      setShowPassword(false)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сменить пароль')
    }
  }

  return (
    <Sheet open={Boolean(user)} onOpenChange={onOpenChange}>
      <SheetContent side={isDesktop ? 'right' : 'bottom'} className={isDesktop ? 'w-[420px] max-w-[420px]' : 'h-[100dvh] w-full pb-[env(safe-area-inset-bottom)]'}>
        <SheetHeader className="border-b p-4 md:p-6">
          <SheetTitle>Сменить пароль</SheetTitle>
          <SheetDescription>{user?.email}</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <div className="space-y-2">
            <Label>Новый пароль</Label>
            <div className="flex gap-2">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                required
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                <span className="sr-only">{showPassword ? 'Скрыть пароль' : 'Показать пароль'}</span>
              </Button>
            </div>
          </div>
          <Button type="submit" className="mt-auto w-full" disabled={updatePasswordMutation.isPending}>
            {updatePasswordMutation.isPending ? 'Сохраняем...' : 'Сменить пароль'}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  )
}

function CredentialsDialog({ credentials, onOpenChange }: { credentials: CreatedCredentials; onOpenChange: (open: boolean) => void }) {
  const text = credentials ? `Логин: ${credentials.email}\nПароль: ${credentials.password}` : ''

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    toast.success('Данные скопированы')
  }

  return (
    <Dialog open={Boolean(credentials)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Данные для передачи</DialogTitle>
          <DialogDescription>Пароль больше нигде не покажется.</DialogDescription>
        </DialogHeader>
        <div className="surface-card bg-muted/40 p-4 font-mono text-sm whitespace-pre-wrap">{text}</div>
        <DialogFooter>
          <Button onClick={() => void copy()}>
            <Copy className="size-4" />
            Скопировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
