import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, ChevronDown, Sparkles } from 'lucide-react';

const HOUSE_DATA = [
  {
    name: 'Aravali',
    motto: 'Resilience & Leadership',
    summary: 'Built on steady perseverance across academics, morning PT, and inter-house championships.',
    focus: 'Mentorship circles & scholarship drives',
  },
  {
    name: 'Nilgiri',
    motto: 'Harmony & Innovation',
    summary: 'Known for creative arts, science exhibitions, and cross-batch community initiatives.',
    focus: 'Cultural archive & campus outreach',
  },
  {
    name: 'Shivalik',
    motto: 'Courage & Discipline',
    summary: 'Anchored by teamwork on the sports ground and lifelong solidarity across graduating years.',
    focus: 'Emergency blood donor network & logistics',
  },
  {
    name: 'Udaigiri',
    motto: 'Vision & Excellence',
    summary: 'Guided by curiosity, debate, and alumni guidance for students entering higher education.',
    focus: 'Career guidance & reunion planning',
  },
];

const CONNECT_ROUTES = [
  { label: 'Batches', to: '/batches', desc: 'Explore cohorts & reps' },
  { label: 'Directory', to: '/directory', desc: 'Find verified alumni' },
  { label: 'Blood Donors', to: '/blood-donors', desc: 'Rapid donor lookup' },
  { label: 'Reunion 2026', to: '/reunion-2026', desc: 'Flagship campus meet' },
  { label: 'Events', to: '/events', desc: 'Gatherings & sign-ups' },
  { label: 'Gallery', to: '/gallery', desc: 'Shared batch memories' },
  { label: 'About', to: '/about', desc: 'Mission & governance' },
  { label: 'Contact', to: '/contact', desc: 'Reach the team' },
];

/** Animate a full-height section band as it enters the viewport. */
export function MotionSection({ id, eyebrow, title, description, children, compact = false }) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className={compact ? 'alumni-band-compact' : 'alumni-band'}
    >
      <div className="alumni-stack-lg">
        {(eyebrow || title || description) && (
          <div className="alumni-stack-sm">
            {eyebrow && <span className="alumni-badge alumni-pill-pad">{eyebrow}</span>}
            {title && <h2 className="alumni-section-title">{title}</h2>}
            {description && <p className="alumni-lead">{description}</p>}
          </div>
        )}
        {children}
      </div>
    </motion.section>
  );
}

/** Render a glassmorphic card with Framer Motion reveal and hover lift. */
export function MotionCard({ children, delay = 0, className = 'alumni-glass alumni-panel-pad' }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.45, delay, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
      className={className}
    >
      {children}
    </motion.article>
  );
}

/** Display animated metrics cards for alumni dataset insights. */
export function StatsShowcase({ eyebrow = 'Network Snapshot', title, description, stats }) {
  return (
    <MotionSection eyebrow={eyebrow} title={title} description={description}>
      <div className="alumni-bento-grid">
        {stats.map((item, idx) => (
          <MotionCard key={item.label} delay={idx * 0.06}>
            <div className="alumni-stack-sm">
              <span className="alumni-eyebrow">{item.label}</span>
              <p className="alumni-stat-value">{item.value}</p>
              <p className="alumni-muted">{item.detail}</p>
            </div>
          </MotionCard>
        ))}
      </div>
    </MotionSection>
  );
}

/** Display feature cards in a responsive modern bento layout. */
export function BentoFeatureBand({ eyebrow, title, description, items }) {
  return (
    <MotionSection eyebrow={eyebrow} title={title} description={description}>
      <div className="alumni-bento-grid">
        {items.map((item, idx) => {
          const Icon = item.icon || Sparkles;
          return (
            <MotionCard key={item.title} delay={idx * 0.05}>
              <div className="alumni-stack-sm">
                <span className="alumni-chip alumni-pill-pad">
                  <Icon size={16} aria-hidden="true" />
                  <span>{item.tag || 'Alumni Connect'}</span>
                </span>
                <h3>{item.title}</h3>
                <p className="alumni-muted">{item.body}</p>
              </div>
            </MotionCard>
          );
        })}
      </div>
    </MotionSection>
  );
}

