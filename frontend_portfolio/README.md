# Personal Portfolio (React SPA)

A lightweight single‑page portfolio with sections for Hero, About, Skills, Projects, Resume, and Contact. Uses minimal dependencies, smooth-scroll navigation, and a theme tuned to #3b82f6 and #06b6d4.

## Features
- Single page with in‑page smooth scrolling (no router)
- Responsive, modern design with semantic HTML
- Projects driven from JSON (`src/data/projects.json`)
- Resume download/view from `public/assets/resume.pdf`
- Contact form with optional EmailJS integration via env vars
- Basic SEO: `public/index.html` meta, `public/robots.txt`, `public/sitemap.xml`
- Dark/light theme toggle

## Getting Started

Install and run:
```bash
npm install
npm start
```

Build:
```bash
npm run build
```

## Configure Email (Optional)
Create `.env` from `.env.example` and set:
- `REACT_APP_EMAILJS_PUBLIC_KEY`
- `REACT_APP_EMAILJS_SERVICE_ID`
- `REACT_APP_EMAILJS_TEMPLATE_ID`

If these are not set, the Contact form will simulate success without sending.

## Content
- Update your name, bio, and social links in `src/App.js` (Header, Hero, Footer).
- Update projects in `src/data/projects.json`.
- Place your resume file at `public/assets/resume.pdf`.

## SEO
- Update `<title>` and `<meta>` in `public/index.html`.
- Adjust `public/sitemap.xml` with your domain.
- `public/robots.txt` is included and references the sitemap.

## Environment
A `.env.example` is provided including the container vars and optional EmailJS vars.

