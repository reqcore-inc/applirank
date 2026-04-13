import { Resend } from 'resend'

let _resend: Resend | undefined

/**
 * Returns a lazily-initialized Resend client.
 * Returns `null` when RESEND_API_KEY is not configured (dev/testing fallback).
 */
function getResendClient(): Resend | null {
  const apiKey = env.RESEND_API_KEY
  if (!apiKey) return null

  if (!_resend) {
    _resend = new Resend(apiKey)
  }
  return _resend
}

/**
 * Send an email verification link via Resend.
 * Falls back to console.info when RESEND_API_KEY is not set.
 *
 * Called by Better Auth when requireEmailVerification is enabled.
 * Not awaited by the caller (fire-and-forget) to prevent timing attacks.
 */
export async function sendVerificationEmail(data: {
  user: { email: string; name: string }
  url: string
  token: string
}): Promise<void> {
  const resend = getResendClient()

  if (!resend) {
    console.info(
      `[Reqcore] Verification email → ${data.user.email} | ` +
      `Link: ${data.url}`,
    )
    return
  }

  const fromEmail = env.RESEND_FROM_EMAIL

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [data.user.email],
    subject: 'Verify your email address — Reqcore',
    html: buildVerificationHtml({ url: data.url }),
    text: buildVerificationText({ url: data.url }),
    tags: [{ name: 'category', value: 'verification' }],
  })

  if (error) {
    logError('email.verification_send_failed', {
      provider: 'resend',
      error_message: error.message,
    })
  }
}

/**
 * Send a password reset link via Resend.
 * Falls back to console.info when RESEND_API_KEY is not set.
 *
 * Called by Better Auth when sendResetPassword is configured.
 * Not awaited by the caller (fire-and-forget) to prevent timing attacks.
 */
export async function sendPasswordResetEmail(data: {
  user: { email: string; name: string }
  url: string
  token: string
}): Promise<void> {
  const resend = getResendClient()

  if (!resend) {
    console.info(
      `[Reqcore] Password reset email → ${data.user.email} | ` +
      `Link: ${data.url}`,
    )
    return
  }

  const fromEmail = env.RESEND_FROM_EMAIL

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [data.user.email],
    subject: 'Reset your password — Reqcore',
    html: buildPasswordResetHtml({ url: data.url }),
    text: buildPasswordResetText({ url: data.url }),
    tags: [{ name: 'category', value: 'password-reset' }],
  })

  if (error) {
    logError('email.password_reset_send_failed', {
      provider: 'resend',
      error_message: error.message,
    })
  }
}

/**
 * Send an organization invitation email via Resend.
 * Falls back to console.info when RESEND_API_KEY is not set.
 */
export async function sendOrgInvitationEmail(data: {
  id: string
  email: string
  inviter: { user: { name: string; email: string } }
  organization: { name: string }
  role: string
}, inviteLink: string): Promise<void> {
  const resend = getResendClient()

  if (!resend) {
    // Dev/test fallback — log invitation link to console
    console.info(
      `[Reqcore] Invitation email → ${data.email} | ` +
      `Invited by ${data.inviter.user.name} (${data.inviter.user.email}) | ` +
      `Org: ${data.organization.name} | ` +
      `Role: ${data.role} | ` +
      `Link: ${inviteLink}`,
    )
    return
  }

  const fromEmail = env.RESEND_FROM_EMAIL

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [data.email],
    subject: `You're invited to join ${data.organization.name} on Reqcore`,
    html: buildInvitationHtml({
      inviteeName: data.email,
      inviterName: data.inviter.user.name,
      inviterEmail: data.inviter.user.email,
      organizationName: data.organization.name,
      role: data.role,
      inviteLink,
    }),
    text: buildInvitationText({
      inviterName: data.inviter.user.name,
      organizationName: data.organization.name,
      role: data.role,
      inviteLink,
    }),
    tags: [
      { name: 'category', value: 'invitation' },
      { name: 'organization', value: data.organization.name.slice(0, 256).replace(/[^a-zA-Z0-9_-]/g, '_') },
    ],
  })

  if (error) {
    logError('email.invitation_send_failed', {
      provider: 'resend',
      error_message: error.message,
    })
    throw new Error(`Failed to send invitation email: ${error.message}`)
  }

  console.info(`[Reqcore] Invitation email sent to ${data.email} via Resend`)
}

// ─────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────

