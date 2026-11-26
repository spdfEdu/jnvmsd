import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, MapPin, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { api } from '../lib/api';
import { Page, Field } from '../components/alumni/UI';
import {
  AlumniConnectDeck,
  BentoFeatureBand,
  FaqAccordionBand,
  MotionCard,
  MotionSection,
  TimelineBand,
} from '../components/alumni/MotionShowcase';

const CONTACT_TOPICS = [
  {
    icon: Users,
    tag: 'Batch Reconnection',
    title: 'Find Lost Classmates',
    body: 'Need help verifying an older batch roster or linking a batch representative? Drop us a note.',
  },
  {
    icon: MessageSquare,
    tag: 'Profile Support',
    title: 'Corrections & Approvals',
    body: 'Questions about pending profile updates, batch transfers, or historical photo captions.',
  },
  {
    icon: ShieldCheck,
    tag: 'Spam-Protected',
    title: 'Rate-Limited & Verified',
    body: 'Messages are routed directly to the alumni administration inbox with anti-spam verification.',
  },
  {
    icon: Mail,
    tag: 'Direct Outreach',
    title: 'Sponsorship & Mentorship',
    body: 'Collaborate on alumni scholarships, career talks for current students, or Reunion 2026 logistics.',
  },
];

const RESPONSE_TIMELINE = [
  {
    step: 'Step 01 · Submit',
    title: 'Private Delivery to the Alumni Inbox',
    body: 'Your inquiry is validated and stored securely inside the administrator Contact inbox.',
  },
  {
    step: 'Step 02 · Triage',
    title: 'Routed to Batch & Event Coordinators',
    body: 'Core representatives or site administrators review batch-specific or event-related questions.',
  },
  {
    step: 'Step 03 · Resolve',
    title: 'Direct Email Follow-Up',
    body: 'Once reviewed, the team marks your message resolved and replies to the email address you provided.',
  },
];

const CONTACT_FAQS = [
  {
    q: 'Who reads messages sent through this form?',
    a: 'Only authorized JNV Murshidabad alumni administrators have access to the Contact inbox.',
  },
  {
    q: 'Can I use this form to request a batch representative update?',
    a: 'Yes. Mention your graduating batch year and details, and the admin team will coordinate with existing core members.',
  },
  {
    q: 'Do I need to sign in to send a message?',
    a: 'No. Anyone trying to reconnect or ask questions can send a message directly using this form.',
  },
];

/** Mount Cloudflare's verification widget without sending its secret key to the browser. */
function Challenge({ onToken }) {
  const target = useRef(null);
  useEffect(() => {
    const key = import.meta.env.VITE_TURNSTILE_SITE_KEY;
    if (!key) return;
    let widget;
    let active = true;
    const render = () => {
      if (active && target.current && window.turnstile) {
        widget = window.turnstile.render(target.current, {
          sitekey: key,
          callback: onToken,
          'expired-callback': () => onToken(''),
        });
      }
    };
    let script = document.querySelector('script[data-turnstile]');
    if (window.turnstile) render();
    else {
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
        script.async = true;
        script.dataset.turnstile = 'true';
        document.head.appendChild(script);
      }
      script.addEventListener('load', render);
    }
    return () => {
      active = false;
      script?.removeEventListener('load', render);
      if (widget !== undefined) window.turnstile?.remove(widget);
    };
  }, [onToken]);
  return <div ref={target} />;
}

/** Submit a private, rate-limited contact message with server-verified anti-spam protection. */
export default function Contact() {
  const [data, setData] = useState({ name: '', email: '', message: '', website: '' });
  const [token, setToken] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const configured = import.meta.env.DEV || Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY);

  /** Submit the message and reset the single-use verification token after every attempt. */
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/contact', {
        method: 'POST',
        body: { ...data, challenge_token: token },
      });
      setNotice('Your message has been received. Thank you for reaching out.');
      setData({ name: '', email: '', message: '', website: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
      setToken('');
      setVersion((v) => v + 1);
    }
  }

  return (
    <Page
      eyebrow="Connect With Us"
      title="Contact the alumni team"
      intro="Questions, suggestions, or help reconnecting? Send the team a message."
      actions={
        <>
          <Link to="/directory" className="alumni-action-link alumni-btn-pad">
            Browse Directory
          </Link>
          <Link to="/about" className="alumni-action-ghost alumni-btn-pad">
            About the Association
          </Link>
        </>
      }
      aside={
        <MotionCard className="alumni-glass alumni-panel-pad">
          <div className="alumni-stack-md">
            <span className="alumni-eyebrow">Campus & Desk</span>
            <p className="alumni-flex-wrap">
              <Mail size={16} aria-hidden="true" />
              <span>alumni.jnvmsd@gmail.com</span>
            </p>
            <p className="alumni-flex-wrap">
              <MapPin size={16} aria-hidden="true" />
              <span>JNV Murshidabad, West Bengal 742102</span>
            </p>
            <p className="alumni-muted">
              Messages submitted on this page go straight to the verified alumni moderation desk.
            </p>
          </div>
        </MotionCard>
      }
    >
      <MotionSection
        eyebrow="Direct Message"
        title="Send a note to the coordinators"
        description="Fill in your details below and we will respond to your email."
        compact
      >
        <motion.form
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="alumni-glass alumni-panel-pad alumni-stack-md"
          onSubmit={submit}
        >
          <Field
            label="Your name"
            required
            maxLength={80}
            value={data.name}
            onChange={(name) => setData((old) => ({ ...old, name }))}
          />
          <Field
            label="Email"
            required
            type="email"
            maxLength={160}
            value={data.email}
            onChange={(email) => setData((old) => ({ ...old, email }))}
          />
          <Field
            label="Message"
            multiline
            required
            minLength={10}
            maxLength={3000}
            value={data.message}
            onChange={(message) => setData((old) => ({ ...old, message }))}
          />
          <label className="alumni-honeypot" aria-hidden="true">
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={data.website}
              onChange={(e) => setData((old) => ({ ...old, website: e.target.value }))}
            />
          </label>
          <Challenge key={version} onToken={setToken} />
          {!configured && <p className="alumni-muted">Messaging is being connected. Please check back soon.</p>}
          <button
            disabled={
              busy ||
              !configured ||
              (Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY) && !token)
            }
          >
            {busy ? 'Sending…' : 'Send message'}
          </button>
          {notice && (
            <p role="status" className="alumni-notice">
              {notice}
            </p>
          )}
          {error && (
            <p role="alert" className="alumni-notice">
              {error}
            </p>
          )}
        </motion.form>
      </MotionSection>

      <BentoFeatureBand
        eyebrow="How We Help"
        title="Reasons alumni reach out"
        description="Whether updating a legacy batch sheet or volunteering for students, every inquiry matters."
        items={CONTACT_TOPICS}
      />

      <TimelineBand
        eyebrow="Support Workflow"
        title="What happens after you click Send"
        description="A transparent, spam-free communication loop."
        items={RESPONSE_TIMELINE}
      />

      <FaqAccordionBand
        title="Contact & messaging questions"
        description="Everything you need to know about reaching the alumni team."
        items={CONTACT_FAQS}
      />

      <AlumniConnectDeck currentPath="/contact" />
    </Page>
  );
}
