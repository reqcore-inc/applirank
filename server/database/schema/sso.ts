import {
  pgTable,
  text,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user, organization } from './auth'

// ─────────────────────────────────────────────
// SSO Provider Table (Better Auth SSO Plugin)
// ─────────────────────────────────────────────

export const ssoProvider = pgTable('sso_provider', {
  id: text('id').primaryKey(),
  issuer: text('issuer').notNull(),
  domain: text('domain').notNull(),
  oidcConfig: text('oidc_config'),
  samlConfig: text('saml_config'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  organizationId: text('organization_id').references(() => organization.id, { onDelete: 'cascade' }),
}, (t) => ([
  index('sso_provider_domain_idx').on(t.domain),
  index('sso_provider_provider_id_idx').on(t.providerId),
  index('sso_provider_organization_id_idx').on(t.organizationId),
]))

export const ssoProviderRelations = relations(ssoProvider, ({ one }) => ({
  user: one(user, { fields: [ssoProvider.userId], references: [user.id] }),
  organization: one(organization, { fields: [ssoProvider.organizationId], references: [organization.id] }),
}))