function buildInvitationHtml(params: {
  inviteeName: string
  inviterName: string
  inviterEmail: string
  organizationName: string
  role: string
  inviteLink: string
}): string {
  const { inviterName, organizationName, role, inviteLink } = params

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're invited to ${escapeHtml(organizationName)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">Reqcore</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b;">You've been invited</h2>
              <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
                <strong>${escapeHtml(inviterName)}</strong> has invited you to join
                <strong>${escapeHtml(organizationName)}</strong> as a <strong>${escapeHtml(role)}</strong>.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                Click the button below to accept the invitation. You'll need to sign in or create an account first.
              </p>
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(inviteLink)}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;line-height:1;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
                This invitation expires in 48 hours. If you didn't expect this email, you can safely ignore it.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Sent by Reqcore &mdash; Open-source applicant tracking
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildInvitationText(params: {
  inviterName: string
  organizationName: string
  role: string
  inviteLink: string
}): string {
  return [
    `You've been invited to join ${params.organizationName}`,
    '',
    `${params.inviterName} has invited you to join ${params.organizationName} as a ${params.role}.`,
    '',
    'Accept the invitation by visiting the link below:',
    params.inviteLink,
    '',
    'This invitation expires in 48 hours.',
    'If you didn\'t expect this email, you can safely ignore it.',
    '',
    '— Reqcore',
  ].join('\n')
}

/**
 * Escape HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─────────────────────────────────────────────
// Email verification & password reset templates
// ─────────────────────────────────────────────

function buildVerificationHtml(params: { url: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">Reqcore</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b;">Verify your email</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                Click the button below to verify your email address and activate your account.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(params.url)}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;line-height:1;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
                If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Sent by Reqcore &mdash; Open-source applicant tracking</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildVerificationText(params: { url: string }): string {
  return [
    'Verify your email address',
    '',
    'Click the link below to verify your email and activate your Reqcore account:',
    params.url,
    '',
    'If you didn\'t create an account, you can safely ignore this email.',
    '',
    '— Reqcore',
  ].join('\n')
}

function buildPasswordResetHtml(params: { url: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">Reqcore</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#09090b;">Reset your password</h2>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">
                Click the button below to reset your password. This link will expire shortly.
              </p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${escapeHtml(params.url)}" target="_blank" rel="noopener noreferrer"
                       style="display:inline-block;padding:12px 32px;background-color:#2563eb;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px;line-height:1;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
                If you didn't request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Sent by Reqcore &mdash; Open-source applicant tracking</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildPasswordResetText(params: { url: string }): string {
  return [
    'Reset your password',
    '',
    'Click the link below to reset your Reqcore password:',
    params.url,
    '',
    'If you didn\'t request this, you can safely ignore this email.',
    '',
    '— Reqcore',
  ].join('\n')
}

// ─────────────────────────────────────────────
// Interview invitation emails
// ─────────────────────────────────────────────

export interface InterviewEmailData {
  candidateName: string
  candidateFirstName: string
  candidateLastName: string
  candidateEmail: string
  jobTitle: string
  interviewTitle: string
  interviewDate: string
  interviewTime: string
  interviewDuration: number
  interviewType: string
  interviewLocation: string | null
  interviewers: string[] | null
  organizationName: string
  /** Response URLs for accept/decline/tentative (omitted = no response links) */
  responseUrls?: {
    accepted: string
    declined: string
    tentative: string
  }
  /** iCalendar (.ics) file content to attach */
  icsContent?: string
}

/**
 * Replace {{variable}} placeholders in a template string with actual values.
 * Only replaces known variables to prevent injection of unexpected content.
 */
export function renderTemplate(template: string, data: InterviewEmailData): string {
  const variables: Record<string, string> = {
    candidateName: data.candidateName,
    candidateFirstName: data.candidateFirstName,
    candidateLastName: data.candidateLastName,
    candidateEmail: data.candidateEmail,
    jobTitle: data.jobTitle,
    interviewTitle: data.interviewTitle,
    interviewDate: data.interviewDate,
    interviewTime: data.interviewTime,
    interviewDuration: String(data.interviewDuration),
    interviewType: data.interviewType,
    interviewLocation: data.interviewLocation ?? 'To be confirmed',
    interviewers: data.interviewers?.join(', ') ?? 'To be confirmed',
    organizationName: data.organizationName,
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in variables ? variables[key]! : match
  })
}

/**
 * Send an interview invitation email to a candidate via Resend.
 * Includes an .ics calendar attachment and response links when provided.
 * Falls back to console.info when RESEND_API_KEY is not set.
 */
