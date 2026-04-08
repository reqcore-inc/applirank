import { createAuthClient } from 'better-auth/vue'
import { organizationClient, genericOAuthClient } from 'better-auth/client/plugins'
import { ac, owner, admin, member } from '~~/shared/permissions'

export const authClient = createAuthClient({
  plugins: [
    genericOAuthClient(),
    organizationClient({
      ac,
      roles: { owner, admin, member },
    }),
  ],
})
