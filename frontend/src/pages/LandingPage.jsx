import { Link } from "react-router-dom";

const trustItems = ["CTF", "SOC", "IR", "Docker Labs", "Learning Paths"];

const tickerItems = [
  "Web Reconnaissance",
  "SIEM Log Analysis",
  "Incident Triage",
  "Brute Force Detection",
  "Dockerized Labs",
  "Learning Paths",
  "Admin Analytics",
  "Flag Submission",
  "Threat Investigation",
  "Progress Tracking",
];

const modules = [
  {
    badge: "CTF",
    title: "CTF Challenges",
    description: "Flag-based labs with guided explanations after solving.",
    helperText: "Login required",
  },
  {
    badge: "SOC",
    title: "SOC Case Analysis",
    description: "Investigate realistic logs and identify suspicious activity.",
    helperText: "Sign in to access",
  },
  {
    badge: "IR",
    title: "Incident Response",
    description: "Work through triage, analysis, and containment decisions.",
    helperText: "Login required",
  },
  {
    badge: "LEARN",
    title: "Learning Paths",
    description: "Follow structured lessons before starting hands-on practice.",
    helperText: "Sign in to access",
  },
  {
    badge: "LAB",
    title: "Docker Lab Prototype",
    description: "Launch an isolated web reconnaissance lab for live practice.",
    helperText: "Login required",
  },
  {
    badge: "ADMIN",
    title: "Admin Insights",
    description: "Track activity, feedback, progress, and training performance.",
    helperText: "Sign in to access",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Learn",
    text: "Start with guided course content before entering labs.",
  },
  {
    step: "02",
    title: "Practice",
    text: "Solve hands-on CTF, SOC, and Docker-backed exercises.",
  },
  {
    step: "03",
    title: "Investigate",
    text: "Review evidence, logs, and timelines like a real analyst.",
  },
  {
    step: "04",
    title: "Submit",
    text: "Answer questions, capture flags, and receive explanations.",
  },
  {
    step: "05",
    title: "Track",
    text: "Measure progress, rankings, and platform activity over time.",
  },
];

const features = [
  {
    title: "Guided explanations",
    text: "Every solve can lead into a teaching moment, not just a score.",
  },
  {
    title: "Database-backed courses",
    text: "Learning paths and lessons are structured for repeatable training.",
  },
  {
    title: "Admin management",
    text: "Admins can manage content, review feedback, and monitor activity.",
  },
  {
    title: "Expandable Docker labs",
    text: "The platform already demonstrates isolated lab launch architecture.",
  },
];

const previewLogs = [
  "[09:14] Threat Investigation workspace online",
  "[09:16] Docker Lab Online | hidden-comment-lab",
  "[09:19] New SOC alert queued for analyst review",
  "[09:22] Incident step progress synchronized",
];

