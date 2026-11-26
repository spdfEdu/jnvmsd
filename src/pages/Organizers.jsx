import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Eye, ShieldAlert, Users } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useResource } from '../lib/useResource';
import { Page, Status } from '../components/alumni/UI';
import {
  AlumniConnectDeck,
  BentoFeatureBand,
  FaqAccordionBand,
  MotionCard,
  MotionSection,
  StatsShowcase,
} from '../components/alumni/MotionShowcase';

const ORGANIZER_PRINCIPLES = [
  {
    icon: Eye,
    tag: 'Read-Only Roster',
    title: 'Zero Accidental Mutations',
    body: 'Core organizers can inspect live event participation, meal preferences, and T-shirt sizes without risking edits.',
  },
  {
    icon: Users,
    tag: 'Cross-Batch Coordination',
    title: 'Contact Details for Outreach',
    body: 'Reach registered attendees by batch, phone, or email to organize travel, stage volunteering, and welcome desks.',
  },
  {
    icon: ClipboardList,
    tag: 'Hospitality Counts',
    title: 'Breakfast, Lunch & Companion Totals',
    body: 'Track companion headcounts and dietary logistics cleanly from one consolidated registration table.',
  },
  {
    icon: ShieldAlert,
    tag: 'Server-Verified',
    title: 'Strictly Scoped Permissions',
    body: 'Only accounts assigned the core or admin role can retrieve event registration lists.',
  },
];

const ORGANIZER_FAQS = [
  {
    q: 'Why can core organizers not edit or delete event records here?',
    a: 'Separation of duties protects event configuration and member records. Only administrators can modify records on the Administration page.',
  },
  {
    q: 'How are new batch organizers granted access?',
    a: 'An administrator assigns the core role to a verified member Google account under Administration → Roles.',
  },
];

/** Present all-batch participation details to core members and administrators without edit controls. */
export default function Organizers() {
  const { account, loading } = useAuth();
  const allowed = account?.isAdmin || account?.isCore;
  const events = useResource(allowed ? '/api/events' : null);
  const [selected, setSelected] = useState('');
  const responses = useResource(
    allowed && selected ? `/api/events/${selected}/registrations` : null
  );
  const rows = responses.data?.registrations || responses.data?.responses || [];

  const attendingCount = rows.filter(
    (row) => String(row.attend || row.Attend).toLowerCase() === 'yes'
  ).length;
  const companionTotal = rows.reduce(
    (sum, row) => sum + (Number(row.companions ?? row.CompanionCount ?? 0) || 0),
    0
  );

  return (
    <Page
      eyebrow="Core Coordinator View"
      title="Participation"
      intro="Read-only event responses for authorized alumni organizers."
      actions={
        <>
          <Link to="/directory" className="alumni-action-link alumni-btn-pad">
            Open Directory
          </Link>
          <Link to="/events" className="alumni-action-ghost alumni-btn-pad">
            Public Event View
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad">
          <div className="alumni-stack-sm">
            <span className="alumni-eyebrow">Organizer Access</span>
            <p className="alumni-stat-value">
              {allowed ? `${rows.length} RSVPs` : 'Restricted'}
            </p>
            <p className="alumni-muted">
              {allowed
                ? 'Select a published event below to inspect attendee, meal, and mentoring columns.'
                : 'Sign in with a verified core-member or administrator Google account.'}
            </p>
          </div>
        </MotionCard>
      }
    >
      <MotionSection
        eyebrow="Registration Table"
        title="Inspect event responses"
        description="Choose an event to review live attendee details."
        compact
      >
        {loading ? (
          <p className="alumni-notice">Loading account…</p>
        ) : !allowed ? (
          <div className="alumni-glass alumni-panel-pad">
            <p>Core-member or administrator access is required.</p>
          </div>
        ) : (
          <div className="alumni-stack-md">
            <Status resource={events} />
            <div className="alumni-glass alumni-panel-pad">
              <label className="alumni-field">
                <span>Event</span>
                <select value={selected} onChange={(e) => setSelected(e.target.value)}>
                  <option value="">Choose an event…</option>
                  {events.data?.events?.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {selected && (
              <>
                <Status resource={responses} empty={!rows.length} />
                <div className="alumni-table">
                  <table>
                    <thead>
                      <tr>
                        {[
                          'Name',
                          'Batch',
                          'Email',
                          'Phone',
                          'Attendance',
                          'Companions',
                          'Breakfast',
                          'Lunch',
                          'T-shirt',
                          'Mentoring',
                        ].map((label) => (
                          <th key={label}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={row.email || i}>
                          <td>{row.name || row.Name}</td>
                          <td>{row.batch || row.Batch || '—'}</td>
                          <td>{row.email}</td>
                          <td>{row.phone || row.Phone}</td>
                          <td>{row.attend || row.Attend}</td>
                          <td>{row.companions ?? row.CompanionCount ?? 0}</td>
                          <td>{row.Breakfast || '—'}</td>
                          <td>{row.Lunch || '—'}</td>
                          <td>{row.Tshirt || '—'}</td>
                          <td>{row.Mentor || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </MotionSection>

      <StatsShowcase
        eyebrow="Live Headcount"
        title="Participation breakdown for selected event"
        description="Metrics update automatically whenever you switch events."
        stats={[
          { label: 'Total Responses', value: String(rows.length), detail: 'Submitted registration entries loaded.' },
          { label: 'Attending (Yes)', value: String(attendingCount), detail: 'Alumni confirmed to attend.' },
          { label: 'Companions', value: String(companionTotal), detail: 'Additional guests reported across entries.' },
          { label: 'Access Mode', value: 'Read-Only', detail: 'Protected against accidental record changes.' },
        ]}
      />

      <BentoFeatureBand
        eyebrow="Organizer Playbook"
        title="Built for smooth reunion coordination"
        description="Helping core representatives manage hospitality, stage mentoring, and batch outreach."
        items={ORGANIZER_PRINCIPLES}
      />

      <FaqAccordionBand
        title="Organizer workspace guide"
        description="Clarifying permissions and coordination responsibilities."
        items={ORGANIZER_FAQS}
      />

      <AlumniConnectDeck currentPath="/organizers" />
    </Page>
  );
}