export async function sendInterviewInvitationEmail(params: {
  subject: string
  body: string
  data: InterviewEmailData
}): Promise<void> {
  const renderedSubject = renderTemplate(params.subject, params.data)
  const renderedBody = renderTemplate(params.body, params.data)

  const resend = getResendClient()

  if (!resend) {
    console.info(
      `[Reqcore] Interview invitation email → ${params.data.candidateEmail} | ` +
      `Subject: ${renderedSubject} | ` +
      `Interview: ${params.data.interviewTitle} | ` +
      `Date: ${params.data.interviewDate} at ${params.data.interviewTime}` +
      (params.data.icsContent ? ' | .ics attached' : '') +
      (params.data.responseUrls ? ' | response links included' : ''),
    )
    return
  }

  const fromEmail = env.RESEND_FROM_EMAIL

  // Build attachments array — include .ics when available
  const attachments = params.data.icsContent
    ? [{
        filename: 'interview.ics',
        content: Buffer.from(params.data.icsContent).toString('base64'),
        content_type: 'text/calendar; method=REQUEST',
      }]
    : undefined

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: [params.data.candidateEmail],
    subject: renderedSubject,
    html: buildInterviewInvitationHtml(renderedSubject, renderedBody, params.data),
    text: buildInterviewInvitationText(renderedBody, params.data.responseUrls),
    ...(attachments ? { attachments } : {}),
    tags: [
      { name: 'category', value: 'interview-invitation' },
      { name: 'interview', value: params.data.interviewTitle.slice(0, 256).replace(/[^a-zA-Z0-9_-]/g, '_') },
    ],
  })

  if (error) {
    logError('email.interview_invitation_send_failed', {
      provider: 'resend',
      error_message: error.message,
    })
    throw new Error(`Failed to send interview invitation email: ${error.message}`)
  }

  console.info(`[Reqcore] Interview invitation email sent to ${params.data.candidateEmail} via Resend`)
}

function buildInterviewInvitationHtml(subject: string, bodyText: string, data: InterviewEmailData): string {
  const bodyHtml = escapeHtml(bodyText).replace(/\n/g, '<br />')

  // Build response buttons HTML when URLs are available
  const responseButtonsHtml = data.responseUrls
    ? `
          <!-- Response Buttons -->
          <tr>
            <td style="padding:0 32px 32px;">
              <div style="border-top:1px solid #e4e4e7;padding-top:24px;">
                <p style="margin:0 0 16px;font-size:14px;font-weight:600;color:#09090b;text-align:center;">
                  Can you make it?
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:0 4px;">
                            <a href="${escapeHtml(data.responseUrls.accepted)}" target="_blank" rel="noopener noreferrer"
                               style="display:inline-block;padding:10px 20px;background-color:#16a34a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;line-height:1;">
                              &#10003; Accept
                            </a>
                          </td>
                          <td style="padding:0 4px;">
                            <a href="${escapeHtml(data.responseUrls.tentative)}" target="_blank" rel="noopener noreferrer"
                               style="display:inline-block;padding:10px 20px;background-color:#ca8a04;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;line-height:1;">
                              &#63; Maybe
                            </a>
                          </td>
                          <td style="padding:0 4px;">
                            <a href="${escapeHtml(data.responseUrls.declined)}" target="_blank" rel="noopener noreferrer"
                               style="display:inline-block;padding:10px 20px;background-color:#dc2626;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;border-radius:6px;line-height:1;">
                              &#10005; Decline
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid #f4f4f5;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#09090b;">${escapeHtml(data.organizationName)}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <div style="font-size:14px;line-height:1.7;color:#3f3f46;">
                ${bodyHtml}
              </div>
            </td>
          </tr>${responseButtonsHtml}
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;text-align:center;border-top:1px solid #f4f4f5;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Sent by ${escapeHtml(data.organizationName)} via Reqcore
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/**
 * Build plain-text email body with response links appended.
 */
function buildInterviewInvitationText(
  renderedBody: string,
  responseUrls?: InterviewEmailData['responseUrls'],
): string {
  if (!responseUrls) return renderedBody

  return [
    renderedBody,
    '',
    '─────────────────────────────',
    'Respond to this invitation:',
    '',
    `✓ Accept: ${responseUrls.accepted}`,
    `? Maybe:  ${responseUrls.tentative}`,
    `✗ Decline: ${responseUrls.declined}`,
    '',
    '─────────────────────────────',
  ].join('\n')
}
