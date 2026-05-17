export const Role = {
  ADMIN: 'admin',
  AGENT: 'agent',
} as const

export type Role = (typeof Role)[keyof typeof Role]
