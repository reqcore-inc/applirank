import { createAuthClient } from 'better-auth/vue'
import { organizationClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [
    organizationClient(),
  ],
})
