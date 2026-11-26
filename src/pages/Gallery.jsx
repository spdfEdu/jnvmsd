import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Camera, Image as ImageIcon, ShieldCheck, Sparkles } from 'lucide-react';
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

const GALLERY_PILLARS = [
  {
    icon: Camera,
    tag: 'Batch Archives',
    title: 'Historical & Member Uploads',
    body: 'Browse verified campus photographs alongside batch-tagged alumni reunion snapshots.',
  },
  {
    icon: ShieldCheck,
    tag: 'Curated Review',
    title: 'Moderated Public Feed',
    body: 'Every submitted photograph is reviewed by administrators before appearing in the public school gallery.',
  },
  {
    icon: ImageIcon,
    tag: 'Optimized Delivery',
    title: 'Compressed for Fast Mobile Viewing',
    body: 'Uploaded photos are compressed automatically in the browser so galleries stay crisp and responsive.',
  },
  {
    icon: Sparkles,
    tag: 'Member Owned',
    title: 'Manage Your Submissions',
    body: 'Approved members can upload up to five gallery memories and remove their own photos anytime from My profile.',
  },
];

const GALLERY_FAQS = [
  {
    q: 'How can I upload photographs from my batch?',
    a: 'Once your alumni profile is approved on My profile, you can upload up to five captioned photographs for gallery review.',
  },
  {
    q: 'Why does a newly uploaded photo not appear immediately?',
    a: 'All member gallery submissions go through administrator moderation to ensure respectful and accurate batch tagging.',
  },
  {
    q: 'Can I filter memories by graduating year?',
    a: 'Yes. Enter a four-digit batch year in the filter above to narrow down photographs from that cohort.',
  },
];

/** Display only approved member photos and administrator-published historical batch photos. */
export default function Gallery() {
  const [batch, setBatch] = useState('');
  const resource = useResource(
    '/api/gallery' + (batch ? '?batch=' + encodeURIComponent(batch) : '')
  );
  const photos = resource.data?.photos || [];

  return (
    <Page
      eyebrow="Visual Archive"
      title="School memories"
      intro="Photographs from our batches, reunions, and shared years at JNV."
      actions={
        <>
          <Link to="/profile" className="alumni-action-link alumni-btn-pad">
            Upload Your Memories
          </Link>
          <Link to="/batches" className="alumni-action-ghost alumni-btn-pad">
            Explore Batches
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad">
          <div className="alumni-stack-md">
            <img
              src={`${import.meta.env.BASE_URL}images/houseflag.png`}
              alt="JNV Murshidabad house flag"
              className="alumni-hero-media"
            />
            <p className="alumni-muted">
              Preserving assembly mornings, sports meets, hostel evenings, and alumni reunions across batches.
            </p>
          </div>
        </MotionCard>
      }
    >
      <MotionSection
        eyebrow="Photo Feed"
        title="Curated batch photography"
        description="Filter by batch year to revisit campus moments from specific graduating classes."
        compact
      >
        <div className="alumni-glass alumni-panel-pad">
          <Field
            label="Filter by batch year"
            type="number"
            min={2008}
            max={2100}
            value={batch}
            onChange={setBatch}
          />
        </div>

        <Status resource={resource} empty={!photos.length} />

        <div className="alumni-grid">
          {photos.map((photo, idx) => (
            <motion.figure
              className="alumni-card"
              key={photo.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.1 }}
              transition={{ duration: 0.35, delay: Math.min(idx * 0.04, 0.3) }}
              whileHover={{ y: -4 }}
            >
              <img
                className="alumni-photo"
                src={photo.url}
                alt={photo.caption || 'Batch ' + photo.batch + ' photograph'}
                loading="lazy"
              />
              <figcaption className="alumni-muted">
                {photo.caption || 'School memories'} · Batch {photo.batch}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </MotionSection>

      <StatsShowcase
        eyebrow="Archive Overview"
        title="Preserving decades of JNV Murshidabad life"
        description="Every approved image is tagged to its graduating cohort."
        stats={[
          { label: 'Visible Photos', value: String(photos.length), detail: 'Approved photographs matching the current filter.' },
          { label: 'Active Filter', value: batch || 'All Years', detail: 'Type any batch year from 2008 onward.' },
          { label: 'Member Quota', value: '5 Photos', detail: 'Per approved alumni profile in the community vault.' },
          { label: 'Moderation', value: 'Verified', detail: 'Admin-reviewed before public gallery publication.' },
        ]}
      />

      <BentoFeatureBand
        eyebrow="Curation Standards"
        title="How our alumni photo vault works"
        description="Combining historical campus snapshots with member-contributed reunion memories."
        items={GALLERY_PILLARS}
      />

      <HouseShowcase />

      <FaqAccordionBand
        title="Gallery submission questions"
        description="Learn how uploads, captions, and approvals work."
        items={GALLERY_FAQS}
      />

      <AlumniConnectDeck currentPath="/gallery" />
    </Page>
  );
}
