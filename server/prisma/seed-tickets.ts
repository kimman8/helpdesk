import 'dotenv/config'
import prisma from '../src/lib/db'
import { TicketStatus, TicketCategory } from '../../packages/core/src/constants/tickets'

const existing = await prisma.ticket.count()
if (existing >= 100) {
  console.log(`${existing} tickets already exist, skipping.`)
  process.exit(0)
}

const agent = await prisma.user.findUnique({ where: { email: 'agent@example.com' } })

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

const CUSTOMERS = [
  { name: 'Sarah Mitchell',    email: 'sarah.mitchell@gmail.com' },
  { name: 'James Thornton',    email: 'j.thornton@outlook.com' },
  { name: 'Priya Nair',        email: 'priya.nair@yahoo.com' },
  { name: 'Carlos Vega',       email: 'carlosvega@hotmail.com' },
  { name: 'Emily Hartmann',    email: 'e.hartmann@protonmail.com' },
  { name: 'David Okonkwo',     email: 'david.okonkwo@gmail.com' },
  { name: 'Aisha Bakr',        email: 'aisha.bakr@icloud.com' },
  { name: 'Tom Briggs',        email: 'tombriggs@gmail.com' },
  { name: 'Mei Lin',           email: 'mei.lin.work@gmail.com' },
  { name: 'Robert Pearce',     email: 'rpearce@outlook.com' },
  { name: 'Fatima Zahra',      email: 'fatima.z@yahoo.com' },
  { name: 'Lucas Ferreira',    email: 'lucas.ferreira@gmail.com' },
  { name: 'Hannah Kovacs',     email: 'h.kovacs@gmail.com' },
  { name: 'Tariq Hassan',      email: 'tariq.hassan@hotmail.com' },
  { name: 'Ingrid Sorensen',   email: 'ingrid.s@protonmail.com' },
  { name: 'Marcus Webb',       email: 'marcus.webb@gmail.com' },
  { name: 'Yuki Tanaka',       email: 'yuki.tanaka@icloud.com' },
  { name: 'Nadia Petrova',     email: 'nadia.petrova@outlook.com' },
  { name: 'Omar Khalil',       email: 'omar.khalil@gmail.com' },
  { name: 'Chloe Dupont',      email: 'chloe.dupont@gmail.com' },
  { name: 'Ivan Novak',        email: 'ivan.novak@yahoo.com' },
  { name: 'Zara Ahmed',        email: 'zara.ahmed@gmail.com' },
  { name: 'Ben McCarthy',      email: 'ben.mccarthy@hotmail.com' },
  { name: 'Leila Moradi',      email: 'leila.moradi@protonmail.com' },
  { name: 'Alex Turner',       email: 'alexturner@gmail.com' },
]

const GENERAL_SUBJECTS = [
  'How do I update my billing address?',
  'Can I transfer my subscription to another account?',
  'What payment methods do you accept?',
  'How do I add a team member to my plan?',
  'Where can I find my invoice history?',
  'Can I pause my subscription instead of cancelling?',
  'What are your support hours?',
  'How do I change my account email address?',
  'Is there a limit on the number of projects I can create?',
  'How do I export my data?',
  'Do you offer discounts for nonprofits?',
  'How do I enable two-factor authentication?',
  'Can I downgrade my plan mid-cycle?',
  'What happens to my data if I cancel?',
  'How do I invite collaborators to a workspace?',
  'Is there a mobile app available?',
  'How do I change my password?',
  'Can I use the service in multiple countries?',
  'What is your data retention policy?',
  'How do I delete my account?',
  'Do you offer annual billing discounts?',
  'How do I set up email notifications?',
  'Can I merge two accounts?',
  'What is the difference between the plans?',
  'How do I access the API documentation?',
]

const TECHNICAL_SUBJECTS = [
  'Login page keeps saying "invalid credentials" but password is correct',
  'App crashes immediately after uploading a CSV file',
  'API returning 429 Too Many Requests — what are the rate limits?',
  'Webhook not firing after order completion',
  'Two-factor authentication code not being delivered via SMS',
  'Dashboard charts not loading in Firefox 120',
  'CSV export is missing columns that were added last month',
  'Single sign-on (SSO) integration failing with Okta',
  'Email notifications stopped arriving three days ago',
  'File uploads fail silently above 10 MB',
  'Search results not returning recent records',
  'API key authentication returning 403 even with correct scopes',
  'Mobile app crashes on iOS 17.4 when opening attachments',
  'Zapier integration stopped working after last update',
  'Reports page throws a 500 error when date range exceeds 90 days',
  'Slow performance when filtering large datasets',
  'Auto-save not working in the document editor',
  'OAuth redirect URL rejected after migrating to new domain',
  'Bulk import returns "Invalid format" for a file that worked before',
  'Timezone shown incorrectly in scheduled reports',
  'Password reset email never arrives',
  'Account locked after too many login attempts — cannot unlock',
  'Embedded widget showing blank on Safari',
  'Custom domain configuration not taking effect',
  'Audit log missing entries from the past week',
  'GraphQL mutations returning null instead of updated record',
  'Pagination breaks after applying a search filter',
  'Dark mode toggle reverting to light mode on page refresh',
  'CORS errors when calling API from a custom subdomain',
  'Notification badges not clearing after messages are read',
  'Sorting by date column producing inconsistent results',
  'PDF export rendering tables incorrectly',
  'Real-time updates stopped working after network reconnect',
  'User permissions not applying immediately after role change',
  'Billing portal throwing a white screen on first load',
  'Import job stuck at 0% for over an hour',
  'Calendar integration showing events in wrong timezone',
]

