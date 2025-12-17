import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './index.css';
import projects from './data/projects.json';

// PUBLIC_INTERFACE
function App() {
  /**
   * Single Page Portfolio app with smooth-scroll nav,
   * sections: Hero, About, Skills, Projects, Resume, Contact
   * Optional email sending via EmailJS gated by env vars.
   */
  const [theme, setTheme] = useState('light');

  // Sections refs for smooth scroll
  const sections = {
    hero: useRef(null),
    about: useRef(null),
    skills: useRef(null),
    projects: useRef(null),
    resume: useRef(null),
    contact: useRef(null),
  };

  // Track active section for nav highlight
  const [active, setActive] = useState('hero');

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // PUBLIC_INTERFACE
  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Smooth scroll helper
  const scrollTo = (key) => {
    const el = sections[key]?.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // EmailJS env gating (no dependency added; we will POST to EmailJS REST only if configured)
  const emailConfig = useMemo(
    () => ({
      enabled:
        !!process.env.REACT_APP_EMAILJS_PUBLIC_KEY &&
        !!process.env.REACT_APP_EMAILJS_SERVICE_ID &&
        !!process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
      publicKey: process.env.REACT_APP_EMAILJS_PUBLIC_KEY,
      serviceId: process.env.REACT_APP_EMAILJS_SERVICE_ID,
      templateId: process.env.REACT_APP_EMAILJS_TEMPLATE_ID,
    }),
    []
  );

  const [contactState, setContactState] = useState({
    name: '',
    email: '',
    message: '',
    status: 'idle', // idle | sending | success | error
    error: '',
  });

  // PUBLIC_INTERFACE
  const handleContactChange = (e) => {
    const { name, value } = e.target;
    setContactState((s) => ({ ...s, [name]: value }));
  };

  // PUBLIC_INTERFACE
  async function handleContactSubmit(e) {
    e.preventDefault();
    setContactState((s) => ({ ...s, status: 'sending', error: '' }));

    // If EmailJS config not present, simulate success
    if (!emailConfig.enabled) {
      setTimeout(() => {
        setContactState((s) => ({
          ...s,
          status: 'success',
        }));
      }, 800);
      return;
    }

    // EmailJS REST call
    try {
      const payload = {
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templateId,
        user_id: emailConfig.publicKey,
        template_params: {
          from_name: contactState.name,
          from_email: contactState.email,
          message: contactState.message,
        },
      };

      const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Failed to send message');
      }

      setContactState({
        name: '',
        email: '',
        message: '',
        status: 'success',
        error: '',
      });
    } catch (err) {
      setContactState((s) => ({
        ...s,
        status: 'error',
        error: err?.message || 'Unknown error',
      }));
    }
  }

  const primary = '#3b82f6'; // blue-500
  const accent = '#06b6d4'; // cyan-500
  const secondaryText = '#64748b'; // slate-500

  // IntersectionObserver for reveal animations with support for stagger via [data-delay]
  useEffect(() => {
    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduce) return;

    const revealables = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
    revealables.forEach((el) => el.classList.remove('revealed')); // reset

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const d = entry.target.getAttribute('data-delay');
            if (d) {
              setTimeout(() => entry.target.classList.add('revealed'), Number(d));
            } else {
              entry.target.classList.add('revealed');
            }
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.1 }
    );

    revealables.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [theme]); // theme change can re-render; re-run safely

  // Active-link highlighting with throttled scroll listener + scroll progress + parallax
  useEffect(() => {
    const sectionOrder = ['hero', 'about', 'skills', 'projects', 'resume', 'contact'];
    const getY = (key) => sections[key]?.current?.getBoundingClientRect().top ?? Infinity;
    const progressEl = ensureProgressBar();

    const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const heroEl = sections.hero?.current;
    let parallaxLayer = null;
    if (heroEl && !prefersReduce) {
      parallaxLayer = document.createElement('div');
      parallaxLayer.className = 'hero-parallax';
      heroEl.appendChild(parallaxLayer);
    }

    // nav underline slider setup
    const nav = document.querySelector('nav ul');
    let underline;
    if (nav) {
      underline = document.createElement('div');
      underline.className = 'nav-underline';
      nav.style.position = 'relative';
      nav.appendChild(underline);
    }

    const setUnderlineToActive = () => {
      if (!underline) return;
      const activeLink = document.querySelector('.nav-link.active');
      if (activeLink) {
        const rect = activeLink.getBoundingClientRect();
        const parentRect = nav.getBoundingClientRect();
        underline.style.width = rect.width + 'px';
        underline.style.left = rect.left - parentRect.left + 'px';
        underline.style.transform = 'translateY(' + (rect.height + 6) + 'px)';
      }
    };

    const setProgress = () => {
      if (!progressEl) return;
      const scrolled = window.scrollY;
      const height = document.documentElement.scrollHeight - window.innerHeight;
      const pct = height > 0 ? (scrolled / height) * 100 : 0;
      progressEl.style.width = `${pct}%`;
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        // Determine active section
        const offset = 120;
        const tops = sectionOrder.map((k) => [k, getY(k) - offset]);
        const visible = tops
          .filter(([, y]) => y <= 80)
          .sort((a, b) => Math.abs(a[1]) - Math.abs(b[1]));
        if (visible.length) {
          const [k] = visible[0];
          if (k && k !== active) setActive(k);
        } else {
          const ahead = tops.filter(([, y]) => y > 80).sort((a, b) => a[1] - b[1]);
          if (ahead.length) {
            const [k] = ahead[0];
            if (k && k !== active) setActive(k);
          }
        }

        // Progress bar
        setProgress();

        // Parallax: subtle translate based on scroll
        if (parallaxLayer) {
          const y = window.scrollY * 0.06; // gentle
          parallaxLayer.style.transform = `translate3d(0, ${y}px, 0)`;
          parallaxLayer.style.background =
            'radial-gradient(600px 180px at 20% 0%, rgba(59,130,246,0.12), transparent 60%), radial-gradient(600px 180px at 80% 0%, rgba(6,182,212,0.12), transparent 60%)';
        }

        // underline to active
        setUnderlineToActive();

        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll(); // initialize

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (parallaxLayer && heroEl) heroEl.removeChild(parallaxLayer);
      if (underline && nav) nav.removeChild(underline);
    };
  }, [active, sections]);

  return (
    <div className="App" style={{ background: 'var(--bg-primary)' }}>
      <a href="#main" className="skip-to-content">Skip to content</a>
      <div className="scroll-progress" aria-hidden></div>
      <Header
        onNav={scrollTo}
        onToggleTheme={toggleTheme}
        theme={theme}
        active={active}
        primary={primary}
        accent={accent}
      />

      <main id="main">
        <Hero
          refProp={sections.hero}
          primary={primary}
          accent={accent}
          secondaryText={secondaryText}
        />
        <About refProp={sections.about} secondaryText={secondaryText} />
        <Skills
          refProp={sections.skills}
          primary={primary}
          accent={accent}
          secondaryText={secondaryText}
        />
        <Projects
          refProp={sections.projects}
          data={projects}
          primary={primary}
          accent={accent}
          secondaryText={secondaryText}
        />
        <Resume
          refProp={sections.resume}
          primary={primary}
          accent={accent}
          secondaryText={secondaryText}
        />
        <Contact
          refProp={sections.contact}
          state={contactState}
          onChange={handleContactChange}
          onSubmit={handleContactSubmit}
          emailEnabled={emailConfig.enabled}
          primary={primary}
          accent={accent}
          secondaryText={secondaryText}
        />
      </main>

      <Footer primary={primary} accent={accent} />

      {/* Basic SEO tags for SPA */}
      <SeoTags />
    </div>
  );
}

