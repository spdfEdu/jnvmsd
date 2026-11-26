import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Lock, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import GoogleSignIn from '../auth/GoogleSignIn';
import { api } from '../lib/api';
import { useResource } from '../lib/useResource';
import { compressPhoto } from '../lib/photos';
import { Page, Status, PrivatePhoto, Field } from '../components/alumni/UI';
import ProfileForm from '../components/alumni/ProfileForm';
import {
  AlumniConnectDeck,
  BentoFeatureBand,
  FaqAccordionBand,
  HouseShowcase,
  MotionCard,
  MotionSection,
  TimelineBand,
} from '../components/alumni/MotionShowcase';

const PROFILE_BENEFITS = [
  {
    icon: UserCheck,
    tag: 'Verified Identity',
    title: 'Google-Authenticated Ownership',
    body: 'Your profile is tied exclusively to your verified Google account—no shared passwords or unauthorized edits.',
  },
  {
    icon: ShieldCheck,
    tag: 'Safe Updates',
    title: 'Sensitive Edits Are Reviewed',
    body: 'Career, city, and bio updates save smoothly while identity changes like name or batch require admin verification.',
  },
  {
    icon: Camera,
    tag: 'Personal Vault',
    title: 'Profile DP & Gallery Uploads',
    body: 'Upload your portrait and up to five captioned batch memories once your member status is approved.',
  },
  {
    icon: Lock,
    tag: 'Privacy Control',
    title: 'Protected Contact Ledger',
    body: 'Phone numbers and street addresses are shared only with authorized batch organizers.',
  },
];

const ONBOARDING_STEPS = [
  {
    step: 'Step 01 · Sign In',
    title: 'Authenticate with Google',
    body: 'Sign in using your personal Google account so your session stays securely bound to your member record.',
  },
  {
    step: 'Step 02 · Complete Dataset',
    title: 'Fill Batch, House, Career & Blood Group',
    body: 'Provide your graduating year, residential house, occupation, and optional blood group for the donor network.',
  },
  {
    step: 'Step 03 · Approval',
    title: 'Administrator Verification',
    body: 'Admins verify new alumni records or link legacy batch entries so your public listing goes live cleanly.',
  },
  {
    step: 'Step 04 · Connect & RSVP',
    title: 'Upload Photos & Register for Reunions',
    body: 'Unlock gallery uploads and register for Alumni Meet 2026 in one click.',
  },
];

const PROFILE_FAQS = [
  {
    q: 'Why is gallery upload disabled before approval?',
    a: 'Public gallery submissions are enabled as soon as an administrator approves your alumni profile record.',
  },
  {
    q: 'What happens if I change my name or batch year?',
    a: 'Changes to protected identity fields are queued as a draft for administrator review while preserving your existing record.',
  },
  {
    q: 'Can I delete a photo I uploaded earlier?',
    a: 'Yes. Every photo you uploaded shows a Delete photo button right below it on this page.',
  },
];

