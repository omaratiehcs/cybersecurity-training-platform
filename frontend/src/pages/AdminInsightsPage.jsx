import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { authFetch } from "../utils/authFetch";

const API_URL = "http://localhost:5000/api/admin/insights";
const MODULE_COLORS = {
  CTF: "#38bdf8",
  SOC: "#22c55e",
  Incident: "#f59e0b",
};

const formatDateTime = (value) => {
  if (!value) {
    return "No activity yet";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatDateOnly = (value) => {
  if (!value) {
    return "No activity yet";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const formatCount = (value) => Number(value) || 0;

const renderInsightName = (item, fallback = "No activity yet") => {
  if (!item) {
    return fallback;
  }

  return (
    item.title ||
    item.incident_title ||
    item.step_title ||
    item.full_name ||
    fallback
  );
};

const renderInsightCount = (item, key, suffix = "") => {
  if (!item) {
    return "0";
  }

  const count = formatCount(item[key]);
  return suffix ? `${count} ${suffix}` : `${count}`;
};

const getWidthPercentage = (value, maxValue) => {
  if (!maxValue || maxValue <= 0) {
    return "0%";
  }

  return `${Math.max((value / maxValue) * 100, 8)}%`;
};

const getRingPercentage = (value, total) => {
  if (!total || total <= 0) {
    return 0;
  }

  return Math.max((value / total) * 100, 0);
};

const buildTrendFromRecentActivity = (recentActivity = []) => {
  if (!Array.isArray(recentActivity) || recentActivity.length === 0) {
    return [];
  }

  const groupedDays = new Map();

  recentActivity.forEach((item) => {
    const dateKey = item?.submitted_at ? item.submitted_at.slice(0, 10) : "Unknown";
    const existingDay = groupedDays.get(dateKey) || {
      activity_date: dateKey,
      ctf_attempts: 0,
      soc_attempts: 0,
      incident_attempts: 0,
      total_attempts: 0,
    };

    if (item.module === "CTF") {
      existingDay.ctf_attempts += 1;
    } else if (item.module === "SOC") {
      existingDay.soc_attempts += 1;
    } else {
      existingDay.incident_attempts += 1;
    }

    existingDay.total_attempts += 1;
    groupedDays.set(dateKey, existingDay);
  });

  return Array.from(groupedDays.values())
    .sort((firstItem, secondItem) =>
      String(firstItem.activity_date).localeCompare(String(secondItem.activity_date))
    )
    .slice(-7);
};

function AdminInsightsPage() {
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadInsights = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      const response = await authFetch(API_URL, {}, navigate);

      if (!response) {
        return;
      }

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to load admin insights.");
      }

      setInsights(data.data || null);
    } catch (err) {
      setError(err.message || "Failed to load admin insights.");
    } finally {
      if (showLoader) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadInsights();

    const handleWindowFocus = () => {
      loadInsights(false);
    };

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [navigate]);

  const overview = insights?.overview || {};
  const ctfInsights = insights?.ctfInsights || {};
  const socInsights = insights?.socInsights || {};
  const incidentInsights = insights?.incidentInsights || {};
  const completionInsights = insights?.completionInsights || {};
  const activityInsights = insights?.activityInsights || {};
  const topTrainingItems = insights?.topTrainingItems || {};
  const recentActivity = Array.isArray(activityInsights.recentActivity)
    ? activityInsights.recentActivity
    : [];

  const overviewCards = [
    { label: "Total Users", value: overview.totalUsers },
    { label: "CTF Challenges", value: overview.totalChallenges },
    { label: "SOC Cases", value: overview.totalSocCases },
    { label: "Incident Scenarios", value: overview.totalIncidents },
    { label: "CTF Submissions", value: overview.totalCtfSubmissions },
    { label: "SOC Submissions", value: overview.totalSocSubmissions },
    {
      label: "Incident Step Submissions",
      value: overview.totalIncidentStepSubmissions,
    },
    { label: "Correct Attempts", value: overview.totalCorrectSubmissions },
    { label: "Wrong Attempts", value: overview.totalWrongSubmissions },
  ];

  const topInsightCards = [
    {
      title: "Most Solved Challenge",
      name: renderInsightName(ctfInsights.mostSolvedChallenge),
      detail: renderInsightCount(
        ctfInsights.mostSolvedChallenge,
        "solved_count",
        "solves"
      ),
    },
    {
      title: "Most Failed Challenge",
      name: renderInsightName(ctfInsights.mostFailedChallenge),
      detail: renderInsightCount(
        ctfInsights.mostFailedChallenge,
        "wrong_attempts",
        "wrong attempts"
      ),
    },
    {
      title: "Most Attempted Challenge",
      name: renderInsightName(ctfInsights.mostAttemptedChallenge),
      detail: renderInsightCount(
        ctfInsights.mostAttemptedChallenge,
        "total_attempts",
        "attempts"
      ),
    },
    {
      title: "Most Active User",
      name: activityInsights.mostActiveUser
        ? activityInsights.mostActiveUser.full_name
        : "No activity yet",
      detail: activityInsights.mostActiveUser
        ? `${formatCount(activityInsights.mostActiveUser.total_attempts)} attempts`
        : "0 attempts",
    },
    {
      title: "Most Active Day",
      name: activityInsights.mostActiveDay
        ? formatDateOnly(activityInsights.mostActiveDay.activity_date)
        : "No activity yet",
      detail: activityInsights.mostActiveDay
        ? `${formatCount(activityInsights.mostActiveDay.total_attempts)} attempts`
        : "0 attempts",
    },
  ];

  const moduleSections = [
    {
      title: "CTF Challenge Insights",
      items: [
        {
          label: "Most Solved",
          name: renderInsightName(ctfInsights.mostSolvedChallenge),
          detail: renderInsightCount(
            ctfInsights.mostSolvedChallenge,
            "solved_count",
            "solves"
          ),
        },
        {
          label: "Most Failed",
          name: renderInsightName(ctfInsights.mostFailedChallenge),
          detail: renderInsightCount(
            ctfInsights.mostFailedChallenge,
            "wrong_attempts",
            "wrong attempts"
          ),
        },
        {
          label: "Most Attempted",
          name: renderInsightName(ctfInsights.mostAttemptedChallenge),
          detail: renderInsightCount(
            ctfInsights.mostAttemptedChallenge,
            "total_attempts",
            "attempts"
          ),
        },
      ],
    },
    {
      title: "SOC Case Insights",
      items: [
        {
          label: "Most Solved",
          name: renderInsightName(socInsights.mostSolvedSocCase),
          detail: renderInsightCount(
            socInsights.mostSolvedSocCase,
            "solved_count",
            "solves"
          ),
        },
        {
          label: "Most Failed",
          name: renderInsightName(socInsights.mostFailedSocCase),
          detail: renderInsightCount(
            socInsights.mostFailedSocCase,
            "wrong_attempts",
            "wrong attempts"
          ),
        },
        {
          label: "Most Attempted",
          name: renderInsightName(socInsights.mostAttemptedSocCase),
          detail: renderInsightCount(
            socInsights.mostAttemptedSocCase,
            "total_attempts",
            "attempts"
          ),
        },
      ],
    },
    {
      title: "Incident Response Insights",
      items: [
        {
          label: "Most Solved Incident",
          name: renderInsightName(incidentInsights.mostSolvedIncident),
          detail: renderInsightCount(
            incidentInsights.mostSolvedIncident,
            "completed_count",
            "completions"
          ),
        },
        {
          label: "Most Failed Step",
          name: incidentInsights.mostFailedIncidentStep
            ? `${incidentInsights.mostFailedIncidentStep.incident_title} - ${incidentInsights.mostFailedIncidentStep.step_title}`
            : "No activity yet",
          detail: renderInsightCount(
            incidentInsights.mostFailedIncidentStep,
            "wrong_attempts",
            "wrong attempts"
          ),
        },
        {
          label: "Most Attempted Incident",
          name: renderInsightName(incidentInsights.mostAttemptedIncident),
          detail: renderInsightCount(
            incidentInsights.mostAttemptedIncident,
            "total_step_attempts",
            "step attempts"
          ),
        },
      ],
    },
  ];

  const moduleActivityData = [
    {
      label: "CTF Submissions",
      value: formatCount(overview.totalCtfSubmissions),
      color: MODULE_COLORS.CTF,
      accent: "Flag-based attempts",
    },
    {
      label: "SOC Submissions",
      value: formatCount(overview.totalSocSubmissions),
      color: MODULE_COLORS.SOC,
      accent: "Log analysis answers",
    },
    {
      label: "Incident Step Submissions",
      value: formatCount(overview.totalIncidentStepSubmissions),
      color: MODULE_COLORS.Incident,
      accent: "Step-by-step investigations",
    },
  ];

  const completionData = [
    {
      label: "CTF",
      value: formatCount(completionInsights.totalCtfCompleted),
      color: MODULE_COLORS.CTF,
    },
    {
      label: "SOC",
      value: formatCount(completionInsights.totalSocCompleted),
      color: MODULE_COLORS.SOC,
    },
    {
      label: "Incident",
      value: formatCount(completionInsights.totalIncidentCompleted),
      color: MODULE_COLORS.Incident,
    },
  ];

  const trendData = useMemo(() => {
    if (Array.isArray(activityInsights.dailyActivity) && activityInsights.dailyActivity.length > 0) {
      return [...activityInsights.dailyActivity]
        .map((item) => ({
          activity_date: item.activity_date,
          ctf_attempts: formatCount(item.ctf_attempts),
          soc_attempts: formatCount(item.soc_attempts),
          incident_attempts: formatCount(item.incident_attempts),
          total_attempts: formatCount(item.total_attempts),
        }))
        .sort((firstItem, secondItem) =>
          String(firstItem.activity_date).localeCompare(String(secondItem.activity_date))
        );
    }

    return buildTrendFromRecentActivity(recentActivity);
  }, [activityInsights.dailyActivity, recentActivity]);

  const topTrainingSections = [
    {
      title: "Top CTF Challenges",
      items: Array.isArray(topTrainingItems.ctfTopChallenges)
        ? topTrainingItems.ctfTopChallenges
        : [],
      color: MODULE_COLORS.CTF,
      emptyText: "No CTF activity yet.",
    },
    {
      title: "Top SOC Cases",
      items: Array.isArray(topTrainingItems.socTopCases)
        ? topTrainingItems.socTopCases
        : [],
      color: MODULE_COLORS.SOC,
      emptyText: "No SOC activity yet.",
    },
    {
      title: "Top Incident Scenarios",
      items: Array.isArray(topTrainingItems.incidentTopItems)
        ? topTrainingItems.incidentTopItems
        : [],
      color: MODULE_COLORS.Incident,
      emptyText: "No incident activity yet.",
    },
  ];

  const maxModuleActivity = Math.max(
    ...moduleActivityData.map((item) => item.value),
    0
  );
  const totalCompletions = completionData.reduce(
    (total, item) => total + item.value,
    0
  );
  const maxTrendCount = Math.max(
    ...trendData.map((item) => formatCount(item.total_attempts)),
    0
  );

  return (
    <Layout>
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.headerRow}>
            <div>
              <p style={styles.eyebrow}>Admin Analytics</p>
              <h1 style={styles.title}>Admin Insights</h1>
              <p style={styles.subtitle}>
                Platform activity and training performance overview
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadInsights(false)}
              disabled={refreshing}
              style={styles.refreshButton}
            >
              {refreshing ? "Refreshing..." : "Refresh Insights"}
            </button>
          </div>

          {loading && !insights ? (
            <div style={styles.infoCard}>Loading admin insights...</div>
          ) : !insights && error ? (
            <div style={styles.errorBox}>{error}</div>
          ) : (
            <>
              {error && <div style={styles.errorBox}>{error}</div>}

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Overview</h2>
                  </div>
                </div>

                <div style={styles.overviewGrid}>
                  {overviewCards.map((card) => (
                    <div key={card.label} style={styles.metricCard}>
                      <span style={styles.metricLabel}>{card.label}</span>
                      <span style={styles.metricValue}>
                        {formatCount(card.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Activity Visuals</h2>
                <div style={styles.chartGrid}>
                  <div style={styles.chartCard}>
                    <div style={styles.chartHeader}>
                      <div>
                        <h3 style={styles.chartTitle}>Module Activity Overview</h3>
                        <p style={styles.chartSubtitle}>
                          Submission volume across the three training modules
                        </p>
                      </div>
                    </div>

                    {maxModuleActivity === 0 ? (
                      <div style={styles.emptyState}>
                        No submission activity is available yet.
                      </div>
                    ) : (
                      <div style={styles.barChartStack}>
                        {moduleActivityData.map((item) => (
                          <div key={item.label} style={styles.barChartRow}>
                            <div style={styles.barChartTopRow}>
                              <span style={styles.barChartLabel}>{item.label}</span>
                              <span style={styles.barChartValue}>
                                {formatCount(item.value)}
                              </span>
                            </div>
                            <div style={styles.barTrack}>
                              <div
                                style={{
                                  ...styles.barFill,
                                  width: getWidthPercentage(
                                    formatCount(item.value),
                                    maxModuleActivity
                                  ),
                                  background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)`,
                                  boxShadow: `0 10px 22px ${item.color}33`,
                                }}
                              />
                            </div>
                            <span style={styles.barChartHint}>{item.accent}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={styles.chartCard}>
                    <div style={styles.chartHeader}>
                      <div>
                        <h3 style={styles.chartTitle}>Completion Overview</h3>
                        <p style={styles.chartSubtitle}>
                          Solved or completed training outcomes by module
                        </p>
                      </div>
                    </div>

                    {completionData.every((item) => item.value === 0) ? (
                      <div style={styles.emptyState}>
                        No completed training data is available yet.
                      </div>
                    ) : (
                      <div style={styles.completionGrid}>
                        {completionData.map((item) => {
                          const ringPercentage = getRingPercentage(
                            item.value,
                            totalCompletions
                          );

                          return (
                            <div key={item.label} style={styles.completionCard}>
                              <div
                                style={{
                                  ...styles.completionRing,
                                  background: `conic-gradient(${item.color} ${ringPercentage}%, rgba(51, 65, 85, 0.72) ${ringPercentage}% 100%)`,
                                }}
                              >
                                <div style={styles.completionRingInner}>
                                  <span style={styles.completionCount}>
                                    {item.value}
                                  </span>
                                  <span style={styles.completionUnit}>done</span>
                                </div>
                              </div>
                              <span style={styles.completionLabel}>{item.label}</span>
                              <span style={styles.completionDetail}>
                                {Math.round(ringPercentage)}% of tracked completions
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section style={styles.section}>
                <div style={styles.chartCard}>
                  <div style={styles.chartHeader}>
                    <div>
                      <h3 style={styles.chartTitle}>Recent Activity Trend</h3>
                      <p style={styles.chartSubtitle}>
                        Daily activity snapshot using the latest available training
                        attempts
                      </p>
                    </div>

                    <div style={styles.legendRow}>
                      {Object.entries(MODULE_COLORS).map(([label, color]) => (
                        <div key={label} style={styles.legendItem}>
                          <span
                            style={{
                              ...styles.legendSwatch,
                              backgroundColor: color,
                            }}
                          />
                          <span style={styles.legendLabel}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {trendData.length === 0 ? (
                    <div style={styles.emptyState}>
                      Not enough activity exists yet to plot a recent trend.
                    </div>
                  ) : (
                    <div style={styles.trendGrid}>
                      {trendData.map((item, index) => {
                        const totalAttempts = formatCount(item.total_attempts);
                        const ctfAttempts = formatCount(item.ctf_attempts);
                        const socAttempts = formatCount(item.soc_attempts);
                        const incidentAttempts = formatCount(item.incident_attempts);
                        const trendHeight =
                          maxTrendCount > 0
                            ? Math.max((totalAttempts / maxTrendCount) * 100, 10)
                            : 0;

                        return (
                          <div
                            key={`${item.activity_date}-${index}`}
                            style={styles.trendColumn}
                          >
                            <div style={styles.trendBarFrame}>
                              <div
                                style={{
                                  ...styles.trendBarStack,
                                  height: `${trendHeight}%`,
                                }}
                              >
                                {ctfAttempts > 0 && (
                                  <div
                                    style={{
                                      ...styles.trendSegment,
                                      height: `${(ctfAttempts / totalAttempts) * 100}%`,
                                      backgroundColor: MODULE_COLORS.CTF,
                                    }}
                                  />
                                )}
                                {socAttempts > 0 && (
                                  <div
                                    style={{
                                      ...styles.trendSegment,
                                      height: `${(socAttempts / totalAttempts) * 100}%`,
                                      backgroundColor: MODULE_COLORS.SOC,
                                    }}
                                  />
                                )}
                                {incidentAttempts > 0 && (
                                  <div
                                    style={{
                                      ...styles.trendSegment,
                                      height: `${(incidentAttempts / totalAttempts) * 100}%`,
                                      backgroundColor: MODULE_COLORS.Incident,
                                    }}
                                  />
                                )}
                              </div>
                            </div>
                            <span style={styles.trendCount}>{totalAttempts}</span>
                            <span style={styles.trendLabel}>
                              {formatDateOnly(item.activity_date)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Top Training Items</h2>
                <div style={styles.topTrainingGrid}>
                  {topTrainingSections.map((section) => {
                    const maxAttempts = Math.max(
                      ...section.items.map((item) => formatCount(item.total_attempts)),
                      0
                    );

                    return (
                      <div key={section.title} style={styles.chartCard}>
                        <div style={styles.chartHeader}>
                          <div>
                            <h3 style={styles.chartTitle}>{section.title}</h3>
                            <p style={styles.chartSubtitle}>
                              Horizontal attempt volume comparison
                            </p>
                          </div>
                        </div>

                        {section.items.length === 0 ? (
                          <div style={styles.emptyState}>{section.emptyText}</div>
                        ) : (
                          <div style={styles.horizontalBarList}>
                            {section.items.map((item) => (
                              <div
                                key={`${section.title}-${item.item_id || item.title}`}
                                style={styles.horizontalBarItem}
                              >
                                <div style={styles.horizontalBarTopRow}>
                                  <span style={styles.horizontalBarName}>
                                    {item.title}
                                  </span>
                                  <span style={styles.horizontalBarValue}>
                                    {formatCount(item.total_attempts)}
                                  </span>
                                </div>
                                <div style={styles.barTrack}>
                                  <div
                                    style={{
                                      ...styles.barFill,
                                      width: getWidthPercentage(
                                        formatCount(item.total_attempts),
                                        maxAttempts
                                      ),
                                      background: `linear-gradient(90deg, ${section.color}, ${section.color}cc)`,
                                      boxShadow: `0 10px 22px ${section.color}33`,
                                    }}
                                  />
                                </div>
                                <span style={styles.horizontalBarHint}>
                                  {formatCount(item.successful_attempts)} successful
                                  attempts
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Top Insights</h2>
                <div style={styles.insightGrid}>
                  {topInsightCards.map((card) => (
                    <div key={card.title} style={styles.insightCard}>
                      <span style={styles.insightLabel}>{card.title}</span>
                      <h3 style={styles.insightName}>{card.name}</h3>
                      <p style={styles.insightDetail}>{card.detail}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.section}>
                <h2 style={styles.sectionTitle}>Module Insights</h2>
                <div style={styles.moduleGrid}>
                  {moduleSections.map((section) => (
                    <div key={section.title} style={styles.moduleCard}>
                      <h3 style={styles.moduleTitle}>{section.title}</h3>
                      <div style={styles.moduleItems}>
                        {section.items.map((item) => (
                          <div key={item.label} style={styles.moduleItem}>
                            <span style={styles.moduleLabel}>{item.label}</span>
                            <p style={styles.moduleName}>{item.name}</p>
                            <span style={styles.moduleDetail}>{item.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <div>
                    <h2 style={styles.sectionTitle}>Recent Activity</h2>
                    <p style={styles.sectionSubtitle}>
                      Latest 10 attempts across CTF, SOC, and Incident workflows
                    </p>
                  </div>
                </div>

                <div style={styles.tableCard}>
                  {recentActivity.length === 0 ? (
                    <div style={styles.infoCard}>No submission activity yet.</div>
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.tableHead}>Module</th>
                            <th style={styles.tableHead}>User</th>
                            <th style={styles.tableHead}>Item</th>
                            <th style={styles.tableHead}>Submitted Answer</th>
                            <th style={styles.tableHead}>Result</th>
                            <th style={styles.tableHead}>Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentActivity.map((item, index) => (
                            <tr key={`${item.module}-${item.submitted_at}-${index}`}>
                              <td style={styles.tableCell}>{item.module}</td>
                              <td style={styles.tableCell}>{item.user_name}</td>
                              <td style={styles.tableCell}>{item.item_title}</td>
                              <td style={styles.answerCell}>
                                {item.submitted_answer}
                              </td>
                              <td style={styles.tableCell}>
                                <span
                                  style={
                                    item.is_correct
                                      ? styles.resultSuccess
                                      : styles.resultError
                                  }
                                >
                                  {item.is_correct ? "Correct" : "Wrong"}
                                </span>
                              </td>
                              <td style={styles.tableCell}>
                                {formatDateTime(item.submitted_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    margin: "-20px",
    background:
      "linear-gradient(135deg, #020617 0%, #0f172a 45%, #111827 100%)",
    padding: "22px 20px 32px",
    paddingTop: "76px",
    color: "#e5e7eb",
  },
  container: {
    maxWidth: "1240px",
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "18px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },
  eyebrow: {
    margin: "0 0 8px",
    color: "#93c5fd",
    fontSize: "0.86rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  title: {
    margin: 0,
    color: "#ffffff",
    fontSize: "2.15rem",
  },
  subtitle: {
    margin: "8px 0 0",
    color: "#cbd5e1",
    fontSize: "0.98rem",
    lineHeight: "1.65",
  },
  section: {
    marginBottom: "24px",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "16px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },
  sectionTitle: {
    margin: "0 0 14px",
    color: "#ffffff",
    fontSize: "1.4rem",
  },
  sectionSubtitle: {
    margin: 0,
    color: "#94a3b8",
  },
  overviewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px",
  },
  metricCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: "0.92rem",
    fontWeight: "600",
  },
  metricValue: {
    color: "#ffffff",
    fontSize: "1.85rem",
    fontWeight: "800",
  },
  chartGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },
  chartCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "18px",
  },
  chartTitle: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.16rem",
  },
  chartSubtitle: {
    margin: "8px 0 0",
    color: "#94a3b8",
    lineHeight: "1.6",
    fontSize: "0.95rem",
  },
  emptyState: {
    background: "rgba(2, 6, 23, 0.54)",
    border: "1px dashed rgba(148, 163, 184, 0.16)",
    borderRadius: "16px",
    padding: "18px",
    color: "#94a3b8",
  },
  barChartStack: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  barChartRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  barChartTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
  },
  barChartLabel: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  barChartValue: {
    color: "#ffffff",
    fontWeight: "800",
  },
  barTrack: {
    height: "14px",
    borderRadius: "999px",
    background: "rgba(30, 41, 59, 0.9)",
    overflow: "hidden",
    border: "1px solid rgba(148, 163, 184, 0.08)",
  },
  barFill: {
    height: "100%",
    borderRadius: "999px",
    minWidth: "10px",
  },
  barChartHint: {
    color: "#94a3b8",
    fontSize: "0.88rem",
  },
  completionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: "16px",
  },
  completionCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    background: "rgba(2, 6, 23, 0.42)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "18px",
    padding: "18px 14px",
  },
  completionRing: {
    width: "118px",
    height: "118px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  completionRingInner: {
    width: "82px",
    height: "82px",
    borderRadius: "50%",
    background: "#0f172a",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    border: "1px solid rgba(148, 163, 184, 0.14)",
  },
  completionCount: {
    color: "#ffffff",
    fontSize: "1.35rem",
    fontWeight: "800",
    lineHeight: "1",
  },
  completionUnit: {
    color: "#94a3b8",
    fontSize: "0.76rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginTop: "4px",
  },
  completionLabel: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  completionDetail: {
    color: "#94a3b8",
    fontSize: "0.88rem",
    textAlign: "center",
    lineHeight: "1.5",
  },
  legendRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  legendItem: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  },
  legendSwatch: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
  },
  legendLabel: {
    color: "#cbd5e1",
    fontSize: "0.88rem",
  },
  trendGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: "16px",
    alignItems: "end",
  },
  trendColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  trendBarFrame: {
    width: "100%",
    minWidth: "72px",
    height: "180px",
    borderRadius: "18px",
    background: "rgba(2, 6, 23, 0.56)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    padding: "10px",
    display: "flex",
    alignItems: "flex-end",
  },
  trendBarStack: {
    width: "100%",
    borderRadius: "12px",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column-reverse",
    background: "rgba(15, 23, 42, 0.82)",
  },
  trendSegment: {
    width: "100%",
  },
  trendCount: {
    color: "#ffffff",
    fontWeight: "800",
  },
  trendLabel: {
    color: "#94a3b8",
    fontSize: "0.88rem",
    textAlign: "center",
  },
  topTrainingGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "18px",
  },
  horizontalBarList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  horizontalBarItem: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  horizontalBarTopRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },
  horizontalBarName: {
    color: "#e2e8f0",
    fontWeight: "700",
    lineHeight: "1.5",
    flex: 1,
  },
  horizontalBarValue: {
    color: "#ffffff",
    fontWeight: "800",
    flexShrink: 0,
  },
  horizontalBarHint: {
    color: "#94a3b8",
    fontSize: "0.88rem",
  },
  insightGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
  },
  insightCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "20px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    minHeight: "170px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: "12px",
  },
  insightLabel: {
    color: "#93c5fd",
    fontSize: "0.85rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  insightName: {
    margin: 0,
    color: "#ffffff",
    fontSize: "1.15rem",
    lineHeight: "1.45",
  },
  insightDetail: {
    margin: 0,
    color: "#cbd5e1",
    lineHeight: "1.6",
  },
  moduleGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "18px",
  },
  moduleCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
  },
  moduleTitle: {
    margin: "0 0 16px",
    color: "#ffffff",
    fontSize: "1.15rem",
  },
  moduleItems: {
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  moduleItem: {
    background: "rgba(2, 6, 23, 0.5)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "14px",
    padding: "14px",
  },
  moduleLabel: {
    color: "#93c5fd",
    fontSize: "0.82rem",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  moduleName: {
    margin: "8px 0",
    color: "#ffffff",
    lineHeight: "1.55",
    fontWeight: "600",
  },
  moduleDetail: {
    color: "#cbd5e1",
  },
  tableCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "20px",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
    overflow: "hidden",
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "860px",
  },
  tableHead: {
    textAlign: "left",
    padding: "14px 16px",
    color: "#93c5fd",
    background: "rgba(2, 6, 23, 0.6)",
    borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
    fontSize: "0.9rem",
    fontWeight: "700",
  },
  tableCell: {
    padding: "14px 16px",
    color: "#e2e8f0",
    borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
    verticalAlign: "top",
    lineHeight: "1.5",
  },
  answerCell: {
    padding: "14px 16px",
    color: "#dbeafe",
    borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
    verticalAlign: "top",
    lineHeight: "1.5",
    fontFamily: "Consolas, Monaco, monospace",
    fontSize: "0.9rem",
    wordBreak: "break-word",
  },
  resultSuccess: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(34, 197, 94, 0.14)",
    border: "1px solid rgba(34, 197, 94, 0.28)",
    color: "#bbf7d0",
    fontWeight: "700",
    fontSize: "0.85rem",
  },
  resultError: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(239, 68, 68, 0.14)",
    border: "1px solid rgba(239, 68, 68, 0.28)",
    color: "#fecaca",
    fontWeight: "700",
    fontSize: "0.85rem",
  },
  infoCard: {
    background: "rgba(15, 23, 42, 0.86)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "18px",
    padding: "18px 20px",
    color: "#cbd5e1",
    boxShadow: "0 16px 36px rgba(2, 6, 23, 0.28)",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    color: "#fecaca",
    padding: "12px 14px",
    borderRadius: "10px",
    marginBottom: "16px",
  },
  refreshButton: {
    background: "rgba(59, 130, 246, 0.18)",
    color: "#bfdbfe",
    border: "1px solid rgba(59, 130, 246, 0.34)",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: "600",
  },
};

export default AdminInsightsPage;