// PUBLIC_INTERFACE
function Header({ onNav, onToggleTheme, theme, active, primary, accent }) {
  /** Header with site title and smooth-scroll nav */
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-color)',
        backdropFilter: 'saturate(180%) blur(6px)',
      }}
      aria-label="Main header and navigation"
    >
      <div
        className="container"
        style={{
          margin: '0 auto',
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            minWidth: 0,
          }}
        >
          <a
            href="#hero"
            onClick={(e) => {
              e.preventDefault();
              onNav('hero');
            }}
            style={{
              fontWeight: 800,
              color: 'var(--text-primary)',
              textDecoration: 'none',
              letterSpacing: '.2px',
              whiteSpace: 'nowrap',
            }}
            aria-label="Go to top"
          >
            Your Name
          </a>
          <span
            style={{
              fontSize: 12,
              color: '#999',
              borderLeft: '1px solid var(--border-color)',
              paddingLeft: 8,
            }}
          >
            Software Engineer
          </span>
        </div>

        <nav aria-label="Primary navigation">
          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              gap: 18,
              margin: 0,
              padding: 0,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            {[
              ['About', 'about'],
              ['Skills', 'skills'],
              ['Projects', 'projects'],
              ['Resume', 'resume'],
              ['Contact', 'contact'],
            ].map(([label, key]) => (
              <li key={key}>
                <a
                  className={`nav-link ${active === key ? 'active' : ''}`}
                  href={`#${key}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onNav(key);
                  }}
                  style={{
                    color: active === key ? 'var(--accent-1)' : 'var(--text-primary)',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = primary)}
                  onMouseOut={(e) =>
                    (e.currentTarget.style.color =
                      active === key ? 'var(--accent-1)' : 'var(--text-primary)')
                  }
                >
                  {label}
                </a>
              </li>
            ))}
            <li>
              <button
                className="theme-toggle btn btn-outline"
                onClick={onToggleTheme}
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${primary}`,
                  background: 'transparent',
                  color: primary,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </li>
          </ul>
        </nav>
      </div>
      <div
        aria-hidden
        style={{
          height: 2,
          width: '100%',
          background: `linear-gradient(90deg, ${primary}, ${accent})`,
          opacity: 0.35,
        }}
      />
    </header>
  );
}

// PUBLIC_INTERFACE
function Hero({ refProp, primary, accent, secondaryText }) {
  /** Intro hero with call to actions */
  return (
    <section
      id="hero"
      ref={refProp}
      className="hero-accent"
      style={{
        padding: '80px 20px',
      }}
    >
      <div className="container">
        <p
          className="reveal"
          data-delay="0"
          style={{
            color: secondaryText,
            fontWeight: 600,
            letterSpacing: '.4px',
            margin: '0 0 8px',
          }}
        >
          Hello, I’m
        </p>
        <h1
          className="reveal"
          data-delay="80"
          style={{
            margin: '0 0 10px',
            lineHeight: 1.2,
            color: 'var(--text-primary)',
          }}
        >
          Your Name
        </h1>
        <p
          className="reveal"
          data-delay="140"
          style={{
            color: secondaryText,
            maxWidth: 720,
            fontSize: 18,
            lineHeight: 1.7,
          }}
        >
          I’m a software engineer specializing in building exceptional digital
          experiences. I focus on modern web apps, system design, and developer
          experience.
        </p>

        <div className="reveal" data-delay="220" style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <a
            href="#projects"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={buttonStyle(primary)}
            className="btn btn-gradient"
          >
            View Projects
          </a>
          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
            }}
            style={buttonOutlineStyle(accent)}
            className="btn btn-outline"
          >
            Contact Me
          </a>
        </div>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function About({ refProp, secondaryText }) {
  /** About section with placeholder content */
  return (
    <section id="about" ref={refProp} style={sectionStyle()}>
      <div className="container">
        <h2 className="reveal" data-delay="0" style={sectionTitleStyle()}>About Me</h2>
        <p className="reveal" data-delay="120" style={{ color: secondaryText, lineHeight: 1.8 }}>
          I am a passionate software engineer with experience across the stack —
          from crafting responsive interfaces to building scalable backend
          systems. I love clean architecture, resilient systems, and thoughtful
          developer tooling.
        </p>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function Skills({ refProp, primary, accent, secondaryText }) {
  /** Skills section listing core technologies */
  const skills = [
    'JavaScript (ESNext)',
    'TypeScript',
    'React',
    'Node.js',
    'Express',
    'GraphQL',
    'PostgreSQL',
    'Docker & CI/CD',
    'Testing (Jest/RTL)',
    'System Design',
  ];
  return (
    <section id="skills" ref={refProp} style={sectionStyle()}>
      <div className="container">
        <h2 className="reveal" data-delay="0" style={sectionTitleStyle()}>Skills</h2>
        <ul
          className="reveal"
          data-delay="120"
          style={{
            listStyle: 'none',
            display: 'grid',
            gap: 12,
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            padding: 0,
            margin: '20px 0 0',
          }}
        >
          {skills.map((s, idx) => (
            <li
              key={s}
              className="card icon-hover"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 10,
                padding: '10px 12px',
                color: 'var(--text-primary)',
                background: 'var(--bg-secondary)',
                transition: 'transform .18s ease, box-shadow .2s ease',
              }}
              data-delay={100 + idx * 40}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${primary}, ${accent})`,
                  marginRight: 8,
                  verticalAlign: 'middle',
                }}
              />
              {s}
            </li>
          ))}
        </ul>
        <p className="reveal" data-delay="200" style={{ color: secondaryText, marginTop: 14, fontSize: 14 }}>
          Always learning and adapting to new technologies and best practices.
        </p>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function Projects({ refProp, data, primary, accent, secondaryText }) {
  /** Projects grid driven by JSON data file */
  return (
    <section id="projects" ref={refProp} style={sectionStyle()}>
      <div className="container">
        <h2 className="reveal" data-delay="0" style={sectionTitleStyle()}>Projects</h2>
        <p className="reveal" data-delay="120" style={{ color: secondaryText, marginTop: 0 }}>
          A selection of work that showcases problem solving and product thinking.
        </p>
        <div
          className="reveal"
          data-delay="160"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}
        >
          {data.map((p, idx) => (
            <article
              key={p.id}
              className="card"
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 12,
                padding: 16,
                background: 'var(--bg-secondary)',
              }}
              data-delay={100 + idx * 60}
            >
              <h3 style={{ margin: '0 0 8px', color: 'var(--text-primary)' }}>
                {p.title}
              </h3>
              <p style={{ margin: '0 0 10px', color: secondaryText }}>{p.description}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {p.tech.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 12,
                      borderRadius: 999,
                      padding: '4px 8px',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {p.demo && (
                  <a href={p.demo} target="_blank" rel="noreferrer" style={buttonStyle(primary)} className="btn btn-gradient">
                    Live Demo
                  </a>
                )}
                {p.repo && (
                  <a
                    href={p.repo}
                    target="_blank"
                    rel="noreferrer"
                    style={buttonOutlineStyle(accent)}
                    className="btn btn-outline"
                  >
                    Source
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function Resume({ refProp, primary, accent, secondaryText }) {
  /** Resume section with downloadable file in public/ */
  return (
    <section id="resume" ref={refProp} style={sectionStyle()}>
      <div className="container">
        <h2 className="reveal" data-delay="0" style={sectionTitleStyle()}>Resume</h2>
        <p className="reveal" data-delay="120" style={{ color: secondaryText }}>
          Download a copy of my resume for details on experience and education.
        </p>
        <div className="reveal" data-delay="160" style={{ marginTop: 14 }}>
          <a href="/assets/resume.pdf" download style={buttonStyle(primary)} className="btn btn-gradient">
            Download Resume
          </a>
          <a
            href="/assets/resume.pdf"
            target="_blank"
            rel="noreferrer"
            style={{ ...buttonOutlineStyle(accent), marginLeft: 10 }}
            className="btn btn-outline"
          >
            View in Browser
          </a>
        </div>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function Contact({
  refProp,
  state,
  onChange,
  onSubmit,
  emailEnabled,
  primary,
  accent,
  secondaryText,
}) {
  /** Contact form with optional EmailJS integration (env-gated) */
  const fieldStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    background: 'var(--bg-secondary)',
  };

  return (
    <section id="contact" ref={refProp} style={sectionStyle()}>
      <div className="container">
        <h2 className="reveal" data-delay="0" style={sectionTitleStyle()}>Contact</h2>
        <p className="reveal" data-delay="120" style={{ color: secondaryText }}>
          {emailEnabled
            ? 'Send me a message and I will get back to you shortly.'
            : 'Email sending is not configured. Submit will simulate success.'}
        </p>
        <form
          onSubmit={onSubmit}
          className="reveal"
          data-delay="160"
          style={{
            marginTop: 16,
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 12,
            maxWidth: 600,
          }}
        >
          <label style={{ fontSize: 14 }}>
            Name
            <input
              type="text"
              name="name"
              value={state.name}
              onChange={onChange}
              required
              placeholder="Your name"
              style={{ ...fieldStyle, marginTop: 6 }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Email
            <input
              type="email"
              name="email"
              value={state.email}
              onChange={onChange}
              required
              placeholder="you@example.com"
              style={{ ...fieldStyle, marginTop: 6 }}
            />
          </label>

          <label style={{ fontSize: 14 }}>
            Message
            <textarea
              name="message"
              value={state.message}
              onChange={onChange}
              required
              placeholder="How can I help?"
              rows={6}
              style={{ ...fieldStyle, marginTop: 6, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="submit"
              disabled={state.status === 'sending'}
              className="btn btn-gradient"
              style={{
                ...buttonStyle(primary),
                opacity: state.status === 'sending' ? 0.7 : 1,
                cursor: state.status === 'sending' ? 'not-allowed' : 'pointer',
              }}
            >
              {state.status === 'sending' ? 'Sending...' : 'Send Message'}
            </button>
            {state.status === 'success' && (
              <span style={{ color: accent, fontWeight: 600 }}>Message sent!</span>
            )}
            {state.status === 'error' && (
              <span style={{ color: '#EF4444', fontWeight: 600 }}>
                Failed to send: {state.error}
              </span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

// PUBLIC_INTERFACE
function Footer({ primary, accent }) {
  /** Simple footer with social links */
  return (
    <footer
      style={{
        marginTop: 40,
        padding: '30px 20px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-primary)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 14,
          flexWrap: 'wrap',
          width: '100%',
        }}
      >
        <span style={{ color: 'var(--text-primary)' }}>
          © {new Date().getFullYear()} Your Name
        </span>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a
            href="https://github.com/your-handle"
            target="_blank"
            rel="noreferrer"
            style={linkHover(primary)}
            className="btn btn-outline"
          >
            GitHub
          </a>
          <a
            href="https://www.linkedin.com/in/your-handle"
            target="_blank"
            rel="noreferrer"
            style={linkHover(accent)}
            className="btn btn-outline"
          >
            LinkedIn
          </a>
          <a
            href="mailto:you@example.com"
            style={linkHover(primary)}
            className="btn btn-outline"
          >
            Email
          </a>
        </div>
      </div>
    </footer>
  );
}

// PUBLIC_INTERFACE
function SeoTags() {
  /**
   * Injects basic SPA SEO tags into the document head.
   * This is kept minimal due to CRA constraints; full SEO should be in public/index.html.
   */
  useEffect(() => {
    document.title = 'Your Name | Software Engineer';
    const metaDesc = ensureMeta('description', {
      name: 'description',
      content:
        'Software engineer portfolio featuring projects, skills, resume, and contact information.',
    });
    const metaOg = ensureMeta('og:title', {
      property: 'og:title',
      content: 'Your Name | Software Engineer',
    });

    return () => {
      // keep tags; no cleanup
      void metaDesc;
      void metaOg;
    };
  }, []);

  return null;
}

function ensureMeta(key, attrs) {
  const selector = attrs.name
    ? `meta[name="${attrs.name}"]`
    : `meta[property="${attrs.property}"]`;
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => {
      el.setAttribute(k, v);
    });
    document.head.appendChild(el);
  } else {
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  }
  return el;
}

function ensureProgressBar() {
  let el = document.querySelector('.scroll-progress');
  if (!el) {
    el = document.createElement('div');
    el.className = 'scroll-progress';
    document.body.appendChild(el);
  }
  return el;
}

/* ====== Styles helpers ====== */
function buttonStyle(color) {
  return {
    display: 'inline-block',
    textDecoration: 'none',
    background: color,
    color: '#fff',
    padding: '10px 14px',
    borderRadius: 12,
    fontWeight: 700,
    border: `1px solid ${color}`,
  };
}

function buttonOutlineStyle(color) {
  return {
    display: 'inline-block',
    textDecoration: 'none',
    background: 'transparent',
    color: color,
    padding: '10px 14px',
    borderRadius: 12,
    fontWeight: 700,
    border: `1px solid ${color}`,
  };
}

function sectionStyle() {
  return {
    padding: '68px 20px',
    background: 'var(--bg-primary)',
  };
}
function sectionTitleStyle() {
  return {
    margin: '0 0 10px',
    color: 'var(--text-primary)',
  };
}
function containerInner() {
  return { maxWidth: 1100, margin: '0 auto', textAlign: 'left' };
}
function linkHover(color) {
  return {
    color: 'var(--text-primary)',
    textDecoration: 'none',
    padding: '6px 6px',
    borderRadius: 8,
    border: `1px solid transparent`,
    transition: 'all .15s ease',
    outline: 'none',
    boxShadow: 'none',
  };
}

export default App;
