// MS-01(Users)/src/modules/users/__tests__/users.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks — deben declararse ANTES de cualquier import del módulo bajo prueba ──

vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    loginAttempt: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    userRating: {
      upsert: vi.fn(),
      aggregate: vi.fn(),
    },
    userTechnology: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    technology: {
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
}))

// ── Imports del módulo bajo prueba (después de los mocks) ──
import { prisma } from '@/lib/prisma'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getUserById,
  rateUser,
  registerUser,
  loginUser,
  logoutUser,
  syncOAuthUserSession,
  sendPasswordResetEmail,
  changeUserPassword,
  updateUserProfile,
} from '@/modules/users/users.service'

// ─────────────────────────────────────────────────────────
// getUserById
// ─────────────────────────────────────────────────────────
describe('getUserById', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna null cuando el usuario no existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const result = await getUserById('id-inexistente')

    expect(result).toBeNull()
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'id-inexistente' },
      select: expect.objectContaining({ id: true, email: true }),
    })
  })

  it('retorna el usuario con sus tecnologías y stats cuando existe', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@test.com',
      username: 'testuser',
      role: 'BACKEND',
      avatarUrl: null,
      description: null,
      avgRating: 4.5,
      totalRatings: 10,
      createdAt: new Date(),
      technologies: [
        {
          technology: { id: 'tech-1', name: 'TypeScript', slug: 'typescript' },
        },
      ],
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    // getUserStats usa $queryRaw internamente
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ count: 3 }])  // comments
      .mockResolvedValueOnce([{ count: 7 }])  // solutions

    const result = await getUserById('user-123')

    expect(result).not.toBeNull()
    expect(result?.id).toBe('user-123')
    expect(result?.username).toBe('testuser')
    expect(result?.technologies).toHaveLength(1)
    expect(result?.technologies[0].name).toBe('TypeScript')
    expect(result?.commentsCount).toBe(3)
    expect(result?.solutionsCount).toBe(7)
  })

  it('retorna el usuario con stats en cero si $queryRaw falla (fallback)', async () => {
    const mockUser = {
      id: 'user-456',
      email: 'other@test.com',
      username: 'otheruser',
      role: 'FRONTEND',
      avatarUrl: null,
      description: null,
      avgRating: 0,
      totalRatings: 0,
      createdAt: new Date(),
      technologies: [],
    }

    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error('DB error'))

    const result = await getUserById('user-456')

    expect(result).not.toBeNull()
    expect(result?.commentsCount).toBe(0)
    expect(result?.solutionsCount).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────
// rateUser
// ─────────────────────────────────────────────────────────
describe('rateUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lanza SELF_RATING_NOT_ALLOWED cuando raterId === targetUserId', async () => {
    await expect(rateUser('same-id', 'same-id', { score: 5 })).rejects.toThrow(
      'SELF_RATING_NOT_ALLOWED'
    )
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('lanza USER_NOT_FOUND cuando el usuario objetivo no existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(rateUser('rater-1', 'target-999', { score: 4 })).rejects.toThrow(
      'USER_NOT_FOUND'
    )
  })

  it('retorna avgRating y totalRatings después de una calificación exitosa', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'target-1' } as any)

    // tx aislado para verificar que las ops van por él, no por prisma global
    const mockTx = {
      userRating: {
        upsert: vi.fn().mockResolvedValue({} as any),
        aggregate: vi.fn().mockResolvedValue({
          _avg: { score: 4.5 },
          _count: { score: 8 },
        } as any),
      },
      user: {
        update: vi.fn().mockResolvedValue({} as any),
      },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(mockTx))

    const result = await rateUser('rater-1', 'target-1', { score: 5 })

    expect(result.avgRating).toBe(4.5)
    expect(result.totalRatings).toBe(8)
    expect(mockTx.userRating.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { raterId_targetUserId: { raterId: 'rater-1', targetUserId: 'target-1' } },
        create: expect.objectContaining({ score: 5 }),
      })
    )
    expect(mockTx.userRating.aggregate).toHaveBeenCalled()
    expect(mockTx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'target-1' },
        data: { avgRating: 4.5, totalRatings: 8 },
      })
    )
    // Confirmar que prisma global NUNCA fue llamado para ops de transacción
    expect(prisma.userRating.upsert).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────
