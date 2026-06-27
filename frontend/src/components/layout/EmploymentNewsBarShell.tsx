/** Reserved 36px slot while EmploymentNewsBar chunk loads — prevents navbar/content shift (CLS). */
export default function EmploymentNewsBarShell() {
  return (
    <aside
      className="employment-news-bar employment-news-bar--shell"
      aria-hidden="true"
    >
      <div className="employment-news-bar__inner">
        <div className="employment-news-bar__badge">
          <span className="employment-news-bar__dot" aria-hidden="true" />
          <span className="employment-news-bar__label employment-news-bar__label--shell">
            Daily employment news
          </span>
        </div>
      </div>
    </aside>
  )
}