const REFUND_SUBJECTS = [
  'Requesting refund — cancelled within 24 hours of purchase',
  'Charged twice for the same subscription renewal',
  'Refund request: purchased wrong plan by mistake',
  'Annual plan auto-renewed without notification — please refund',
  'Double charge on invoice #INV-00482',
  'Refund for unused months after early account closure',
  'Billed at old price after discount code was applied',
  'Refund needed — service was down for 4 days this month',
  'Charged for seats that were removed 2 months ago',
  'Promotional trial converted to paid without consent',
  'Refund request for order #ORD-7741 — item not as described',
  'Please reverse charge from 12 May — account was already cancelled',
  'Overcharged due to currency conversion error',
  'Accidental upgrade — reverting and requesting partial refund',
  'Refund for add-on feature that was never activated',
  'Charged during free trial period',
  'Annual billing charged after requesting monthly switch',
  'Team plan charged for 10 seats but we only have 3 users',
  'Duplicate transaction on card ending in 4821',
  'Refund request — product did not meet advertised specifications',
  'Subscription renewed on wrong credit card after card update',
  'Requesting prorated refund after plan downgrade',
  'VAT charged incorrectly — we have a valid EU VAT number',
  'Refund for cancelled workshop registration',
  'Platform unavailable during our launch week — requesting compensation',
]

// 100 tickets: 33 general, 34 technical, 33 refund
const TICKET_SPECS: Array<{
  subject: string
  category: TicketCategory
  status: TicketStatus
  daysAgo: number
  assignToAgent: boolean
  firstMessage: string
}> = [
  ...GENERAL_SUBJECTS.map((subject, i) => ({
    subject,
    category: TicketCategory.GENERAL_QUESTION,
    status: ([TicketStatus.OPEN, TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED] as const)[i % 4],
    daysAgo: (i * 3) % 85 + 1,
    assignToAgent: i % 3 === 0,
    firstMessage: `Hi, ${subject.toLowerCase()} Thanks for any help you can provide.`,
  })),
  ...TECHNICAL_SUBJECTS.map((subject, i) => ({
    subject,
    category: TicketCategory.TECHNICAL_QUESTION,
    status: ([TicketStatus.OPEN, TicketStatus.OPEN, TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED] as const)[i % 5],
    daysAgo: (i * 2) % 75 + 1,
    assignToAgent: i % 2 === 0,
    firstMessage: `Hello, I'm experiencing the following issue: ${subject.toLowerCase()} This started happening recently and is blocking my work. Please advise.`,
  })),
  ...REFUND_SUBJECTS.map((subject, i) => ({
    subject,
    category: TicketCategory.REFUND_REQUEST,
    status: ([TicketStatus.OPEN, TicketStatus.RESOLVED, TicketStatus.CLOSED] as const)[i % 3],
    daysAgo: (i * 4) % 90 + 1,
    assignToAgent: i % 4 === 0,
    firstMessage: `Dear support team, ${subject.toLowerCase()} Please process this as soon as possible. My account number is ACC-${10000 + i * 7}.`,
  })),
]

console.log(`Creating ${TICKET_SPECS.length} tickets…`)

for (const [i, spec] of TICKET_SPECS.entries()) {
  const customer = CUSTOMERS[i % CUSTOMERS.length]
  const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000)

  await prisma.ticket.create({
    data: {
      subject: spec.subject,
      status: spec.status,
      category: spec.category,
      fromEmail: customer.email,
      fromName: customer.name,
      assignedTo: spec.assignToAgent && agent ? agent.id : null,
      createdAt,
      updatedAt: createdAt,
      messages: {
        create: {
          body: spec.firstMessage,
          fromEmail: customer.email,
          fromName: customer.name,
          isAgent: false,
          createdAt,
        },
      },
    },
  })
}

console.log(`Done — ${TICKET_SPECS.length} tickets created.`)
