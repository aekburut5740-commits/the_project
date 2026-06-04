"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";

// ─── Mock data (all zeros — replace with real API data later) ───────────────

const statsCards = [
  {
    label: "Overall Progress",
    value: "0%",
    sub: "0 of 0 tasks",
    icon: "◎",
    color: "#4f8ef7",
  },
  {
    label: "Milestones",
    value: "0/0",
    sub: "0 completed",
    icon: "⚑",
    color: "#a78bfa",
  },
  {
    label: "In Review",
    value: "0",
    sub: "0 PRs pending",
    icon: "⏳",
    color: "#34d399",
  },
  {
    label: "Open Issues",
    value: "0",
    sub: "0 critical",
    icon: "⚠",
    color: "#f87171",
  },
  {
    label: "Days to Next Milestone",
    value: "0",
    sub: "No milestone set",
    icon: "📅",
    color: "#fbbf24",
  },
];

const projectHealth = [
  { name: "On Track", value: 0, color: "#34d399" },
  { name: "At Risk", value: 0, color: "#fbbf24" },
  { name: "Behind", value: 0, color: "#f87171" },
  { name: "Idle", value: 100, color: "#374151" },
];

const tasksOverview = [
  { name: "Done", value: 0, color: "#34d399" },
  { name: "In Progress", value: 0, color: "#4f8ef7" },
  { name: "To Do", value: 0, color: "#a78bfa" },
  { name: "Blocked", value: 0, color: "#f87171" },
  { name: "Empty", value: 100, color: "#1f2937" },
];

const progressOverTime = [
  { week: "W1", progress: 0 },
  { week: "W2", progress: 0 },
  { week: "W3", progress: 0 },
  { week: "W4", progress: 0 },
  { week: "W5", progress: 0 },
  { week: "W6", progress: 0 },
];

const gitPulseData = [
  { day: "Mon", commits: 0 },
  { day: "Tue", commits: 0 },
  { day: "Wed", commits: 0 },
  { day: "Thu", commits: 0 },
  { day: "Fri", commits: 0 },
  { day: "Sat", commits: 0 },
  { day: "Sun", commits: 0 },
];

const recentMilestones: { title: string; date: string; status: string }[] = [];
const activityFeed: { user: string; action: string; time: string }[] = [];
const upcomingMilestones: { title: string; due: string; progress: number }[] =
  [];
