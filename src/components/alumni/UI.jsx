import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
/** Give community pages a consistent readable heading and content layout. */
export function Page({ title, intro, children }) { return <section className="alumni-page"><header><p className="alumni-eyebrow">JNV Murshidabad Alumni</p><h1>{title}</h1>{intro && <p>{intro}</p>}</header>{children}</section>; }
/** Display loading, errors, or a meaningful empty state for remote data. */
export function Status({ resource, empty = false }) { if (resource.loading) return <p role="status">Loading…</p>; if (resource.error) return <p role="alert" className="alumni-notice">{resource.error}</p>; if (empty) return <p className="alumni-notice">Nothing to show yet.</p>; return null; }
/** Render an accessible controlled field with an optional list of choices. */
export function Field({ label, name, value, onChange, options, multiline, ...props }) { const inputProps = { name, value: value ?? '', onChange: e => onChange(e.target.value), ...props }; return <label className="alumni-field"><span>{label}</span>{options ? <select {...inputProps}><option value="">Choose…</option>{options.map(option => <option key={option}>{option}</option>)}</select> : multiline ? <textarea {...inputProps} rows={4} /> : <input {...inputProps} />}</label>; }
/** Fetch private photo bytes with the session header instead of putting tokens in URLs. */
export function PrivatePhoto({ id, path, alt = 'Member photograph' }) { const [src, setSrc] = useState(''); useEffect(() => { const controller = new AbortController(); let objectUrl; api(path || '/api/gallery/photo/' + id, { raw: true, signal: controller.signal }).then(blob => { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); }).catch(() => {}); return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); }; }, [id, path]); return src ? <img className="alumni-photo" src={src} alt={alt} /> : <span>Photo unavailable</span>; }
