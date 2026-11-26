import { useEffect, useState } from 'react';
import { motion, useScroll, useSpring } from 'motion/react';
import { api } from '../../lib/api';

/** Give community pages a modern 500vh animated canvas, scroll progress bar, and readable header. */
export function Page({ title, intro, eyebrow = 'JNV Murshidabad Alumni', actions, aside, children }) {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 28, restDelta: 0.001 });

  return (
    <div className="alumni-canvas-500">
      <motion.div className="alumni-scroll-bar" style={{ scaleX }} aria-hidden="true" />
      <div className="alumni-ambient-orb alumni-orb-top" aria-hidden="true" />
      <div className="alumni-ambient-orb alumni-orb-bottom" aria-hidden="true" />

      <section className="alumni-hero-band">
        <div className="alumni-container">
          <div className={aside ? 'alumni-split-grid' : 'alumni-stack-lg'}>
            <motion.header
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              className="alumni-stack-md"
            >
              <span className="alumni-badge alumni-pill-pad">{eyebrow}</span>
              <h1 className="alumni-gradient-title">{title}</h1>
              {intro && <p className="alumni-lead">{intro}</p>}
              {actions && <div className="alumni-flex-wrap alumni-mt-xs">{actions}</div>}
            </motion.header>
            {aside && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
              >
                {aside}
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <div className="alumni-container alumni-stack-lg alumni-mb-lg">{children}</div>
    </div>
  );
}

/** Display loading, errors, or a meaningful empty state for remote data. */
export function Status({ resource, empty = false }) {
  if (resource.loading) return <p role="status" className="alumni-notice">Loading…</p>;
  if (resource.error) return <p role="alert" className="alumni-notice">{resource.error}</p>;
  if (empty) return <p className="alumni-notice">Nothing to show yet.</p>;
  return null;
}

/** Render an accessible controlled field with an optional list of choices. */
export function Field({ label, name, value, onChange, options, multiline, ...props }) {
  const inputProps = { name, value: value ?? '', onChange: (e) => onChange(e.target.value), ...props };
  return (
    <label className="alumni-field">
      <span>{label}</span>
      {options ? (
        <select {...inputProps}>
          <option value="">Choose…</option>
          {options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea {...inputProps} rows={4} />
      ) : (
        <input {...inputProps} />
      )}
    </label>
  );
}

/** Fetch private photo bytes with the session header instead of putting tokens in URLs. */
export function PrivatePhoto({ id, path, alt = 'Member photograph' }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    api(path || '/api/gallery/photo/' + id, { raw: true, signal: controller.signal })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, path]);
  return src ? <img className="alumni-photo" src={src} alt={alt} /> : <span>Photo unavailable</span>;
}