/** Show the student's editable profile, DP, and personally owned gallery uploads. */
export default function Profile() {
  const { account, loading, error, refresh, logout } = useAuth();
  const gallery = useResource(account ? '/api/me/gallery' : null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [caption, setCaption] = useState('');
  const [photoVersion, setPhotoVersion] = useState(0);

  /** Compress and upload a selected DP/gallery file using authenticated owner endpoints. */
  async function upload(event, dp) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setNotice('');
    try {
      const blob = await compressPhoto(file);
      await api(
        dp ? '/api/me/photo' : '/api/me/gallery?caption=' + encodeURIComponent(caption),
        { method: 'POST', body: blob }
      );
      setNotice(dp ? 'Profile photo saved.' : 'Photo uploaded for review.');
      setPhotoVersion((v) => v + 1);
      gallery.reload();
      await refresh();
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  /** Delete only a photo owned by the signed-in member and refresh the private list. */
  async function remove(id) {
    try {
      await api('/api/me/gallery/' + id, { method: 'DELETE' });
      gallery.reload();
    } catch (e) {
      setNotice(e.message);
    }
  }

  return (
    <Page
      eyebrow="Member Workspace"
      title="My profile"
      intro="Keep your alumni details up to date and share your school memories."
      actions={
        <>
          <Link to="/events" className="alumni-action-link alumni-btn-pad">
            Browse Events
          </Link>
          <Link to="/directory" className="alumni-action-ghost alumni-btn-pad">
            View Directory
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad">
          <div className="alumni-stack-sm">
            <span className="alumni-eyebrow">Account Status</span>
            <p className="alumni-stat-value">
              {account ? account.member?.status || 'Draft' : 'Sign In'}
            </p>
            <p className="alumni-muted">
              {account
                ? `Signed in as ${account.user.email} (${account.role || 'Member'}).`
                : 'Authenticate with Google to manage your JNV Murshidabad alumni profile.'}
            </p>
          </div>
        </MotionCard>
      }
    >
      <MotionSection
        eyebrow="Profile & Photos"
        title={account ? 'Manage your alumni record' : 'Member authentication'}
        description={
          account
            ? 'Review your status, edit your dataset fields, and upload photos.'
            : 'Sign in to access your profile form and event registrations.'
        }
        compact
      >
        {loading ? (
          <p role="status" className="alumni-notice">
            Loading account…
          </p>
        ) : !account ? (
          <GoogleSignIn />
        ) : (
          <div className="alumni-stack-lg">
            <div className="alumni-glass-soft alumni-panel-pad-sm alumni-toolbar">
              <span>
                {account.user.email} · {account.role || 'Member'}
              </span>
              <button className="secondary" onClick={logout}>
                Sign out
              </button>
            </div>

            <p className="alumni-notice">
              Profile status: {account.member?.status || 'Not yet submitted'}
            </p>

            <ProfileForm
              key={account.member?.id || 'new'}
              initial={{
                ...account.member?.data,
                ...account.member?.draft,
                Name:
                  account.member?.draft?.Name ||
                  account.member?.data?.Name ||
                  account.user.name,
                EmailId:
                  account.member?.draft?.EmailId ||
                  account.member?.data?.EmailId ||
                  account.user.email,
              }}
              onSave={async (data) => {
                const result = await api('/api/me', { method: 'PUT', body: { data } });
                await refresh();
                return result;
              }}
            />

            <section className="alumni-glass alumni-panel-pad alumni-stack-md">
              <h2>My photos</h2>
              {account.member?.photo || account.member?.draft_photo ? (
                <PrivatePhoto
                  key={photoVersion}
                  path="/api/me/photo"
                  alt="My profile photo"
                />
              ) : null}
              <label className="alumni-field">
                <span>Profile photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy || !account.member}
                  onChange={(event) => upload(event, true)}
                />
              </label>
              <p className="alumni-muted">
                Save your profile before adding a DP. Gallery uploads become available after profile approval.
              </p>
              <Field
                label="Photo caption"
                value={caption}
                maxLength={200}
                onChange={setCaption}
              />
              <label className="alumni-field">
                <span>Add gallery photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={
                    busy ||
                    account.member?.status !== 'approved' ||
                    gallery.data?.photos?.length >= 5
                  }
                  onChange={(event) => upload(event, false)}
                />
              </label>
              <Status resource={gallery} />
              <div className="alumni-grid">
                {gallery.data?.photos?.map((photo) => (
                  <article className="alumni-card" key={photo.id}>
                    <PrivatePhoto
                      id={photo.id}
                      alt={photo.caption || 'My gallery photo'}
                    />
                    <p>
                      {photo.caption} · {photo.status}
                    </p>
                    <button className="secondary" onClick={() => remove(photo.id)}>
                      Delete photo
                    </button>
                  </article>
                ))}
              </div>
              {notice && (
                <p role="status" className="alumni-notice">
                  {notice}
                </p>
              )}
            </section>
          </div>
        )}
        {error && (
          <p role="alert" className="alumni-notice">
            {error}
          </p>
        )}
      </MotionSection>

      <BentoFeatureBand
        eyebrow="Why Complete Your Profile"
        title="Designed around alumni ownership"
        description="Your verified record powers the directory, donor support, and reunion check-ins."
        items={PROFILE_BENEFITS}
      />

      <TimelineBand
        eyebrow="Onboarding Journey"
        title="How profile verification works"
        description="Four quick steps from Google sign-in to full alumni community access."
        items={ONBOARDING_STEPS}
      />

      <HouseShowcase />

      <FaqAccordionBand
        title="Profile & photo questions"
        description="Common questions about status, edits, and photo uploads."
        items={PROFILE_FAQS}
      />

      <AlumniConnectDeck currentPath="/profile" />
    </Page>
  );
}