const latestNotifications: { message: string; time: string; type: string }[] =
  [];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  sub,
  icon,
  color,
}: (typeof statsCards)[0]) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 12,
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        overflow: "hidden",
        flex: "1 1 160px",
        minWidth: 140,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: 3,
          background: color,
          borderRadius: "12px 12px 0 0",
        }}
      />
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: "#f9fafb",
          lineHeight: 1,
          fontFamily: "'DM Mono', monospace",
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>
        {label}
      </div>
      <div style={{ fontSize: 11, color: "#4b5563" }}>{sub}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  style,
}: {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: "#111827",
        border: "1px solid #1f2937",
        borderRadius: 14,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        ...style,
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#6b7280",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div
      style={{
        color: "#374151",
        fontSize: 13,
        textAlign: "center",
        padding: "24px 0",
        fontStyle: "italic",
      }}
    >
      {message}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeHealthIndex, setActiveHealthIndex] = useState<number | null>(
    null
  );

  return (
    <div
      style={{
        background: "#0d1117",
        minHeight: "100vh",
        padding: "28px 32px",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        color: "#e5e7eb",
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "#f9fafb",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          Dashboard
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#6b7280" }}>
          Overview of your project activity
        </p>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "flex",
          gap: 14,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {statsCards.map((card) => (
          <StatsCard key={card.label} {...card} />
        ))}
      </div>

      {/* Row 2: Project Health + Recent Milestones + Activity Feed */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {/* Project Health */}
        <SectionCard title="Project Health">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={160} height={160}>
              <Pie
                data={projectHealth}
                cx={75}
                cy={75}
                innerRadius={50}
                outerRadius={72}
                dataKey="value"
                paddingAngle={2}
                onMouseEnter={(_, index) => setActiveHealthIndex(index)}
                onMouseLeave={() => setActiveHealthIndex(null)}
              >
                {projectHealth.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color}
                    opacity={
                      activeHealthIndex === null ||
                      activeHealthIndex === index
                        ? 1
                        : 0.4
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {projectHealth.slice(0, 3).map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.color,
                    }}
                  />
                  <span style={{ color: "#9ca3af" }}>{item.name}</span>
                </div>
                <span style={{ color: "#4b5563", fontFamily: "monospace" }}>
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Recent Milestones */}
        <SectionCard title="Recent Milestones">
          {recentMilestones.length === 0 ? (
            <EmptyState message="No milestones yet" />
          ) : (
            recentMilestones.map((m) => (
              <div key={m.title} style={{ fontSize: 13 }}>
                {m.title}
              </div>
            ))
          )}
        </SectionCard>

        {/* Activity Feed */}
        <SectionCard title="Activity Feed">
          {activityFeed.length === 0 ? (
            <EmptyState message="No recent activity" />
          ) : (
            activityFeed.map((a, i) => (
              <div key={i} style={{ fontSize: 13 }}>
                {a.action}
              </div>
            ))
          )}
        </SectionCard>
      </div>

      {/* Row 3: Progress Over Time + Tasks Overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 280px",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {/* Progress Over Time */}
        <SectionCard title="Progress Over Time">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={progressOverTime}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="progressGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="week"
                tick={{ fill: "#4b5563", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#4b5563", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e5e7eb",
                }}
              />
              <Area
                type="monotone"
                dataKey="progress"
                stroke="#4f8ef7"
                strokeWidth={2}
                fill="url(#progressGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Tasks Overview */}
        <SectionCard title="Tasks Overview">
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PieChart width={160} height={160}>
              <Pie
                data={tasksOverview}
                cx={75}
                cy={75}
                innerRadius={50}
                outerRadius={72}
                dataKey="value"
                paddingAngle={2}
              >
                {tasksOverview.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {tasksOverview.slice(0, 4).map((item) => (
              <div
                key={item.name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: item.color,
                    }}
                  />
                  <span style={{ color: "#9ca3af" }}>{item.name}</span>
                </div>
                <span style={{ color: "#4b5563", fontFamily: "monospace" }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Row 4: Upcoming Milestones + Notifications + Git Pulse */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 14,
        }}
      >
        {/* Upcoming Milestones */}
        <SectionCard title="Upcoming Milestones">
          {upcomingMilestones.length === 0 ? (
            <EmptyState message="No upcoming milestones" />
          ) : (
            upcomingMilestones.map((m) => (
              <div key={m.title} style={{ fontSize: 13 }}>
                {m.title}
              </div>
            ))
          )}
        </SectionCard>

        {/* Latest Notifications */}
        <SectionCard title="Latest Notifications">
          {latestNotifications.length === 0 ? (
            <EmptyState message="No notifications" />
          ) : (
            latestNotifications.map((n, i) => (
              <div key={i} style={{ fontSize: 13 }}>
                {n.message}
              </div>
            ))
          )}
        </SectionCard>

        {/* Git Pulse */}
        <SectionCard title="Git Pulse">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={gitPulseData}
              margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: "#4b5563", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#4b5563", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#e5e7eb",
                }}
              />
              <Bar dataKey="commits" radius={[4, 4, 0, 0]}>
                {gitPulseData.map((_, index) => (
                  <Cell key={index} fill="#4f8ef7" opacity={0.7} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11,
              color: "#4b5563",
              marginTop: -8,
            }}
          >
            <span>0 commits this week</span>
            <span>0 contributors</span>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
