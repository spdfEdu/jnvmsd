import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Building2, Droplets, Lock, Search, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useResource } from '../lib/useResource';
import { Page, Field, Status } from '../components/alumni/UI';
import {
  AlumniConnectDeck,
  BentoFeatureBand,
  FaqAccordionBand,
  HouseShowcase,
  MotionCard,
  MotionSection,
  StatsShowcase,
} from '../components/alumni/MotionShowcase';

const DIRECTORY_FEATURES = [
  {
    icon: Search,
    tag: 'Fast Lookup',
    title: 'Batch & Name Filtering',
    body: 'Switch between graduating years or filter instantly by classmate name to find peers across the network.',
  },
  {
    icon: ShieldCheck,
    tag: 'Access Control',
    title: 'Tiered Contact Visibility',
    body: 'Public views protect private phone numbers and addresses while verified organizers get full coordination details.',
  },
  {
    icon: Building2,
    tag: 'Career Graph',
    title: 'Profession & Status Insights',
    body: 'Discover where classmates study, work, and build—creating natural mentorship and referral pathways.',
  },
  {
    icon: Lock,
    tag: 'Approved Records',
    title: 'Admin-Reviewed Integrity',
    body: 'Every profile passes verification before appearing in public batch listings, keeping dataset quality high.',
  },
];

const DONOR_FEATURES = [
  {
    icon: Droplets,
    tag: 'Verified Group',
    title: 'Filtered by Blood Group',
    body: 'Only alumni profiles that list a confirmed blood group appear in this rapid-response donor view.',
  },
  {
    icon: Users,
    tag: 'Batch Search',
    title: 'Check Nearby Cohorts',
    body: 'Browse batch years to locate alumni who can coordinate blood donation support through authorized organizers.',
  },
  {
    icon: ShieldCheck,
    tag: 'Protected Contacts',
    title: 'Safe Phone Access',
    body: 'Direct phone numbers remain restricted to verified core members and administrators to prevent misuse.',
  },
  {
    icon: Building2,
    tag: 'Self-Updated',
    title: 'Keep Your Group Current',
    body: 'Sign in on the Profile page to add or verify your blood group in the alumni dataset.',
  },
];

const DIRECTORY_FAQS = [
  {
    q: 'Why are phone numbers and addresses hidden to public visitors?',
    a: 'To protect alumni from spam and scraping. Authorized core members and administrators see full contact details after role verification.',
  },
  {
    q: 'How do I add myself or update my profession in the directory?',
    a: 'Visit My profile, sign in with Google, and submit your details. Updates appear once approved.',
  },
  {
    q: 'How can I appear on the Blood Donors page?',
    a: 'Select your blood group inside your alumni profile form and save your record.',
  },
];

