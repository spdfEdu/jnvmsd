import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { BookOpen, Database, HeartHandshake, ShieldCheck, Users, Compass } from 'lucide-react';
import { Page } from '../components/alumni/UI';
import {
  AlumniConnectDeck,
  BentoFeatureBand,
  FaqAccordionBand,
  HouseShowcase,
  MotionCard,
  MotionSection,
  StatsShowcase,
  TimelineBand,
} from '../components/alumni/MotionShowcase';

const ABOUT_STATS = [
  { label: 'Campus Legacy', value: '2003–2026', detail: 'Two decades of Jawahar Navodaya Vidyalaya Murshidabad cohorts.' },
  { label: 'Residential Houses', value: '4 Houses', detail: 'Aravali, Nilgiri, Shivalik, and Udaigiri united in one ledger.' },
  { label: 'Verified Access', value: 'Role-Based', detail: 'Member-owned profiles with organizer read-only and admin audit tiers.' },
  { label: 'Community Impact', value: '100% Alumni', detail: 'Built by Navodayans for mentorship, blood support, and reunions.' },
];

const MISSION_PILLARS = [
  {
    icon: Database,
    tag: 'Living Dataset',
    title: 'Structured Batch Continuity',
    body: 'Every graduating class stays connected with verified academic, career, and city records maintained by members themselves.',
  },
  {
    icon: ShieldCheck,
    tag: 'Privacy First',
    title: 'Protected Contact Details',
    body: 'Phone numbers, addresses, and alternate contacts are hidden publicly and unlocked only for authorized batch organizers.',
  },
  {
    icon: HeartHandshake,
    tag: 'Mutual Aid',
    title: 'Blood Donor & Emergency Network',
    body: 'Search verified alumni by batch and blood group so families and classmates can mobilize help rapidly.',
  },
  {
    icon: BookOpen,
    tag: 'Shared Archive',
    title: 'Preserving Campus Memories',
    body: 'Curated batch photographs and reunion stories keep JNV Murshidabad traditions alive for younger cohorts.',
  },
  {
    icon: Users,
    tag: 'Mentorship',
    title: 'Cross-Generation Guidance',
    body: 'Senior alumni guide current students and recent graduates across medicine, engineering, civil services, and research.',
  },
  {
    icon: Compass,
    tag: 'Reunions',
    title: 'Coordinated Gatherings',
    body: 'Seamless RSVPs, meal counts, T-shirt sizing, and stage participation tracking for Alumni Meet 2026 and beyond.',
  },
];

const HERITAGE_TIMELINE = [
  {
    step: 'Chapter 01 · Foundation',
    title: 'Residential Roots in Murshidabad',
    body: 'From early morning assemblies to evening study hours, JNV Murshidabad shaped friendships that outlasted graduation.',
  },
  {
    step: 'Chapter 02 · Growing Network',
    title: 'Alumni Spread Across Cities & Professions',
    body: 'Graduates moved into campuses, hospitals, labs, startups, and public service across India and abroad.',
  },
  {
    step: 'Chapter 03 · Unified Platform',
    title: 'Member-Owned Digital Directory',
    body: 'Replacing scattered spreadsheets with an authenticated portal where every alumnus controls their own record.',
  },
  {
    step: 'Chapter 04 · Reunion 2026',
    title: 'Returning Home Together',
    body: 'Bringing every batch back to campus with live event registrations, batch representatives, and shared photo archives.',
  },
];

const ABOUT_FAQS = [
  {
    q: 'Who can join the JNV Murshidabad alumni dataset?',
    a: 'Any former student of JNV Murshidabad can sign in with Google on the Profile page and submit their batch and profile details for verification.',
  },
  {
    q: 'How is member privacy protected?',
    a: 'Public directory visitors only see approved name, batch, career, and bio details. Phone numbers and addresses require core-member or administrator authorization.',
  },
  {
    q: 'Who approves batch changes and gallery uploads?',
    a: 'Designated batch representatives and site administrators review sensitive changes such as name corrections, batch transfers, and public photo uploads.',
  },
];

/** Render the about view with a 500vh Framer Motion editorial layout. */
export default function About() {
  return (
    <Page
      eyebrow="About JNV Murshidabad Alumni"
      title="One Campus. Lifelong Connections."
      intro="We are building a trusted alumni dataset and community network for Jawahar Navodaya Vidyalaya Murshidabad—connecting batches, preserving memories, and empowering mutual support."
      actions={
        <>
          <Link to="/directory" className="alumni-action-link alumni-btn-pad">
            Explore Directory
          </Link>
          <Link to="/profile" className="alumni-action-ghost alumni-btn-pad">
            Update Your Record
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad">
          <div className="alumni-stack-md">
            <img
              src={`${import.meta.env.BASE_URL}images/schoolfrontimg.jpg`}
              alt="JNV Murshidabad campus"
              className="alumni-hero-media"
            />
            <div className="alumni-stack-sm">
              <span className="alumni-eyebrow">Campus Heritage</span>
              <p className="alumni-muted">
                Connecting every Navodayan batch from Murshidabad through verified records, reunions, and community service.
              </p>
            </div>
          </div>
        </MotionCard>
      }
    >
      <StatsShowcase
        title="Built for reliability, trust, and scale"
        description="Every record, photograph, and event response follows clear ownership and verification rules."
        stats={ABOUT_STATS}
      />

      <BentoFeatureBand
        eyebrow="Core Architecture"
        title="Why this alumni platform exists"
        description="Designed specifically around how Navodaya batches stay in touch, organize meetups, and help each other."
        items={MISSION_PILLARS}
      />

      <TimelineBand
        eyebrow="Our Journey"
        title="From hostel corridors to a connected alumni ledger"
        description="The story of how scattered batch groups became a structured, privacy-respecting community portal."
        items={HERITAGE_TIMELINE}
      />

      <HouseShowcase />

      <MotionSection
        eyebrow="Governance & Transparency"
        title="Clear boundaries between public, organizer, and admin views"
        description="Trust is essential for an alumni dataset. Every action is server-verified."
      >
        <div className="alumni-split-grid">
          <MotionCard>
            <div className="alumni-stack-sm">
              <span className="alumni-eyebrow">Member Ownership</span>
              <h3>Self-Managed Profiles</h3>
              <p className="alumni-muted">
                Members sign in with Google to update work history, city, blood group, and school memories while retaining full control over uploaded photos.
              </p>
            </div>
          </MotionCard>
          <MotionCard delay={0.08}>
            <div className="alumni-stack-sm">
              <span className="alumni-eyebrow">Organizer & Admin Audit</span>
              <h3>Accountable Stewardship</h3>
              <p className="alumni-muted">
                Core batch representatives get read-only participation visibility for events, while administrators approve new members and protect legacy data.
              </p>
            </div>
          </MotionCard>
        </div>
      </MotionSection>

      <FaqAccordionBand
        title="Frequently asked questions"
        description="Quick answers about joining, verification, and privacy."
        items={ABOUT_FAQS}
      />

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="alumni-divider"
      />

      <AlumniConnectDeck currentPath="/about" />
    </Page>
  );
}
