import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Award, Compass, GraduationCap, Users } from 'lucide-react';
import { useResource } from '../lib/useResource';
import { Page, Status } from '../components/alumni/UI';
import {
  AlumniConnectDeck,
  BentoFeatureBand,
  HouseShowcase,
  MotionCard,
  MotionSection,
  StatsShowcase,
  TimelineBand,
} from '../components/alumni/MotionShowcase';

const BATCH_PILLARS = [
  {
    icon: GraduationCap,
    tag: 'Cohort Index',
    title: 'Direct Batch Lookup',
    body: 'Select any graduating batch card to jump straight into its verified alumni directory records.',
  },
  {
    icon: Users,
    tag: 'Core Stewards',
    title: 'Batch Representatives',
    body: 'Each cohort is anchored by appointed core representatives who coordinate reunions and member outreach.',
  },
  {
    icon: Award,
    tag: 'Dataset Growth',
    title: 'Expanding Every Year',
    body: 'New graduating classes onboard seamlessly while older batches digitize historical contacts and photos.',
  },
  {
    icon: Compass,
    tag: 'Mentoring',
    title: 'Senior-to-Junior Bridges',
    body: 'Batches collaborate across decades for college admissions advice, internships, and career referrals.',
  },
];

const BATCH_ERAS = [
  {
    step: '2008 – 2012',
    title: 'Founding & Early Cohorts',
    body: 'Trailblazing batches who established campus traditions, cultural nights, and the first alumni circles.',
  },
  {
    step: '2013 – 2018',
    title: 'Expansion & National Presence',
    body: 'Alumni entering IITs, medical colleges, central universities, and diverse creative and public sectors.',
  },
  {
    step: '2019 – 2023',
    title: 'Digital-First Classmates',
    body: 'Tight-knit cohorts driving photo archives, blood donor responsiveness, and student mentorship programs.',
  },
  {
    step: '2024 – Present',
    title: 'Next-Generation Navodayans',
    body: 'Welcoming newest graduates into the verified alumni dataset from day one after Class XII.',
  },
];

/** Show available batches and the currently assigned core-member representatives. */
export default function Batches() {
  const batches = useResource('/api/meet/batches');
  const reps = useResource('/api/representatives');

  const batchList = batches.data?.batches || [];
  const repList = reps.data?.representatives || [];
  const totalAlumni = batchList.reduce((sum, item) => sum + (Number(item.n) || 0), 0);

  return (
    <Page
      eyebrow="Batch Cohorts & Representatives"
      title="Our batches"
      intro="One school. Many generations. Stay connected through your batch."
      actions={
        <>
          <Link to="/directory" className="alumni-action-link alumni-btn-pad">
            Search Full Directory
          </Link>
          <Link to="/profile" className="alumni-action-ghost alumni-btn-pad">
            Claim Your Batch Record
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad">
          <div className="alumni-stack-md">
            <img
              src={`${import.meta.env.BASE_URL}images/batch2018.jpg`}
              alt="JNV Murshidabad batch gathering"
              className="alumni-hero-media"
            />
            <p className="alumni-muted">
              Select a batch below to view verified members or connect with your cohort representative.
            </p>
          </div>
        </MotionCard>
      }
    >
      <MotionSection
        eyebrow="Live Dataset"
        title="Graduating Batches"
        description="Click any batch card to open its filtered alumni directory."
        compact
      >
        <Status resource={batches} empty={!batchList.length} />
        <div className="alumni-grid">
          {batchList.map((row, idx) => (
            <motion.div
              key={row.batch}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.35) }}
              whileHover={{ y: -4 }}
            >
              <Link className="alumni-card" to={'/directory?batch=' + row.batch}>
                <span className="alumni-eyebrow">Verified Cohort</span>
                <h2>Batch {row.batch}</h2>
                <p className="alumni-muted">{row.n} alumni</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </MotionSection>

      <MotionSection
        eyebrow="Cohort Leadership"
        title="Batch representatives"
        description="Appointed core members helping keep cohort data accurate and reunion plans coordinated."
        compact
      >
        <Status resource={reps} empty={!repList.length} />
        <div className="alumni-grid">
          {repList.map((row, idx) => (
            <MotionCard key={row.batch + row.member_id} delay={Math.min(idx * 0.04, 0.3)} className="alumni-card">
              {row.photo && <img className="alumni-avatar" src={row.photo} alt={row.name} />}
              <h3>{row.name}</h3>
              <p className="alumni-muted">Batch {row.batch} · Core member</p>
            </MotionCard>
          ))}
        </div>
      </MotionSection>

      <StatsShowcase
        eyebrow="Dataset Pulse"
        title="Cohort coverage across JNV Murshidabad"
        description="Live statistics powered by the alumni registry."
        stats={[
          { label: 'Active Batches', value: String(batchList.length || '17+'), detail: 'Cohorts indexed in the alumni registry.' },
          { label: 'Indexed Alumni', value: String(totalAlumni || 'Growing'), detail: 'Verified member records across batches.' },
          { label: 'Representatives', value: String(repList.length || 'Core Team'), detail: 'Batch stewards supporting outreach.' },
          { label: 'House System', value: '4 Houses', detail: 'Cross-batch bond across every dormitory.' },
        ]}
      />

      <BentoFeatureBand
        eyebrow="Cohort Features"
        title="How batch connectivity works"
        description="Each batch connects smoothly to the directory, gallery, and reunion events."
        items={BATCH_PILLARS}
      />

      <TimelineBand
        eyebrow="Generational Arc"
        title="Every era of JNV Murshidabad"
        description="Tracing our cohorts from the earliest pioneers to the newest graduates."
        items={BATCH_ERAS}
      />

      <HouseShowcase />

      <AlumniConnectDeck currentPath="/batches" />
    </Page>
  );
}
