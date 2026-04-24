import { eq } from 'drizzle-orm'
import { orgSettings } from '../../database/schema'

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, { organization: ['read'] })
  const orgId = session.session.activeOrganizationId

  const settings = await db.query.orgSettings.findFirst({
    where: eq(orgSettings.organizationId, orgId),
    columns: {
      nameDisplayFormat: true,
      dateFormat: true,
    },
  })

  // Return defaults if no settings row exists yet
  return {
    nameDisplayFormat: settings?.nameDisplayFormat ?? 'first_last',
    dateFormat: settings?.dateFormat ?? 'mdy',
  }
})