// registerUser
// ─────────────────────────────────────────────────────────
describe('registerUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lanza EMAIL_ALREADY_EXISTS si el email ya está registrado en Prisma', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'existing' } as any)

    await expect(
      registerUser({ email: 'dup@test.com', username: 'nuevo', password: 'Pass1234!', role: 'BACKEND' })
    ).rejects.toThrow('EMAIL_ALREADY_EXISTS')
  })

  it('lanza USERNAME_ALREADY_EXISTS si el username ya está en uso', async () => {
    // Primer findUnique (email) → null, segundo (username) → existe
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-user' } as any)

    await expect(
      registerUser({ email: 'nuevo@test.com', username: 'duplicado', password: 'Pass1234!', role: 'BACKEND' })
    ).rejects.toThrow('USERNAME_ALREADY_EXISTS')
  })

  it('registra el usuario exitosamente y retorna user + accessToken', async () => {
    // Prisma: email libre, username libre
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    // Supabase signUp exitoso
    const mockSupabase = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'new-user-id' },
            session: { access_token: 'token-abc' },
          },
          error: null,
        }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    // Prisma create retorna el usuario nuevo
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-user-id',
      email: 'new@test.com',
      username: 'newuser',
      role: 'BACKEND',
      avatarUrl: null,
      description: null,
      avgRating: 0,
      totalRatings: 0,
      createdAt: new Date(),
    } as any)

    const result = await registerUser({
      email: 'new@test.com',
      username: 'newuser',
      password: 'Pass1234!',
      role: 'BACKEND',
    })

    expect(result.user.id).toBe('new-user-id')
    expect(result.accessToken).toBe('token-abc')
  })
})

// ─────────────────────────────────────────────────────────
// loginUser
// ─────────────────────────────────────────────────────────
describe('loginUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lanza TOO_MANY_ATTEMPTS si la cuenta está bloqueada', async () => {
    // loginAttempt con lockedUntil en el futuro
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000)
    vi.mocked(prisma.loginAttempt.findUnique).mockResolvedValue({
      email: 'locked@test.com',
      failedCount: 5,
      lockedUntil,
      lastFailedAt: new Date(),
    } as any)

    await expect(
      loginUser({ email: 'locked@test.com', password: 'cualquiera' })
    ).rejects.toThrow(/TOO_MANY_ATTEMPTS/)
  })

  it('lanza INVALID_CREDENTIALS si Supabase rechaza las credenciales', async () => {
    // Sin bloqueo
    vi.mocked(prisma.loginAttempt.findUnique).mockResolvedValue(null)

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid login credentials' },
        }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(prisma.loginAttempt.create).mockResolvedValue({} as any)
    vi.mocked(prisma.loginAttempt.findUnique).mockResolvedValue(null)

    await expect(
      loginUser({ email: 'wrong@test.com', password: 'wrongpass' })
    ).rejects.toThrow('INVALID_CREDENTIALS')
  })

  it('retorna user y accessToken en un login exitoso', async () => {
    vi.mocked(prisma.loginAttempt.findUnique).mockResolvedValue(null)

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: {
            user: { id: 'user-ok' },
            session: { access_token: 'jwt-token' },
          },
          error: null,
        }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(prisma.loginAttempt.deleteMany).mockResolvedValue({ count: 0 } as any)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-ok',
      email: 'ok@test.com',
      username: 'okuser',
      role: 'BACKEND',
      avatarUrl: null,
      description: null,
      avgRating: 0,
      totalRatings: 0,
      createdAt: new Date(),
    } as any)

    const result = await loginUser({ email: 'ok@test.com', password: 'CorrectPass!' })

    expect(result.user.id).toBe('user-ok')
    expect(result.accessToken).toBe('jwt-token')
  })
})

