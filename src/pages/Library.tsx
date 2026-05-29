import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, EmptyState, Icon, Spinner } from '../components/ui'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/appStore'
import {
  addLibraryCourse,
  getLibraryCourse,
  LibraryCourse,
  LibraryCoursePreview,
  listLibrary,
} from '../lib/libraryApi'

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Library() {
  const [courses, setCourses] = useState<LibraryCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subject, setSubject] = useState<string>('All')
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    listLibrary()
      .then(setCourses)
      .catch(e => setError(e.message ?? 'Failed to load library'))
      .finally(() => setLoading(false))
  }, [])

  const subjects = ['All', ...Array.from(new Set(courses.map(c => c.subject).filter(Boolean))).sort()]
  const filtered = subject === 'All' ? courses : courses.filter(c => c.subject === subject)

  const markAdded = (slug: string) => {
    setCourses(prev => prev.map(c => c.slug === slug ? { ...c, added: true } : c))
  }

  if (loading) return <CenteredSpinner />
  if (error) return <PageError message={error} />

  return (
    <div className="library-page">
      <header className="library-header">
        <h1 className="library-title">Course Library</h1>
        <p className="library-subtitle">
          Add a course to your learning plan to begin studying with daily quizzes and reading slices.
        </p>
      </header>

      <SubjectFilter subjects={subjects} active={subject} onChange={setSubject} />

      {filtered.length === 0 ? (
        <EmptyState
          icon="book"
          title="No courses here yet"
          body="Check back after more courses have been ingested, or clear the subject filter."
        />
      ) : (
        <div className="library-grid">
          {filtered.map(course => (
            <CourseCard
              key={course.slug}
              course={course}
              onPreview={() => setPreview(course.slug)}
              onAdded={markAdded}
            />
          ))}
        </div>
      )}

      {preview && (
        <PreviewModal
          slug={preview}
          isAdded={courses.find(c => c.slug === preview)?.added ?? false}
          onClose={() => setPreview(null)}
          onAdded={markAdded}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subject filter strip
// ---------------------------------------------------------------------------

function SubjectFilter({
  subjects, active, onChange,
}: { subjects: string[]; active: string; onChange: (s: string) => void }) {
  if (subjects.length <= 2) return null
  return (
    <div className="library-filters" role="group" aria-label="Filter by subject">
      {subjects.map(s => (
        <button
          key={s}
          className={`library-filter-btn${s === active ? ' active' : ''}`}
          onClick={() => onChange(s)}
          aria-pressed={s === active}
        >
          {s}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Course card
// ---------------------------------------------------------------------------

function CourseCard({
  course, onPreview, onAdded,
}: { course: LibraryCourse; onPreview: () => void; onAdded: (slug: string) => void }) {
  const navigate = useNavigate()
  const hydrate = useAppStore(s => s.hydrate)
  const [adding, setAdding] = useState(false)

  const handleAdd = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (course.added || adding) return
    setAdding(true)
    try {
      const result = await addLibraryCourse(course.slug)
      onAdded(course.slug)
      await hydrate()
      navigate(`/course/${result.courseId}`)
    } catch {
      setAdding(false)
    }
  }, [course.added, course.slug, adding, navigate, onAdded, hydrate])

  return (
    <Card className="library-card" onClick={onPreview} role="button" tabIndex={0}
          onKeyDown={e => e.key === 'Enter' && onPreview()}>
      <div className="library-card-meta">
        {course.subject && <span className="library-card-subject">{course.subject}</span>}
        {course.level && <Badge>{course.level}</Badge>}
        {course.hasVideo && <Badge><Icon name="play" size={12} /> Video</Badge>}
      </div>

      <h2 className="library-card-title">{course.title}</h2>

      <p className="library-card-number">
        {[course.courseNumber, course.term].filter(Boolean).join(' · ')}
      </p>

      {course.description && (
        <p className="library-card-description">{truncate(course.description, 140)}</p>
      )}

      <div className="library-card-footer">
        <span className="library-card-count">
          <Icon name="layers" size={14} />
          {course.lectureCount} {course.lectureCount === 1 ? 'lesson' : 'lessons'}
        </span>

        {course.added ? (
          <Button variant="ghost" size="sm" disabled>
            <Icon name="check" size={14} /> Added
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleAdd}
            disabled={adding}
            aria-label={`Add ${course.title} to your learning plan`}
          >
            {adding ? <Spinner size={14} /> : <Icon name="plus" size={14} />}
            {adding ? 'Adding...' : 'Add'}
          </Button>
        )}
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Preview modal
// ---------------------------------------------------------------------------

function PreviewModal({
  slug, isAdded, onClose, onAdded,
}: { slug: string; isAdded: boolean; onClose: () => void; onAdded: (slug: string) => void }) {
  const navigate = useNavigate()
  const hydrate = useAppStore(s => s.hydrate)
  const [data, setData] = useState<LibraryCoursePreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    getLibraryCourse(slug)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleAdd = useCallback(async () => {
    if (isAdded || adding || !data) return
    setAdding(true)
    try {
      const result = await addLibraryCourse(slug)
      onAdded(slug)
      onClose()
      await hydrate()
      navigate(`/course/${result.courseId}`)
    } catch {
      setAdding(false)
    }
  }, [isAdded, adding, data, slug, navigate, onAdded, onClose, hydrate])

  return (
    <div
      ref={backdropRef}
      className="library-modal-backdrop"
      onClick={e => e.target === backdropRef.current && onClose()}
      role="dialog"
      aria-modal
      aria-label="Course preview"
    >
      <div className="library-modal">
        <button className="library-modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" size={18} />
        </button>

        {loading && <CenteredSpinner />}

        {!loading && !data && (
          <p className="library-modal-error">Could not load course preview.</p>
        )}

        {!loading && data && (
          <>
            <div className="library-modal-header">
              <h2 className="library-modal-title">{data.title}</h2>
              <p className="library-modal-sub">
                {[data.courseNumber, data.term, data.instructor].filter(Boolean).join(' · ')}
              </p>
              {data.description && (
                <p className="library-modal-description">{data.description}</p>
              )}
            </div>

            <div className="library-modal-toc">
              {data.units.map(unit => (
                <div key={unit.ord} className="library-toc-unit">
                  <h3 className="library-toc-unit-title">{unit.title}</h3>
                  <ol className="library-toc-lectures">
                    {unit.lectures.map(lec => (
                      <li key={lec.ord} className="library-toc-lecture">
                        {lec.hasVideo && <Icon name="play" size={12} className="lec-video-icon" />}
                        {lec.title}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>

            <div className="library-modal-actions">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              {isAdded ? (
                <Button variant="ghost" size="sm" disabled>
                  <Icon name="check" size={14} /> Already in your plan
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={handleAdd} disabled={adding}>
                  {adding ? <Spinner size={14} /> : <Icon name="plus" size={14} />}
                  {adding ? 'Adding...' : `Add ${data.lectureCount} lessons`}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small shared helpers
// ---------------------------------------------------------------------------

function CenteredSpinner() {
  return (
    <div className="library-centered">
      <Spinner size={28} />
    </div>
  )
}

function PageError({ message }: { message: string }) {
  return (
    <div className="library-centered">
      <EmptyState icon="x" title="Something went wrong" body={message} />
    </div>
  )
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text
  return text.slice(0, max).replace(/\s\S*$/, '') + '...'
}
