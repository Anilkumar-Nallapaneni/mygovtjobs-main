import { Link } from "react-router-dom";
import "@/styles/topmate-inspired.css";

const offerings = [
  { icon: "📅", title: "Exams & Calendar", text: "Browse examinations and upcoming dates.", href: "/exams", action: "Browse exams" },
  { icon: "📋", title: "Results & Admit Cards", text: "Check official exam updates and results.", href: "/results", action: "View results" },
  { icon: "📝", title: "Mock Tests", text: "Practice with topic-wise and exam-focused tests and track your progress.", href: "/education/mock-tests", action: "Take a test" },
  { icon: "🎓", title: "Scholarships & Education", text: "Discover scholarships, colleges, courses and useful education resources.", href: "/scholarships", action: "Explore scholarships" },
];

const quickLinks = [
  ["Government Jobs After 10th", "/qualification/10th"],
  ["Government Jobs After 12th", "/qualification/12th"],
  ["Government Jobs After Graduation", "/qualification/graduate"],
  ["Latest Notifications", "/jobs/latest-notifications"],
];

export default function HomeCareerMarketplace() {
  return (
    <section className="career-marketplace" aria-labelledby="career-marketplace-title">
      <div className="career-marketplace__head">
        <div>
          <h2 id="career-marketplace-title">Exams, results and preparation</h2>
        </div>
        <Link className="career-marketplace__primary" to="/education">Explore Education <span aria-hidden>→</span></Link>
      </div>

      <div className="career-marketplace__grid">
        {offerings.map((item) => (
          <Link className="career-offer-card" to={item.href} key={item.title}>
            <span className="career-offer-card__icon" aria-hidden>{item.icon}</span>
            <span className="career-offer-card__title">{item.title}</span>
            <span className="career-offer-card__text">{item.text}</span>
            <span className="career-offer-card__action">{item.action} <span aria-hidden>↗</span></span>
          </Link>
        ))}
      </div>

      <div className="career-marketplace__quick">
        <span className="career-marketplace__quick-label">Useful shortcuts</span>
        <div className="career-marketplace__chips">
          {quickLinks.map(([label, href]) => <Link key={label} to={href}>{label}</Link>)}
        </div>
      </div>
    </section>
  );
}