// ─────────────────────────────────────────────────────────
// logoutUser
// ─────────────────────────────────────────────────────────
describe('logoutUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('llama a supabase.auth.signOut y resuelve sin error', async () => {
    const mockSupabase = {
      auth: { signOut: vi.fn().mockResolvedValue({}) },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    await expect(logoutUser('some-token')).resolves.toBeUndefined()
    expect(mockSupabase.auth.signOut).toHaveBeenCalled()
  })

  it('no lanza aunque signOut falle (best-effort)', async () => {
    const mockSupabase = {
      auth: { signOut: vi.fn().mockRejectedValue(new Error('Network error')) },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    await expect(logoutUser()).resolves.toBeUndefined()
  })

  it('funciona sin token (accessToken opcional)', async () => {
    const mockSupabase = {
      auth: { signOut: vi.fn().mockResolvedValue({}) },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    await expect(logoutUser()).resolves.toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────
// syncOAuthUserSession
// ─────────────────────────────────────────────────────────
describe('syncOAuthUserSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lanza OAUTH_EMAIL_REQUIRED si el authUser no tiene email', async () => {
    await expect(
      syncOAuthUserSession({ id: 'oauth-1', email: null, userMetadata: {} })
    ).rejects.toThrow('OAUTH_EMAIL_REQUIRED')
  })

  it('retorna el usuario existente si ya hay registro con ese id (sin cambios)', async () => {
    const existingUser = {
      id: 'oauth-1', email: 'oauth@test.com', username: 'oauthuser',
      role: 'FRONTEND', avatarUrl: null, description: null,
      avgRating: 0, totalRatings: 0, createdAt: new Date(),
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser as any)

    const result = await syncOAuthUserSession({
      id: 'oauth-1', email: 'oauth@test.com', userMetadata: {},
    })

    expect(result.id).toBe('oauth-1')
    expect(prisma.user.create).not.toHaveBeenCalled()
  })

  it('crea un nuevo usuario OAuth si no existe ninguno con ese id', async () => {
    // findUnique por id → null; findUnique por email → null
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    // ensureUniqueUsername internamente llama findUnique para username → null
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.user.create).mockResolvedValue({
      id: 'new-oauth', email: 'newuser@test.com', username: 'newuser',
      role: 'FRONTEND', avatarUrl: null, description: null,
      avgRating: 0, totalRatings: 0, createdAt: new Date(),
    } as any)

    const result = await syncOAuthUserSession({
      id: 'new-oauth', email: 'newuser@test.com', userMetadata: {},
    })

    expect(result.id).toBe('new-oauth')
    expect(prisma.user.create).toHaveBeenCalled()
  })

  it('lanza OAUTH_EMAIL_CONFLICT si el email ya pertenece a otro usuario', async () => {
    // findUnique por id → null (no existe con ese id)
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(null)  // por id
      .mockResolvedValueOnce({ id: 'otro-usuario' } as any)  // por email (conflicto)

    await expect(
      syncOAuthUserSession({ id: 'oauth-nuevo', email: 'conflict@test.com', userMetadata: {} })
    ).rejects.toThrow('OAUTH_EMAIL_CONFLICT')
  })

  it('actualiza email y avatarUrl cuando el usuario ya existe pero ambos cambiaron', async () => {
    const existingUser = {
      id: 'oauth-1', email: 'old@test.com', username: 'oauthuser',
      role: 'FRONTEND', avatarUrl: null, description: null,
      avgRating: 0, totalRatings: 0, createdAt: new Date(),
    }
    const updatedUser = { ...existingUser, email: 'new@test.com', avatarUrl: 'http://avatar.com/pic.png' }

    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(existingUser as any)  // findUnique por id — existe
      .mockResolvedValueOnce(null)                  // findUnique por email — no hay conflicto

    vi.mocked(prisma.user.update).mockResolvedValue(updatedUser as any)

    const result = await syncOAuthUserSession({
      id: 'oauth-1',
      email: 'new@test.com',
      userMetadata: { avatar_url: 'http://avatar.com/pic.png' },
    })

    expect(result.email).toBe('new@test.com')
    expect(result.avatarUrl).toBe('http://avatar.com/pic.png')
    expect(prisma.user.update).toHaveBeenCalled()
  })

  it('lanza OAUTH_EMAIL_CONFLICT cuando el email cambiado ya pertenece a otro (existingById)', async () => {
    const existingUser = {
      id: 'oauth-1', email: 'old@test.com', username: 'oauthuser',
      role: 'FRONTEND', avatarUrl: null, description: null,
      avgRating: 0, totalRatings: 0, createdAt: new Date(),
    }

    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce(existingUser as any) // findUnique por id — existe
      .mockResolvedValueOnce({ id: 'otro-id' } as any) // findUnique por email — conflicto

    await expect(
      syncOAuthUserSession({ id: 'oauth-1', email: 'conflict@test.com', userMetadata: {} })
    ).rejects.toThrow('OAUTH_EMAIL_CONFLICT')
  })
})

// ─────────────────────────────────────────────────────────
// sendPasswordResetEmail
// ─────────────────────────────────────────────────────────
describe('sendPasswordResetEmail', () => {
  beforeEach(() => vi.clearAllMocks())

  it('llama a supabase.auth.resetPasswordForEmail y resuelve sin error', async () => {
    const mockSupabase = {
      auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    await expect(
      sendPasswordResetEmail({ email: 'user@test.com' })
    ).resolves.toBeUndefined()

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.objectContaining({ redirectTo: expect.any(String) })
    )
  })

  it('normaliza el email en minúsculas antes de enviarlo', async () => {
    const mockSupabase = {
      auth: { resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }) },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    await sendPasswordResetEmail({ email: 'User@TEST.COM' })

    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.any(Object)
    )
  })
})