/** Render a vertical milestone timeline with scroll-triggered reveals. */
export function TimelineBand({ eyebrow, title, description, items }) {
  return (
    <MotionSection eyebrow={eyebrow} title={title} description={description}>
      <div className="alumni-glass alumni-panel-pad">
        {items.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.45, delay: idx * 0.06 }}
            className="alumni-timeline-item"
          >
            <span className="alumni-timeline-dot" aria-hidden="true" />
            <div className="alumni-stack-sm">
              <span className="alumni-eyebrow">{item.step}</span>
              <h3>{item.title}</h3>
              <p className="alumni-muted">{item.body}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </MotionSection>
  );
}

/** Interactive JNV Houses explorer connecting alumni identity across batches. */
export function HouseShowcase() {
  const [active, setActive] = useState(HOUSE_DATA[0].name);
  const current = HOUSE_DATA.find((item) => item.name === active) || HOUSE_DATA[0];

  return (
    <MotionSection
      eyebrow="Four Houses · One Spirit"
      title="Connected across every hostel wing"
      description="Every JNV Murshidabad graduate carries the camaraderie of Aravali, Nilgiri, Shivalik, and Udaigiri into our verified alumni dataset."
    >
      <div className="alumni-glass alumni-panel-pad alumni-stack-md">
        <div className="alumni-flex-wrap" role="tablist" aria-label="JNV Houses">
          {HOUSE_DATA.map((house) => (
            <button
              key={house.name}
              type="button"
              role="tab"
              aria-selected={active === house.name}
              className={active === house.name ? '' : 'secondary'}
              onClick={() => setActive(house.name)}
            >
              {house.name}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={current.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="alumni-glass-soft alumni-panel-pad alumni-stack-sm"
          >
            <span className="alumni-eyebrow">{current.motto}</span>
            <h3>{current.name} House Alumni</h3>
            <p className="alumni-muted">{current.summary}</p>
            <p className="alumni-chip alumni-pill-pad">Focus: {current.focus}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </MotionSection>
  );
}

/** Interactive FAQ or guidelines accordion with smooth Framer Motion transitions. */
export function FaqAccordionBand({ eyebrow = 'Guidance', title, description, items }) {
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <MotionSection eyebrow={eyebrow} title={title} description={description}>
      <div className="alumni-stack-sm">
        {items.map((item, idx) => {
          const open = openIdx === idx;
          return (
            <div key={item.q} className="alumni-glass-soft alumni-panel-pad-sm">
              <button
                type="button"
                className="secondary alumni-flex-wrap"
                aria-expanded={open}
                onClick={() => setOpenIdx(open ? -1 : idx)}
              >
                <span>{item.q}</span>
                <ChevronDown size={16} aria-hidden="true" />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="alumni-mt-sm"
                  >
                    <p className="alumni-muted">{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </MotionSection>
  );
}

/** Cross-page alumni navigation band that anchors the bottom of the 500vh experience. */
export function AlumniConnectDeck({ currentPath = '' }) {
  const links = CONNECT_ROUTES.filter((item) => item.to !== currentPath);

  return (
    <MotionSection
      eyebrow="Keep Exploring"
      title="Navigate the JNV Murshidabad ecosystem"
      description="Jump directly to batch cohorts, verified directory records, blood donors, event registrations, and your member profile."
    >
      <div className="alumni-bento-grid">
        {links.map((item, idx) => (
          <MotionCard key={item.to} delay={idx * 0.04} className="alumni-glass-soft alumni-panel-pad-sm">
            <Link to={item.to} className="alumni-stack-sm">
              <span className="alumni-eyebrow">{item.label}</span>
              <p className="alumni-muted">{item.desc}</p>
              <span className="alumni-flex-wrap">
                <span>Open section</span>
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </MotionCard>
        ))}
      </div>
    </MotionSection>
  );
}