/** Browse approved batch profiles; contact details appear only for authorized organizers. */
export default function Directory({ donors = false }) {
  const { account } = useAuth();
  const [batch, setBatch] = useState(
    new URLSearchParams(window.location.search).get('batch') || '2015'
  );
  const [search, setSearch] = useState('');
  const full = account?.isAdmin || account?.isCore;
  const resource = useResource(
    /^\d{4}$/.test(batch) ? `/api/batch/${batch}?level=${full ? 'full' : 'public'}` : null
  );
  const entries = (resource.data?.entries || []).filter(
    (row) =>
      (!donors || row.BloodGroup) &&
      String(row.Name).toLowerCase().includes(search.toLowerCase())
  );

  const bloodCounts = entries.reduce((acc, row) => {
    if (row.BloodGroup) acc[row.BloodGroup] = (acc[row.BloodGroup] || 0) + 1;
    return acc;
  }, {});

  return (
    <Page
      eyebrow={donors ? 'Emergency Donor Network' : 'Verified Alumni Dataset'}
      title={donors ? 'Blood donors' : 'Alumni directory'}
      intro={
        donors
          ? 'Locate verified JNV Murshidabad alumni by batch and blood group for rapid community support.'
          : 'Find classmates and reconnect with your batch.'
      }
      actions={
        <>
          <Link to="/batches" className="alumni-action-link alumni-btn-pad">
            Browse All Batches
          </Link>
          <Link to="/profile" className="alumni-action-ghost alumni-btn-pad">
            {donors ? 'Register Your Blood Group' : 'Update My Profile'}
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad">
          <div className="alumni-stack-sm">
            <span className="alumni-eyebrow">
              {donors ? 'Active Donor Filter' : 'Active Batch Query'}
            </span>
            <p className="alumni-stat-value">Batch {batch || '—'}</p>
            <p className="alumni-muted">
              {entries.length} matching {donors ? 'blood donor' : 'alumni'} record
              {entries.length === 1 ? '' : 's'} currently displayed.
            </p>
            <span className="alumni-chip alumni-pill-pad">
              {full ? 'Organizer full-contact mode' : 'Public privacy-safe mode'}
            </span>
          </div>
        </MotionCard>
      }
    >
      <MotionSection
        eyebrow={donors ? 'Donor Lookup' : 'Search Dataset'}
        title={donors ? 'Filter donors by batch and name' : 'Explore verified classmate records'}
        description={
          donors
            ? 'Enter a batch year and optionally narrow down by classmate name.'
            : 'Filter by graduating batch year or search by name.'
        }
        compact
      >
        <div className="alumni-glass alumni-panel-pad alumni-stack-md">
          <div className="alumni-toolbar">
            <Field
              label="Batch year"
              type="number"
              min={2008}
              max={2100}
              value={batch}
              onChange={setBatch}
            />
            <Field label="Search by name" value={search} onChange={setSearch} />
          </div>

          {full ? (
            <p className="alumni-notice">
              Contact details are visible to you as an authorized organizer.
            </p>
          ) : (
            <p className="alumni-muted">
              Private contact details are available to administrators and core members.
            </p>
          )}
        </div>

        <Status resource={resource} empty={!entries.length} />

        <div className="alumni-grid">
          {entries.map((row, index) => (
            <motion.article
              className="alumni-card"
              key={row.Name + index}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
              whileHover={{ y: -4 }}
            >
              {(row.photo || row.gpic) && (
                <img
                  className="alumni-avatar"
                  src={row.photo || row.gpic}
                  alt={row.Name}
                  loading="lazy"
                />
              )}
              <h2>{row.Name}</h2>
              <p className="alumni-eyebrow">
                Batch {row.Batch} {row.tag && '· ' + row.tag}
              </p>
              <p>
                {row.Occupation || row.CurrentStatus}{' '}
                {row.Company && '· ' + row.Company}
              </p>
              {row.BloodGroup && <p className="alumni-chip alumni-pill-pad">Blood group: {row.BloodGroup}</p>}
              {row.Bio && <p className="alumni-muted">{row.Bio}</p>}
              {full && (
                <div className="alumni-glass-soft alumni-panel-pad-sm alumni-stack-sm">
                  {row.Phone && <p>{row.Phone}</p>}
                  {row.Phone2 && <p>{row.Phone2}</p>}
                  {row.EmailId && <p>{row.EmailId}</p>}
                  {row.Address && <p>{row.Address}</p>}
                </div>
              )}
            </motion.article>
          ))}
        </div>
      </MotionSection>

      <StatsShowcase
        eyebrow={donors ? 'Blood Group Summary' : 'Batch Breakdown'}
        title={donors ? 'Donor availability in this view' : 'Directory insights for this batch'}
        description="Calculated live from the approved batch records returned above."
        stats={[
          { label: 'Selected Batch', value: batch || '—', detail: 'Active cohort filter in the directory.' },
          { label: 'Visible Profiles', value: String(entries.length), detail: 'Approved entries matching your current query.' },
          {
            label: donors ? 'Blood Groups' : 'Access Tier',
            value: donors ? String(Object.keys(bloodCounts).length) : full ? 'Organizer' : 'Public',
            detail: donors
              ? 'Distinct blood groups represented in this batch.'
              : 'Permissions are enforced on the server API.',
          },
          {
            label: 'Privacy Shield',
            value: full ? 'Authorized' : 'Protected',
            detail: 'Phone and address fields never leak to unauthorized clients.',
          },
        ]}
      />

      <BentoFeatureBand
        eyebrow={donors ? 'Donor Protocol' : 'Dataset Capabilities'}
        title={donors ? 'Safe, fast alumni blood support' : 'How the alumni directory works'}
        description={
          donors
            ? 'Built to help Navodayan families connect with willing donors quickly and responsibly.'
            : 'Designed for effortless discovery without compromising member safety.'
        }
        items={donors ? DONOR_FEATURES : DIRECTORY_FEATURES}
      />

      <HouseShowcase />

      <FaqAccordionBand
        title={donors ? 'Blood donor network guidelines' : 'Directory questions'}
        description="Helpful answers on visibility, verification, and updating your record."
        items={DIRECTORY_FAQS}
      />

      <AlumniConnectDeck currentPath={donors ? '/blood-donors' : '/directory'} />
    </Page>
  );
}