// ─────────────────────────────────────────────────────────
// changeUserPassword
// ─────────────────────────────────────────────────────────
describe('changeUserPassword', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lanza USER_NOT_FOUND si el usuario no existe en Prisma', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(
      changeUserPassword('no-user', 'token', { currentPassword: 'old', newPassword: 'NewPass1!' })
    ).rejects.toThrow('USER_NOT_FOUND')
  })

  it('lanza INVALID_CURRENT_PASSWORD si Supabase rechaza la re-autenticación', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'user@test.com' } as any)

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: null, session: null },
          error: { message: 'Invalid credentials' },
        }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    await expect(
      changeUserPassword('user-1', 'token', { currentPassword: 'WrongOld!', newPassword: 'NewPass1!' })
    ).rejects.toThrow('INVALID_CURRENT_PASSWORD')
  })

  it('lanza PASSWORD_UPDATE_FAILED si la actualización REST de Supabase falla', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'user@test.com' } as any)

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' }, session: { access_token: 'fresh-tok' } },
          error: null,
        }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    // fetch global retorna un response con ok=false
    global.fetch = vi.fn().mockResolvedValue({ ok: false } as Response)

    await expect(
      changeUserPassword('user-1', 'token', { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' })
    ).rejects.toThrow('PASSWORD_UPDATE_FAILED')
  })

  it('resuelve sin error cuando todo va bien', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'user@test.com' } as any)

    const mockSupabase = {
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { user: { id: 'u1' }, session: { access_token: 'fresh-tok' } },
          error: null,
        }),
      },
    }
    vi.mocked(createSupabaseServerClient).mockResolvedValue(mockSupabase as any)

    global.fetch = vi.fn().mockResolvedValue({ ok: true } as Response)

    await expect(
      changeUserPassword('user-1', 'token', { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' })
    ).resolves.toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────
// updateUserProfile
// ─────────────────────────────────────────────────────────
describe('updateUserProfile', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lanza USER_NOT_FOUND si el usuario no existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    await expect(
      updateUserProfile('no-user', { description: 'test' })
    ).rejects.toThrow('USER_NOT_FOUND')
  })

  it('lanza USERNAME_ALREADY_EXISTS si el username pertenece a otro usuario', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1' } as any)   // existe el usuario
      .mockResolvedValueOnce({ id: 'otro-usuario' } as any) // username ya en uso

    await expect(
      updateUserProfile('user-1', { username: 'ocupado' })
    ).rejects.toThrow('USERNAME_ALREADY_EXISTS')
  })

  it('lanza INVALID_TECHNOLOGIES si algún technologyId no existe', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ id: 'user-1' } as any)
    vi.mocked(prisma.technology.count).mockResolvedValue(0) // ninguno existe

    await expect(
      updateUserProfile('user-1', { technologyIds: ['uuid-no-existe-0000-000000000000'] })
    ).rejects.toThrow('INVALID_TECHNOLOGIES')
  })

  it('actualiza el perfil y retorna el usuario actualizado exitosamente', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1' } as any)  // existe
      .mockResolvedValueOnce({
        id: 'user-1', email: 'u@test.com', username: 'updated',
        role: 'BACKEND', avatarUrl: null, description: 'nueva desc',
        avgRating: 0, totalRatings: 0, createdAt: new Date(),
        technologies: [],
      } as any)

    const mockTx = {
      user: { update: vi.fn().mockResolvedValue({} as any) },
      userTechnology: {
        deleteMany: vi.fn().mockResolvedValue({} as any),
        createMany: vi.fn().mockResolvedValue({} as any),
      },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(mockTx))

    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])

    const result = await updateUserProfile('user-1', { description: 'nueva desc' })

    expect(result.id).toBe('user-1')
    expect(result.description).toBe('nueva desc')
    expect(mockTx.user.update).toHaveBeenCalled()
  })

  it('actualiza role y avatarUrl, y reemplaza technologyIds', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1' } as any)  // usuario existe
      .mockResolvedValueOnce({
        id: 'user-1', email: 'u@test.com', username: 'testuser',
        role: 'FRONTEND', avatarUrl: 'http://img.com/a.png', description: null,
        avgRating: 0, totalRatings: 0, createdAt: new Date(),
        technologies: [{ technology: { id: 'tech-1', name: 'Go', slug: 'go' } }],
      } as any)

    vi.mocked(prisma.technology.count).mockResolvedValue(1) // tech válido

    const mockTx = {
      user: { update: vi.fn().mockResolvedValue({} as any) },
      userTechnology: {
        deleteMany: vi.fn().mockResolvedValue({} as any),
        createMany: vi.fn().mockResolvedValue({} as any),
      },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(mockTx))

    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])

    const result = await updateUserProfile('user-1', {
      role: 'FRONTEND',
      avatarUrl: 'http://img.com/a.png',
      technologyIds: ['tech-1'],
    })

    expect(result.id).toBe('user-1')
    expect(mockTx.userTechnology.deleteMany).toHaveBeenCalled()
    expect(mockTx.userTechnology.createMany).toHaveBeenCalled()
  })

  it('no llama a user.update si no hay campos escalares a cambiar (solo technologyIds)', async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ id: 'user-1' } as any)
      .mockResolvedValueOnce({
        id: 'user-1', email: 'u@test.com', username: 'testuser',
        role: 'BACKEND', avatarUrl: null, description: null,
        avgRating: 0, totalRatings: 0, createdAt: new Date(),
        technologies: [],
      } as any)

    vi.mocked(prisma.technology.count).mockResolvedValue(0) // technologyIds vacío → count=0 pero validación OK

    const mockTx = {
      user: { update: vi.fn().mockResolvedValue({} as any) },
      userTechnology: {
        deleteMany: vi.fn().mockResolvedValue({} as any),
        createMany: vi.fn().mockResolvedValue({} as any),
      },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: any) => fn(mockTx))

    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ count: 0 }])
      .mockResolvedValueOnce([{ count: 0 }])

    // technologyIds vacío es válido (limpia las tecnologías del usuario)
    const result = await updateUserProfile('user-1', { technologyIds: [] })

    expect(result.id).toBe('user-1')
    // user.update no debería llamarse porque no hay campos escalares
    expect(mockTx.user.update).not.toHaveBeenCalled()
    // deleteMany sí se llama para limpiar las tecnologías
    expect(mockTx.userTechnology.deleteMany).toHaveBeenCalled()
    // createMany NO se llama porque la lista está vacía
    expect(mockTx.userTechnology.createMany).not.toHaveBeenCalled()
  })
})
