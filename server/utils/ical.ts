/**
 * iCalendar (.ics) generation for interview invitations.
 * Implements RFC 5545 (iCalendar) and RFC 5546 (iTIP METHOD:REQUEST).
 *
 * Generates .ics files that natively integrate with Gmail, Outlook,
 * and Apple Mail â€” adding the event to the candidate's calendar on accept.
 */

export interface ICalEvent {
  /** Interview UUID â€” used to build the UID for update/cancel sync */
  interviewId: string
  /** Interview title */
  summary: string
  /** Detailed description (plain text) */
  description: string
  /** Interview start time */
  startTime: Date
  /** Duration in minutes */
  durationMinutes: number
  /** Location or meeting link */
  location: string | null
  /** Organizer display name */
  organizerName: string
  /** Organizer email address */
  organizerEmail: string
  /** Candidate email address (attendee) */
  attendeeEmail: string
  /** Candidate full name */
  attendeeName: string
  /** Sequence number for updates (0 = first invite, increment for reschedules) */
  sequence?: number
}

/**
 * Fold long lines per RFC 5545 Â§3.1: lines MUST NOT exceed 75 octets.
 * Continuation lines begin with a single space (LWSP).
 */
function foldLine(line: string): string {
  const maxOctets = 75
  const parts: string[] = []
  let remaining = line

  while (Buffer.byteLength(remaining, 'utf-8') > maxOctets) {
    // Find a safe split point within the octet limit
    let splitAt = maxOctets
    while (splitAt > 0 && Buffer.byteLength(remaining.slice(0, splitAt), 'utf-8') > maxOctets) {
      splitAt--
    }
    parts.push(remaining.slice(0, splitAt))
    remaining = ' ' + remaining.slice(splitAt)
  }
  parts.push(remaining)
  return parts.join('\r\n')
}

/**
 * Escape text values per RFC 5545 Â§3.3.11.
 */
function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

/**
 * Format a Date as an iCal UTC datetime string (YYYYMMDDTHHMMSSZ).
 */
function formatDateTimeUTC(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const h = String(date.getUTCHours()).padStart(2, '0')
  const min = String(date.getUTCMinutes()).padStart(2, '0')
  const s = String(date.getUTCSeconds()).padStart(2, '0')
  return `${y}${m}${d}T${h}${min}${s}Z`
}

/**
 * Generate the current UTC timestamp for DTSTAMP.
 */
function nowStamp(): string {
  return formatDateTimeUTC(new Date())
}

/**
 * Generate a METHOD:REQUEST iCalendar (.ics) string for an interview invitation.
 * This format is recognized by all major email clients (Gmail, Outlook, Apple Mail)
 * and shows native Accept/Decline/Tentative buttons.
 */
export function generateInterviewICS(event: ICalEvent): string {
  const endTime = new Date(event.startTime.getTime() + event.durationMinutes * 60_000)
  const uid = `interview-${event.interviewId}@WWMate.com`
  const sequence = event.sequence ?? 0

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WWMate//Interview Scheduling//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStamp()}`,
    `DTSTART:${formatDateTimeUTC(event.startTime)}`,
    `DTEND:${formatDateTimeUTC(endTime)}`,
    `SUMMARY:${escapeICalText(event.summary)}`,
    `DESCRIPTION:${escapeICalText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeICalText(event.location)}`] : []),
    `ORGANIZER;CN=${escapeICalText(event.organizerName)}:mailto:${event.organizerEmail}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${escapeICalText(event.attendeeName)}:mailto:${event.attendeeEmail}`,
    `SEQUENCE:${sequence}`,
    'STATUS:CONFIRMED',
    'TRANSP:OPAQUE',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Interview reminder',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/**
 * Generate a METHOD:CANCEL iCalendar for cancelling a previously sent interview.
 * When the candidate's email client processes this, the event is removed from their calendar.
 */
export function generateCancellationICS(event: Pick<ICalEvent, 'interviewId' | 'summary' | 'startTime' | 'durationMinutes' | 'organizerName' | 'organizerEmail' | 'attendeeEmail' | 'attendeeName'> & { sequence?: number }): string {
  const endTime = new Date(event.startTime.getTime() + event.durationMinutes * 60_000)
  const uid = `interview-${event.interviewId}@WWMate.com`
  const sequence = (event.sequence ?? 0) + 1

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WWMate//Interview Scheduling//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:CANCEL',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${nowStamp()}`,
    `DTSTART:${formatDateTimeUTC(event.startTime)}`,
    `DTEND:${formatDateTimeUTC(endTime)}`,
    `SUMMARY:Cancelled: ${escapeICalText(event.summary)}`,
    `ORGANIZER;CN=${escapeICalText(event.organizerName)}:mailto:${event.organizerEmail}`,
    `ATTENDEE;CN=${escapeICalText(event.attendeeName)}:mailto:${event.attendeeEmail}`,
    `SEQUENCE:${sequence}`,
    'STATUS:CANCELLED',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  return lines.map(foldLine).join('\r\n') + '\r\n'
}

