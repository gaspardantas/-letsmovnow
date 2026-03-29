import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { listingsApi, universitiesApi } from '../api'
import type { University } from '../types'

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']

function ListingForm({ editId }: { editId?: string }) {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    title: '', description: '', price: '', bedrooms: '1',
    petsAllowed: 'false', utilitiesIncluded: 'false',
    address: '', city: '', state: '', university: '',
  })
  const [images, setImages]         = useState<File[]>([])
  const [previews, setPreviews]     = useState<string[]>([])
  const [existingImgs, setExisting] = useState<string[]>([])
  const [uniQuery, setUniQuery]     = useState('')
  const [uniList, setUniList]       = useState<University[]>([])
  const [showUni, setShowUni]       = useState(false)
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load existing listing for edit
  useEffect(() => {
    if (!editId) return
    listingsApi.getById(editId).then((res) => {
      const l = res.data.data
      setForm({
        title: l.title, description: l.description || '',
        price: String(l.price), bedrooms: String(l.bedrooms),
        petsAllowed: String(l.petsAllowed),
        utilitiesIncluded: String(l.utilitiesIncluded),
        address: l.address, city: l.city, state: l.state, university: l.university,
      })
      setUniQuery(l.university)
      setExisting(l.images)
    }).catch(() => navigate('/my-listings'))
  }, [editId])

  // University autocomplete
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (uniQuery.length < 2) { setUniList([]); return }
    debounce.current = setTimeout(async () => {
      const res = await universitiesApi.search(uniQuery, form.state)
      setUniList(res.data.data.universities)
      setShowUni(true)
    }, 300)
  }, [uniQuery, form.state])

  const selectUni = (u: University) => {
    setUniQuery(u.name)
    setForm((f) => ({ ...f, university: u.name, city: u.city, state: u.state }))
    setShowUni(false)
  }

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10 - existingImgs.length)
    setImages(files)
    setPreviews(files.map((f) => URL.createObjectURL(f)))
  }

  const removeExisting = async (url: string) => {
    if (!editId) return
    try {
      await listingsApi.deleteImage(editId, url)
      setExisting((prev) => prev.filter((u) => u !== url))
    } catch { alert('Failed to remove image') }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editId && images.length === 0) { setError('At least one image is required'); return }
    setError(''); setLoading(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      images.forEach((f) => fd.append('images', f))
      if (editId) {
        await listingsApi.update(editId, fd)
      } else {
        await listingsApi.create(fd)
      }
      navigate('/my-listings')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save listing')
    } finally { setLoading(false) }
  }

  const f = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }))

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 680 }}>
        <h1 style={styles.heading}>{editId ? 'Edit Listing' : 'List a Room'}</h1>
        <p style={styles.sub}>{editId ? 'Update your listing details.' : 'Fill in the details below — distance to campus is calculated automatically.'}</p>

        <form onSubmit={submit} style={styles.form}>
          {error && <div style={styles.error}>{error}</div>}

          {/* Title */}
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. Cozy 1BR near UCF, all utilities included" value={form.title} onChange={(e) => f('title', e.target.value)} required maxLength={100} />
          </div>

          {/* Price + Bedrooms */}
          <div style={styles.row2}>
            <div className="form-group">
              <label className="form-label">Monthly Rent ($) *</label>
              <input className="form-input" type="number" placeholder="950" value={form.price} onChange={(e) => f('price', e.target.value)} required min={0} />
            </div>
            <div className="form-group">
              <label className="form-label">Bedrooms *</label>
              <select className="form-select" value={form.bedrooms} onChange={(e) => f('bedrooms', e.target.value)}>
                <option value="0">Studio</option>
                <option value="1">1 Bedroom</option>
                <option value="2">2 Bedrooms</option>
                <option value="3">3 Bedrooms</option>
                <option value="4">4+ Bedrooms</option>
              </select>
            </div>
          </div>

          {/* Pets + Utilities */}
          <div style={styles.row2}>
            <div className="form-group">
              <label className="form-label">Pet Policy *</label>
              <select className="form-select" value={form.petsAllowed} onChange={(e) => f('petsAllowed', e.target.value)}>
                <option value="false">No pets</option>
                <option value="true">Pets allowed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Utilities *</label>
              <select className="form-select" value={form.utilitiesIncluded} onChange={(e) => f('utilitiesIncluded', e.target.value)}>
                <option value="false">Not included</option>
                <option value="true">Included in rent</option>
              </select>
            </div>
          </div>

          {/* University autocomplete */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">University *</label>
            <input className="form-input" placeholder="Start typing your university..." value={uniQuery} onChange={(e) => setUniQuery(e.target.value)} required />
            <span className="form-hint">Selecting a university auto-fills city and state</span>
            {showUni && uniList.length > 0 && (
              <div style={styles.suggestions}>
                {uniList.map((u) => (
                  <button key={u._id} type="button" style={styles.suggestion} onClick={() => selectUni(u)}>
                    <span style={{ fontWeight: 600, color: '#F0F2FF', fontSize: 14 }}>{u.name}</span>
                    <span style={{ fontSize: 12, color: '#9BA3C7' }}>{u.city}, {u.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Address */}
          <div className="form-group">
            <label className="form-label">Street Address *</label>
            <input className="form-input" placeholder="123 College Ave" value={form.address} onChange={(e) => f('address', e.target.value)} required />
            <span className="form-hint">Used to calculate distance to campus automatically — not shown publicly</span>
          </div>

          {/* City + State */}
          <div style={styles.row2}>
            <div className="form-group">
              <label className="form-label">City *</label>
              <input className="form-input" placeholder="Orlando" value={form.city} onChange={(e) => f('city', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">State *</label>
              <select className="form-select" value={form.state} onChange={(e) => f('state', e.target.value)} required>
                <option value="">Select state</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Describe the space, amenities, neighborhood, lease terms..." value={form.description} onChange={(e) => f('description', e.target.value)} style={{ minHeight: 120 }} />
          </div>

          {/* Images */}
          <div className="form-group">
            <label className="form-label">Photos {!editId && '*'}</label>
            {existingImgs.length > 0 && (
              <div style={styles.thumbRow}>
                {existingImgs.map((url) => (
                  <div key={url} style={styles.thumbWrap}>
                    <img src={url} style={styles.thumbImg} alt="" />
                    <button type="button" style={styles.removeThumb} onClick={() => removeExisting(url)}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <input type="file" accept="image/*" multiple onChange={handleImages} style={{ display: 'none' }} id="img-upload" />
            <label htmlFor="img-upload" style={styles.uploadBtn}>
              📷 {images.length > 0 ? `${images.length} photo(s) selected` : 'Choose photos'}
            </label>
            {previews.length > 0 && (
              <div style={styles.thumbRow}>
                {previews.map((src, i) => (
                  <div key={i} style={styles.thumbWrap}>
                    <img src={src} style={styles.thumbImg} alt="" />
                  </div>
                ))}
              </div>
            )}
            <span className="form-hint">First photo becomes the main card image. Max 10 photos, 5MB each.</span>
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Saving...' : editId ? 'Save Changes' : 'Post Listing'}
          </button>
        </form>
      </div>

      {/* Click outside to close suggestions */}
      {showUni && <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowUni(false)} />}
    </div>
  )
}

export default function CreateListingPage() { return <ListingForm /> }
export function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  return <ListingForm editId={id} />
}

const styles: Record<string, React.CSSProperties> = {
  heading:    { fontFamily: "'Syne', sans-serif", fontSize: 32, marginBottom: 8 },
  sub:        { color: '#9BA3C7', marginBottom: 32 },
  form:       { display: 'flex', flexDirection: 'column', gap: 20, background: '#1E2340', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '32px' },
  row2:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  error:      { background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#FF6B6B' },
  suggestions:{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#252A4A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, zIndex: 10, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' },
  suggestion: { display: 'flex', flexDirection: 'column', gap: 2, width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: "'DM Sans', sans-serif" },
  uploadBtn:  { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '2px dashed rgba(255,255,255,0.15)', borderRadius: 12, padding: '20px', cursor: 'pointer', fontSize: 14, color: '#9BA3C7', fontFamily: "'Syne', sans-serif", fontWeight: 600, transition: 'border-color 0.15s' },
  thumbRow:   { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  thumbWrap:  { position: 'relative', width: 80, height: 60 },
  thumbImg:   { width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 },
  removeThumb:{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: '50%', background: '#FF6B6B', border: 'none', color: '#fff', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
}
