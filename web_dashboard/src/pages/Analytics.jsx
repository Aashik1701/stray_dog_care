import React, { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { AreaChart, Area, LineChart, Line, CartesianGrid, Tooltip, XAxis, YAxis, Legend, BarChart, Bar, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowTrendingUpIcon, FireIcon, MapPinIcon, QueueListIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';

function Section({ title, children, right }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        {right}
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, color = 'text-blue-600', bg = 'bg-blue-50' }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 flex items-center gap-4">
      <div className={`h-12 w-12 ${bg} ${color} rounded-lg flex items-center justify-center`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <div className="text-sm text-gray-500">{label}</div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
      </div>
    </div>
  );
}

const URGENCY_BUCKET_LABELS = {
  '0': '0 - 0.25',
  '0.25': '0.25 - 0.5',
  '0.5': '0.5 - 0.75',
  '0.75': '0.75 - 1.0',
  'unknown': 'unknown',
};

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#9333ea', '#14b8a6', '#f97316', '#06b6d4'];

export default function Analytics() {
  const { error } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [range, setRange] = useState({ from: '', to: '' });

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const params = {};
        if (range.from) params.from = range.from;
        if (range.to) params.to = range.to;
        const resp = await api.getReportsAnalytics(params);
        if (isMounted) setData(resp.data);
      } catch (e) {
        console.error(e);
        error(e.message || 'Failed to load analytics');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [range.from, range.to, error]);

  const sentimentSeries = useMemo(() => {
    if (!data?.sentimentByDay?.length) return [];
    const byDay = {};
    for (const row of data.sentimentByDay) {
      const day = row._id?.day || 'unknown';
      const sent = (row._id?.sentiment || 'neutral').toLowerCase();
      byDay[day] = byDay[day] || { day };
      byDay[day][sent] = row.count;
    }
    return Object.values(byDay).sort((a, b) => (a.day > b.day ? 1 : -1));
  }, [data]);

  const urgencyBars = useMemo(() => {
    if (!data?.urgencyBuckets?.length) return [];
    return data.urgencyBuckets.map(b => ({
      bucket: URGENCY_BUCKET_LABELS[String(b._id)] || String(b._id),
      count: b.count,
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="min-h-[50vh] flex items-center justify-center text-gray-500">Loading analytics…</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="analytics-from" className="block text-xs font-medium text-gray-500">From</label>
            <input id="analytics-from" type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="mt-1 border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label htmlFor="analytics-to" className="block text-xs font-medium text-gray-500">To</label>
            <input id="analytics-to" type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="mt-1 border rounded-md px-3 py-2 text-sm" />
          </div>
          <button onClick={() => setRange({ from: '', to: '' })} className="ml-auto text-sm text-blue-600 hover:underline">Reset</button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={QueueListIcon} label="Total Reports" value={data?.totals?.totalReports || 0} hint="All time in selected range" />
        <StatCard icon={ArrowTrendingUpIcon} label="Topics Tracked" value={data?.topics?.length || 0} color="text-purple-600" bg="bg-purple-50" />
        <StatCard icon={FireIcon} label="High Urgency (recent)" value={data?.recentHighUrgency?.length || 0} color="text-red-600" bg="bg-red-50" />
        <StatCard icon={MapPinIcon} label="Duplicate Rate" value={`${Math.round((data?.totals?.duplicateRate || 0) * 100)}%`} color="text-amber-600" bg="bg-amber-50" />
      </div>

      {/* Sentiment over time */}
      <Section title="Sentiment over time">
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sentimentSeries} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tickFormatter={(d) => {
                try { return format(parseISO(d), 'MMM d'); } catch { return d; }
              }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="neutral" stroke="#64748b" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Urgency histogram + Topics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Urgency distribution">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={urgencyBars}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Top topics" right={<span className="text-xs text-gray-400">by frequency</span>}>
          <div className="space-y-3">
            {(data?.topics || []).map((t, idx) => (
              <div key={t._id || idx} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[idx % COLORS.length] }} />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800 capitalize">{t._id}</div>
                  <div className="text-xs text-gray-500">Avg urgency {t.avgUrgency ? t.avgUrgency.toFixed(2) : '0.00'}</div>
                </div>
                <div className="text-sm text-gray-700 font-semibold">{t.count}</div>
              </div>
            ))}
            {(!data?.topics || data.topics.length === 0) && <div className="text-sm text-gray-400">No topic data</div>}
          </div>
        </Section>

        <Section title="Duplicate samples">
          <div className="space-y-3 max-h-72 overflow-auto pr-1">
            {(data?.recentHighUrgency || []).slice(0, 6).map((r) => (
              <div key={String(r._id)} className="border border-gray-100 rounded-lg p-3">
                <div className="text-xs text-gray-400">{format(new Date(r.created_at), 'PP p')}</div>
                <div className="text-sm text-gray-800 mt-1 line-clamp-2">{r.summary || r.raw_text}</div>
                <div className="text-xs text-amber-600 mt-1">Urgency {r.urgency_score?.toFixed(2)}</div>
              </div>
            ))}
            {(!data?.recentHighUrgency || data.recentHighUrgency.length === 0) && <div className="text-sm text-gray-400">No high-urgency reports</div>}
          </div>
        </Section>
      </div>

      {/* Symptoms and Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Top symptoms (extracted)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data?.topSymptoms || []).map((s, idx) => (
              <div key={s._id || idx} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800 capitalize">{s._id}</div>
                  <div className="text-xs text-gray-500">Avg urgency {s.avgUrgency ? s.avgUrgency.toFixed(2) : '0.00'}</div>
                </div>
                <div className="text-sm font-semibold text-gray-700">{s.count}</div>
              </div>
            ))}
            {(!data?.topSymptoms || data.topSymptoms.length === 0) && <div className="text-sm text-gray-400">No symptom entities found</div>}
          </div>
        </Section>
        <Section title="Hotspot areas">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(data?.topLocations || []).map((l, idx) => (
              <div key={l._id || idx} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800 capitalize">{l._id}</div>
                  <div className="text-xs text-gray-500">Avg urgency {l.avgUrgency ? l.avgUrgency.toFixed(2) : '0.00'}</div>
                </div>
                <div className="text-sm font-semibold text-gray-700">{l.count}</div>
              </div>
            ))}
            {(!data?.topLocations || data.topLocations.length === 0) && <div className="text-sm text-gray-400">No location hints found</div>}
          </div>
        </Section>
      </div>
    </div>
  );
}
