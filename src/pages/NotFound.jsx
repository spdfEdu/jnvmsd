import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Compass, FolderSearch, Home, Users } from 'lucide-react';
import { Page } from '../components/alumni/UI';
import {
  AlumniConnectDeck,
  BentoFeatureBand,
  HouseShowcase,
  MotionCard,
  TimelineBand,
} from '../components/alumni/MotionShowcase';

const RECOVERY_ROUTES = [
  {
    icon: Home,
    tag: 'Landing Page',
    title: 'Return to Alumni Home',
    body: 'Start from the main campus showcase, latest announcements, and live Reunion 2026 updates.',
  },
  {
    icon: Users,
    tag: 'Alumni Dataset',
    title: 'Search the Batch Directory',
    body: 'Look up approved classmates by graduating year, occupation, or blood group.',
  },
  {
    icon: FolderSearch,
    tag: 'Cohorts',
    title: 'Explore All Batches',
    body: 'Browse batch rosters and connect with appointed cohort representatives.',
  },
  {
    icon: Compass,
    tag: 'Support',
    title: 'Contact the Team',
    body: 'Still cannot find a page or resource? Let the alumni coordinators know.',
  },
];

const NAVIGATION_STEPS = [
  {
    step: 'Check 01 · Verify URL',
    title: 'Confirm the Route Path',
    body: 'All alumni routes live under /jnvmsd/ such as /directory, /batches, /events, and /profile.',
  },
  {
    step: 'Check 02 · Jump to Hub',
    title: 'Use the Quick Links Below',
    body: 'Every core section of the alumni platform is linked directly inside the navigation deck below.',
  },
];

/** Render the not found view with 500vh Framer Motion recovery sections. */
const NotFound = () => {
  return (
    <Page
      eyebrow="Route Not Found"
      title="Page not found"
      intro="The link you followed may have moved or does not exist in the JNV Murshidabad alumni portal."
      actions={
        <>
          <Link to="/homepage" className="alumni-action-link alumni-btn-pad">
            Go back to Home
          </Link>
          <Link to="/directory" className="alumni-action-ghost alumni-btn-pad">
            Open Directory
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad alumni-text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="alumni-stack-sm"
          >
            <p className="alumni-hero-404">404</p>
            <p className="alumni-muted">Lost on campus? Let us guide you back.</p>
          </motion.div>
        </MotionCard>
      }
    >
      <BentoFeatureBand
        eyebrow="Quick Recovery"
        title="Where would you like to go next?"
        description="Jump back into verified alumni records, batch galleries, or event registrations."
        items={RECOVERY_ROUTES}
      />

      <TimelineBand
        eyebrow="Navigation Tips"
        title="Finding your destination"
        description="Two simple steps to get back on track."
        items={NAVIGATION_STEPS}
      />

      <HouseShowcase />

      <AlumniConnectDeck />
    </Page>
  );
};

export default NotFound;