function LandingPage() {
  const repeatedTickerItems = [...tickerItems, ...tickerItems];

  return (
    <div style={styles.page}>
      <style>
        {`
          @keyframes navDrop {
            0% { opacity: 0; transform: translateY(-20px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes fadeUp {
            0% { opacity: 0; transform: translateY(24px); }
            100% { opacity: 1; transform: translateY(0); }
          }

          @keyframes fadeLeft {
            0% { opacity: 0; transform: translateX(-28px); }
            100% { opacity: 1; transform: translateX(0); }
          }

          @keyframes fadeRight {
            0% { opacity: 0; transform: translateX(28px); }
            100% { opacity: 1; transform: translateX(0); }
          }

          @keyframes tickerMove {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }

          @keyframes scanMove {
            0% { transform: translateX(-120%); opacity: 0; }
            16% { opacity: 0.95; }
            100% { transform: translateX(220%); opacity: 0; }
          }

          @keyframes pulseGlow {
            0% { opacity: 0.42; transform: scale(1); }
            50% { opacity: 0.88; transform: scale(1.08); }
            100% { opacity: 0.42; transform: scale(1); }
          }

          @keyframes floatOrb {
            0% { transform: translateY(0px) translateX(0px); }
            50% { transform: translateY(-14px) translateX(8px); }
            100% { transform: translateY(0px) translateX(0px); }
          }

          .landing-nav-entrance {
            animation: navDrop 0.78s cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .landing-hero-left {
            animation: fadeLeft 0.88s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both;
          }

          .landing-hero-right {
            animation: fadeRight 0.92s cubic-bezier(0.22, 1, 0.36, 1) 0.22s both;
          }

          .landing-reveal-up {
            animation: fadeUp 0.82s cubic-bezier(0.22, 1, 0.36, 1) both;
          }

          .landing-button,
          .landing-module-card,
          .landing-step-card,
          .landing-feature-card,
          .landing-nav-link,
          .landing-chip-link {
            transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease, background 0.22s ease;
          }

          .landing-button-primary:hover,
          .landing-cta-primary:hover,
          .landing-top-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 22px 38px rgba(6, 182, 212, 0.22);
          }

          .landing-button-secondary:hover,
          .landing-cta-secondary:hover,
          .landing-top-link:hover {
            transform: translateY(-2px);
            border-color: rgba(34, 211, 238, 0.28);
            background: rgba(9, 18, 34, 0.94);
          }

          .landing-module-card:hover,
          .landing-step-card:hover,
          .landing-feature-card:hover {
            transform: translateY(-7px);
            border-color: rgba(45, 212, 191, 0.26);
            box-shadow: 0 26px 46px rgba(2, 8, 23, 0.34);
          }

          .landing-chip-link:hover {
            transform: translateY(-2px);
            border-color: rgba(34, 211, 238, 0.24);
            background: rgba(10, 20, 36, 0.96);
            box-shadow: 0 14px 24px rgba(2, 8, 23, 0.22);
          }

          .landing-module-card:hover .landing-card-arrow {
            transform: translateX(4px);
          }

          .landing-card-arrow {
            transition: transform 0.2s ease;
          }

          .landing-hero-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.1fr) minmax(380px, 0.9fr);
            gap: 32px;
            align-items: stretch;
          }

          .landing-module-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 22px;
          }

          .landing-workflow-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 16px;
          }

          .landing-feature-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 18px;
          }

          .landing-ticker-track {
            display: flex;
            align-items: center;
            gap: 14px;
            width: max-content;
            min-width: 200%;
            animation: tickerMove 30s linear infinite;
          }

          .landing-ticker-item {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 0 2px;
            color: #c7f9f3;
            font-size: 0.92rem;
            font-weight: 700;
            white-space: nowrap;
          }

          .landing-ticker-dot {
            width: 8px;
            height: 8px;
            border-radius: 999px;
            background: linear-gradient(135deg, #22d3ee, #2dd4bf);
            box-shadow: 0 0 12px rgba(34, 211, 238, 0.44);
            flex-shrink: 0;
          }

          @media (max-width: 1180px) {
            .landing-hero-grid {
              grid-template-columns: 1fr;
            }

            .landing-module-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .landing-workflow-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .landing-feature-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 860px) {
            .landing-module-grid,
            .landing-workflow-grid,
            .landing-feature-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 760px) {
            .landing-nav-shell {
              padding: 13px 14px;
            }

            .landing-nav-inner {
              gap: 14px;
            }

            .landing-hero-card,
            .landing-preview-card,
            .landing-cta-card {
              padding: 22px;
            }

            .landing-preview-status-grid {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <div style={styles.backgroundLayer}>
        <div style={styles.gridOverlay} />
        <div style={styles.orbOne} />
        <div style={styles.orbTwo} />
        <div style={styles.orbThree} />
      </div>

      <div style={styles.shell}>
        <header
          style={styles.navbar}
          className="landing-nav-shell landing-nav-entrance"
        >
          <div style={styles.navbarInner} className="landing-nav-inner">
            <Link to="/" style={styles.brandWrap}>
              <div style={styles.brandMark}>C</div>
              <div>
                <div style={styles.brandTitle}>Cybersecurity Training Platform</div>
                <div style={styles.brandSubtitle}>
                  Premium hands-on security training environment
                </div>
              </div>
            </Link>

            <div style={styles.navActions}>
              <Link
                to="/login"
                style={styles.topNavLink}
                className="landing-button landing-nav-link landing-top-link"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                style={styles.topNavButton}
                className="landing-button landing-nav-link landing-top-button"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        <main style={styles.container}>
          <section style={styles.heroSection}>
            <div className="landing-hero-grid">
              <div
                style={styles.heroCard}
                className="landing-hero-card landing-hero-left"
              >
                <div style={styles.heroBadge}>
                  Senior Project • Cybersecurity Training Platform
                </div>

                <h1 style={styles.heroTitle}>
                  Train Cybersecurity Skills Through{" "}
                  <span style={styles.heroTitleAccent}>Hands-On Labs</span>
                </h1>

                <p style={styles.heroSubtitle}>
                  Learn concepts, investigate realistic logs, solve CTF
                  challenges, and respond to incidents in one integrated
                  training environment.
                </p>

                <div style={styles.heroButtonRow}>
                  <Link
                    to="/register"
                    style={styles.primaryButton}
                    className="landing-button landing-button-primary"
                  >
                    Start Training
                  </Link>
                  <Link
                    to="/login"
                    style={styles.secondaryButton}
                    className="landing-button landing-button-secondary"
                  >
                    Sign In
                  </Link>
                </div>

                <div style={styles.trustRow}>
                  {trustItems.map((item) => (
                    <Link
                      key={item}
                      to="/login"
                      style={styles.trustChip}
                      className="landing-chip-link"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>

              <div
                style={styles.previewCard}
                className="landing-preview-card landing-hero-right"
              >
                <div style={styles.previewHeader}>
                  <div style={styles.previewDots}>
                    <span style={styles.dotRed} />
                    <span style={styles.dotAmber} />
                    <span style={styles.dotGreen} />
                  </div>
                  <span style={styles.previewHeaderText}>threat-training.preview</span>
                </div>

                <div style={styles.terminalPanel}>
                  <div style={styles.scanLine} />
                  <div style={styles.terminalTitle}>Threat Investigation</div>
                  <div style={styles.logStack}>
                    {previewLogs.map((line) => (
                      <div key={line} style={styles.logLine}>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={styles.previewStatusGrid}
                  className="landing-preview-status-grid"
                >
                  <div style={styles.previewMiniCard} className="landing-reveal-up">
                    <div style={styles.previewMiniTop}>
                      <span style={styles.previewMiniTitle}>Docker Lab Online</span>
                      <span style={styles.livePill}>
                        <span style={styles.liveDot} />
                        Live
                      </span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: "88%" }} />
                    </div>
                    <div style={styles.previewMiniText}>
                      Containerized reconnaissance lab ready for launch.
                    </div>
                  </div>

                  <div style={styles.previewMiniCard} className="landing-reveal-up">
                    <div style={styles.previewMiniTop}>
                      <span style={styles.previewMiniTitle}>SOC Alert Reviewed</span>
                      <span style={styles.previewMiniValue}>94%</span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: "94%",
                          background:
                            "linear-gradient(90deg, rgba(45, 212, 191, 0.96), rgba(16, 185, 129, 0.96))",
                        }}
                      />
                    </div>
                    <div style={styles.previewMiniText}>
                      Analyst workflow and explanation pipeline synchronized.
                    </div>
                  </div>

                  <div style={styles.previewMiniCard} className="landing-reveal-up">
                    <div style={styles.previewMiniTop}>
                      <span style={styles.previewMiniTitle}>Incident Step Progress</span>
                      <span style={styles.previewMiniValue}>3 / 5</span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: "60%",
                          background:
                            "linear-gradient(90deg, rgba(103, 232, 249, 0.96), rgba(59, 130, 246, 0.96))",
                        }}
                      />
                    </div>
                    <div style={styles.previewMiniText}>
                      Guided incident workflow ready for triage and containment.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            style={{ ...styles.tickerSection, animationDelay: "0.42s" }}
            className="landing-reveal-up"
          >
            <div style={styles.tickerShell}>
              <div className="landing-ticker-track">
                {repeatedTickerItems.map((item, index) => (
                  <div key={`${item}-${index}`} className="landing-ticker-item">
                    <span className="landing-ticker-dot" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={styles.section}>
            <div
              style={{ ...styles.sectionHeader, animationDelay: "0.5s" }}
              className="landing-reveal-up"
            >
              <div style={styles.sectionEyebrow}>Core Modules</div>
              <h2 style={styles.sectionTitle}>Explore the hands-on training environment</h2>
              <p style={styles.sectionText}>
                Every module below is interactive inside the protected platform.
                Sign in to access the full training experience.
              </p>
            </div>

            <div className="landing-module-grid">
              {modules.map((module, index) => (
                <Link
                  key={module.title}
                  to="/login"
                  style={{
                    ...styles.moduleCard,
                    animationDelay: `${0.56 + index * 0.08}s`,
                  }}
                  className="landing-module-card landing-reveal-up"
                >
                  <div style={styles.moduleTop}>
                    <span style={styles.moduleBadge}>{module.badge}</span>
                    <span style={styles.moduleHelper}>{module.helperText}</span>
                  </div>
                  <h3 style={styles.moduleTitle}>{module.title}</h3>
                  <p style={styles.moduleText}>{module.description}</p>
                  <div style={styles.moduleFooter}>
                    <span style={styles.moduleFooterText}>Open after sign in</span>
                    <span style={styles.moduleArrow} className="landing-card-arrow">
                      -&gt;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <div
              style={{ ...styles.sectionHeader, animationDelay: "0.72s" }}
              className="landing-reveal-up"
            >
              <div style={styles.sectionEyebrow}>How It Works</div>
              <h2 style={styles.sectionTitle}>A clean training flow from lesson to performance tracking</h2>
            </div>

            <div className="landing-workflow-grid">
              {workflowSteps.map((item, index) => (
                <div
                  key={item.step}
                  style={{
                    ...styles.stepCard,
                    animationDelay: `${0.78 + index * 0.08}s`,
                  }}
                  className="landing-step-card landing-reveal-up"
                >
                  <div style={styles.stepNumber}>{item.step}</div>
                  <h3 style={styles.stepTitle}>{item.title}</h3>
                  <p style={styles.stepText}>{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.section}>
            <div
              style={{ ...styles.sectionHeader, animationDelay: "0.92s" }}
              className="landing-reveal-up"
            >
              <div style={styles.sectionEyebrow}>Built For Real Training</div>
              <h2 style={styles.sectionTitle}>Designed as a real cybersecurity training product</h2>
            </div>

            <div className="landing-feature-grid">
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  style={{
                    ...styles.featureCard,
                    animationDelay: `${0.98 + index * 0.08}s`,
                  }}
                  className="landing-feature-card landing-reveal-up"
                >
                  <div style={styles.featureAccent} />
                  <h3 style={styles.featureTitle}>{feature.title}</h3>
                  <p style={styles.featureText}>{feature.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section style={styles.ctaSection}>
            <div
              style={{ ...styles.ctaCard, animationDelay: "1.14s" }}
              className="landing-cta-card landing-reveal-up"
            >
              <div>
                <div style={styles.sectionEyebrow}>Final Call To Action</div>
                <h2 style={styles.ctaTitle}>Ready to start training?</h2>
                <p style={styles.ctaText}>
                  Create an account to enter the platform, launch hands-on
                  modules, and experience the full cybersecurity training flow.
                </p>
              </div>

              <div style={styles.ctaButtonRow}>
                <Link
                  to="/register"
                  style={styles.ctaPrimaryButton}
                  className="landing-button landing-cta-primary"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  style={styles.ctaSecondaryButton}
                  className="landing-button landing-cta-secondary"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    position: "relative",
    background:
      "linear-gradient(180deg, #020617 0%, #061120 34%, #091528 68%, #020617 100%)",
    color: "#ffffff",
    overflow: "hidden",
  },
  backgroundLayer: {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  gridOverlay: {
    position: "absolute",
    inset: 0,
    backgroundImage:
      "linear-gradient(rgba(56, 189, 248, 0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(56, 189, 248, 0.045) 1px, transparent 1px)",
    backgroundSize: "58px 58px",
    maskImage:
      "linear-gradient(to bottom, rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.18) 46%, transparent 96%)",
  },
  orbOne: {
    position: "absolute",
    top: "-80px",
    left: "-30px",
    width: "360px",
    height: "360px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, rgba(34, 211, 238, 0.18) 0%, rgba(6, 182, 212, 0.08) 48%, transparent 74%)",
    filter: "blur(14px)",
    animation: "floatOrb 11s ease-in-out infinite",
  },
  orbTwo: {
    position: "absolute",
    top: "120px",
    right: "-80px",
    width: "320px",
    height: "320px",
    borderRadius: "999px",
    background:
      "radial-gradient(circle, rgba(45, 212, 191, 0.16) 0%, rgba(20, 184, 166, 0.07) 48%, transparent 72%)",
    filter: "blur(16px)",
    animation: "pulseGlow 10s ease-in-out infinite",
  },
  orbThree: {
    position: "absolute",
    bottom: "120px",
    left: "18%",
    width: "14px",
    height: "14px",
    borderRadius: "999px",
    background: "#22d3ee",
    boxShadow: "0 0 18px rgba(34, 211, 238, 0.5)",
    animation: "floatOrb 7s ease-in-out infinite",
  },
  shell: {
    position: "relative",
    zIndex: 1,
    padding: "18px 20px 80px",
  },
  navbar: {
    position: "sticky",
    top: "14px",
    zIndex: 30,
    maxWidth: "1260px",
    margin: "0 auto 26px",
    padding: "14px 18px",
    borderRadius: "22px",
    background: "rgba(4, 10, 22, 0.68)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    WebkitBackdropFilter: "blur(16px)",
    backdropFilter: "blur(16px)",
    boxShadow: "0 20px 42px rgba(2, 8, 23, 0.24)",
  },
  navbarInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "18px",
    flexWrap: "wrap",
  },
  brandWrap: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textDecoration: "none",
    minWidth: 0,
  },
  brandMark: {
    width: "46px",
    height: "46px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(45, 212, 191, 0.18))",
    border: "1px solid rgba(34, 211, 238, 0.24)",
    color: "#f0fdff",
    fontWeight: "800",
    fontSize: "1rem",
    boxShadow: "0 10px 26px rgba(6, 182, 212, 0.16)",
    flexShrink: 0,
  },
  brandTitle: {
    color: "#ffffff",
    fontSize: "1rem",
    fontWeight: "800",
    lineHeight: "1.15",
  },
  brandSubtitle: {
    color: "#98abc4",
    fontSize: "0.85rem",
    lineHeight: "1.45",
    marginTop: "3px",
  },
  navActions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  topNavLink: {
    textDecoration: "none",
    color: "#e2e8f0",
    fontWeight: "700",
    padding: "11px 16px",
    borderRadius: "13px",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    background: "rgba(8, 16, 32, 0.78)",
  },
  topNavButton: {
    textDecoration: "none",
    color: "#ffffff",
    fontWeight: "700",
    padding: "11px 18px",
    borderRadius: "13px",
    background:
      "linear-gradient(135deg, rgba(6, 182, 212, 0.96), rgba(37, 99, 235, 0.96))",
    boxShadow: "0 18px 30px rgba(6, 182, 212, 0.18)",
  },
  container: {
    maxWidth: "1260px",
    margin: "0 auto",
  },
  heroSection: {
    paddingTop: "10px",
  },
  heroCard: {
    minHeight: "540px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    borderRadius: "32px",
    padding: "38px 38px 34px",
    background:
      "linear-gradient(180deg, rgba(8, 16, 34, 0.82), rgba(7, 13, 27, 0.72))",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 30px 60px rgba(2, 8, 23, 0.34)",
    WebkitBackdropFilter: "blur(12px)",
    backdropFilter: "blur(12px)",
  },
  heroBadge: {
    display: "inline-flex",
    alignItems: "center",
    alignSelf: "flex-start",
    padding: "9px 14px",
    borderRadius: "999px",
    background: "rgba(10, 19, 38, 0.92)",
    border: "1px solid rgba(45, 212, 191, 0.18)",
    color: "#c9fff6",
    fontSize: "0.82rem",
    fontWeight: "700",
    letterSpacing: "0.02em",
    marginBottom: "22px",
  },
  heroTitle: {
    margin: 0,
    maxWidth: "720px",
    color: "#ffffff",
    fontSize: "clamp(3.15rem, 5.3vw, 5.5rem)",
    lineHeight: "0.95",
    letterSpacing: "-0.045em",
  },
  heroTitleAccent: {
    background:
      "linear-gradient(135deg, rgba(125, 251, 255, 1), rgba(45, 212, 191, 0.96), rgba(96, 165, 250, 0.94))",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  heroSubtitle: {
    margin: "22px 0 0",
    maxWidth: "700px",
    color: "#b9c9dd",
    fontSize: "1.08rem",
    lineHeight: "1.82",
  },
  heroButtonRow: {
    display: "flex",
    gap: "14px",
    flexWrap: "wrap",
    marginTop: "28px",
  },
  primaryButton: {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "156px",
    padding: "14px 22px",
    borderRadius: "15px",
    color: "#ffffff",
    fontWeight: "800",
    background:
      "linear-gradient(135deg, rgba(6, 182, 212, 0.96), rgba(37, 99, 235, 0.96))",
    boxShadow: "0 18px 32px rgba(6, 182, 212, 0.18)",
  },
  secondaryButton: {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "132px",
    padding: "14px 20px",
    borderRadius: "15px",
    color: "#e2e8f0",
    fontWeight: "800",
    background: "rgba(8, 16, 32, 0.84)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
  },
  trustRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "28px",
  },
  trustChip: {
    display: "inline-flex",
    alignItems: "center",
    padding: "9px 12px",
    borderRadius: "999px",
    background: "rgba(7, 15, 30, 0.88)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    color: "#d7e4f4",
    fontSize: "0.82rem",
    fontWeight: "700",
    textDecoration: "none",
    cursor: "pointer",
  },
  previewCard: {
    position: "relative",
    overflow: "hidden",
    minHeight: "540px",
    borderRadius: "32px",
    padding: "26px",
    background:
      "linear-gradient(180deg, rgba(7, 14, 29, 0.92), rgba(5, 10, 22, 0.82))",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 30px 60px rgba(2, 8, 23, 0.34)",
    WebkitBackdropFilter: "blur(12px)",
    backdropFilter: "blur(12px)",
  },
  previewHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    marginBottom: "18px",
  },
  previewDots: {
    display: "flex",
    gap: "8px",
  },
  dotRed: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#fb7185",
  },
  dotAmber: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#f59e0b",
  },
  dotGreen: {
    width: "10px",
    height: "10px",
    borderRadius: "999px",
    background: "#22c55e",
  },
  previewHeaderText: {
    color: "#8ea2bc",
    fontSize: "0.82rem",
    fontWeight: "700",
  },
  terminalPanel: {
    position: "relative",
    overflow: "hidden",
    borderRadius: "24px",
    padding: "20px",
    background:
      "linear-gradient(180deg, rgba(2, 8, 23, 0.96), rgba(5, 12, 24, 0.9))",
    border: "1px solid rgba(34, 211, 238, 0.12)",
    marginBottom: "18px",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
  },
  scanLine: {
    position: "absolute",
    top: "38px",
    left: 0,
    width: "30%",
    height: "1px",
    background:
      "linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.84), transparent)",
    animation: "scanMove 7s linear infinite",
  },
  terminalTitle: {
    color: "#c8fff6",
    fontSize: "0.92rem",
    fontWeight: "800",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "14px",
  },
  logStack: {
    display: "grid",
    gap: "10px",
  },
  logLine: {
    color: "#9aece2",
    fontSize: "0.86rem",
    lineHeight: "1.62",
    fontFamily: "Consolas, monospace",
  },
  previewStatusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "14px",
  },
  previewMiniCard: {
    borderRadius: "20px",
    padding: "16px",
    background: "rgba(7, 13, 27, 0.82)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    minHeight: "154px",
  },
  previewMiniTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "12px",
  },
  previewMiniTitle: {
    color: "#f8fafc",
    fontSize: "0.88rem",
    fontWeight: "700",
    lineHeight: "1.4",
  },
  previewMiniValue: {
    color: "#67e8f9",
    fontSize: "0.84rem",
    fontWeight: "800",
    whiteSpace: "nowrap",
  },
  livePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    padding: "5px 8px",
    borderRadius: "999px",
    background: "rgba(34, 197, 94, 0.12)",
    color: "#bbf7d0",
    fontSize: "0.68rem",
    fontWeight: "800",
    letterSpacing: "0.04em",
    whiteSpace: "nowrap",
  },
  liveDot: {
    width: "8px",
    height: "8px",
    borderRadius: "999px",
    background: "#4ade80",
    boxShadow: "0 0 12px rgba(74, 222, 128, 0.5)",
    animation: "pulseGlow 2.4s ease-in-out infinite",
    flexShrink: 0,
  },
  progressTrack: {
    width: "100%",
    height: "8px",
    borderRadius: "999px",
    background: "rgba(30, 41, 59, 0.88)",
    overflow: "hidden",
    marginBottom: "12px",
  },
  progressFill: {
    height: "100%",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, rgba(34, 211, 238, 0.96), rgba(59, 130, 246, 0.96))",
  },
  previewMiniText: {
    color: "#90a4be",
    fontSize: "0.8rem",
    lineHeight: "1.66",
  },
  tickerSection: {
    marginTop: "26px",
  },
  tickerShell: {
    overflow: "hidden",
    borderRadius: "18px",
    padding: "14px 18px",
    background: "rgba(6, 12, 24, 0.72)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 18px 36px rgba(2, 8, 23, 0.2)",
    WebkitBackdropFilter: "blur(12px)",
    backdropFilter: "blur(12px)",
  },
  section: {
    paddingTop: "40px",
  },
  sectionHeader: {
    maxWidth: "760px",
    marginBottom: "22px",
  },
  sectionEyebrow: {
    display: "inline-flex",
    alignItems: "center",
    padding: "7px 12px",
    borderRadius: "999px",
    background: "rgba(8, 16, 32, 0.84)",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    color: "#9cfaf0",
    fontSize: "0.78rem",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "12px",
  },
  sectionTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "clamp(1.95rem, 3vw, 2.7rem)",
    lineHeight: "1.1",
  },
  sectionText: {
    margin: "12px 0 0",
    color: "#98abc4",
    fontSize: "1rem",
    lineHeight: "1.76",
  },
  moduleCard: {
    textDecoration: "none",
    display: "flex",
    flexDirection: "column",
    minHeight: "212px",
    borderRadius: "24px",
    padding: "22px",
    background:
      "linear-gradient(180deg, rgba(8, 16, 32, 0.84), rgba(6, 12, 24, 0.74))",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 20px 40px rgba(2, 8, 23, 0.28)",
    WebkitBackdropFilter: "blur(10px)",
    backdropFilter: "blur(10px)",
    cursor: "pointer",
  },
  moduleTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    marginBottom: "16px",
  },
  moduleBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "70px",
    padding: "8px 12px",
    borderRadius: "999px",
    background:
      "linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(45, 212, 191, 0.14))",
    border: "1px solid rgba(34, 211, 238, 0.16)",
    color: "#cbfff8",
    fontSize: "0.72rem",
    fontWeight: "800",
    letterSpacing: "0.05em",
  },
  moduleHelper: {
    color: "#88a0bb",
    fontSize: "0.74rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  moduleTitle: {
    margin: "0 0 12px",
    color: "#ffffff",
    fontSize: "1.22rem",
    lineHeight: "1.3",
  },
  moduleText: {
    margin: 0,
    color: "#c0d0e5",
    lineHeight: "1.7",
    fontSize: "0.96rem",
  },
  moduleFooter: {
    marginTop: "auto",
    paddingTop: "18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    borderTop: "1px solid rgba(148, 163, 184, 0.1)",
    color: "#9cfaf0",
  },
  moduleFooterText: {
    fontSize: "0.9rem",
    fontWeight: "700",
  },
  moduleArrow: {
    fontSize: "1rem",
    fontWeight: "800",
  },
  stepCard: {
    borderRadius: "22px",
    padding: "20px",
    background:
      "linear-gradient(180deg, rgba(8, 16, 32, 0.84), rgba(6, 12, 24, 0.74))",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 18px 34px rgba(2, 8, 23, 0.24)",
  },
  stepNumber: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "42px",
    height: "42px",
    borderRadius: "14px",
    marginBottom: "14px",
    background:
      "linear-gradient(135deg, rgba(6, 182, 212, 0.18), rgba(45, 212, 191, 0.16))",
    border: "1px solid rgba(34, 211, 238, 0.16)",
    color: "#cbfff8",
    fontSize: "0.92rem",
    fontWeight: "800",
  },
  stepTitle: {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "1.05rem",
  },
  stepText: {
    margin: 0,
    color: "#b8c8dc",
    fontSize: "0.95rem",
    lineHeight: "1.68",
  },
  featureCard: {
    borderRadius: "22px",
    padding: "22px",
    background:
      "linear-gradient(180deg, rgba(8, 16, 32, 0.84), rgba(6, 12, 24, 0.74))",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 18px 34px rgba(2, 8, 23, 0.24)",
  },
  featureAccent: {
    width: "44px",
    height: "4px",
    borderRadius: "999px",
    marginBottom: "16px",
    background:
      "linear-gradient(90deg, rgba(34, 211, 238, 0.96), rgba(45, 212, 191, 0.96))",
  },
  featureTitle: {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "1.04rem",
  },
  featureText: {
    margin: 0,
    color: "#b7c7dc",
    lineHeight: "1.72",
    fontSize: "0.95rem",
  },
  ctaSection: {
    paddingTop: "40px",
  },
  ctaCard: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "22px",
    flexWrap: "wrap",
    borderRadius: "30px",
    padding: "30px 32px",
    background:
      "linear-gradient(135deg, rgba(8, 16, 32, 0.92), rgba(6, 12, 24, 0.8))",
    border: "1px solid rgba(148, 163, 184, 0.14)",
    boxShadow: "0 22px 46px rgba(2, 8, 23, 0.3)",
    WebkitBackdropFilter: "blur(12px)",
    backdropFilter: "blur(12px)",
  },
  ctaTitle: {
    margin: "0 0 10px",
    color: "#ffffff",
    fontSize: "clamp(1.95rem, 3vw, 2.5rem)",
    lineHeight: "1.1",
  },
  ctaText: {
    margin: 0,
    maxWidth: "680px",
    color: "#b7c7dc",
    lineHeight: "1.76",
  },
  ctaButtonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  ctaPrimaryButton: {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "158px",
    padding: "14px 22px",
    borderRadius: "15px",
    color: "#ffffff",
    fontWeight: "800",
    background:
      "linear-gradient(135deg, rgba(6, 182, 212, 0.96), rgba(37, 99, 235, 0.96))",
    boxShadow: "0 18px 32px rgba(6, 182, 212, 0.18)",
  },
  ctaSecondaryButton: {
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: "132px",
    padding: "14px 20px",
    borderRadius: "15px",
    color: "#e2e8f0",
    fontWeight: "800",
    background: "rgba(8, 16, 32, 0.84)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
  },
};

export default LandingPage;
