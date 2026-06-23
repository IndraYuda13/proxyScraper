'use client';

import { useState, useEffect } from 'react';
import { 
  Shield, RefreshCw, Download, Zap, Server, CheckCircle2, 
  Search, Map, Square, Activity, Trash2, Settings, 
  Terminal, Sliders, Globe, Copy, Check, Filter, 
  Database, Cpu, Wifi, AlertTriangle, FileText
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend 
} from 'recharts';

interface Proxy {
  id: number;
  ip: string;
  port: string;
  protocol: string;
  country: string;
  anonymity: string;
  latency: number;
  status: string;
  isp: string;
  asn: string;
  last_checked: string;
}

interface SystemStatus {
  current_step: string;
  scanned_urls: number;
  proxies_found: number;
  verified_live: number;
  is_running: boolean;
  check_timeout: number;
  check_concurrency: number;
  test_target_url: string;
  ai_api_key: string;
  ai_endpoint: string;
  ai_enabled: number;
}

interface SourceStat {
  url: string;
  proxies_found: number;
  verified_live: number;
  last_scraped: string;
}

interface SystemLog {
  id: number;
  message: string;
  level: string;
  timestamp: string;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'proxies' | 'logs' | 'settings'>('dashboard');
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [sysStatus, setSysStatus] = useState<SystemStatus | null>(null);
  const [sourceStats, setSourceStats] = useState<SourceStat[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Filter state
  const [searchIP, setSearchIP] = useState('');
  const [filterProtocol, setFilterProtocol] = useState('All');
  const [filterCountry, setFilterCountry] = useState('All');
  const [filterAnonymity, setFilterAnonymity] = useState('All');
  const [filterMaxLatency, setFilterMaxLatency] = useState(3000);
  
  // Config Form state
  const [configTimeout, setConfigTimeout] = useState(3000);
  const [configConcurrency, setConfigConcurrency] = useState(200);
  const [configTargetUrl, setConfigTargetUrl] = useState('http://ip-api.com/json');
  const [configAiApiKey, setConfigAiApiKey] = useState('');
  const [configAiEndpoint, setConfigAiEndpoint] = useState('');
  const [configAiEnabled, setConfigAiEnabled] = useState(true);
  
  // Copy feedback state
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function fetchProxies() {
    try {
      const res = await fetch('/api/proxies');
      const data = await res.json();
      setProxies(data.proxies || []);
      
      if (data.status) {
        setSysStatus(data.status);
        // Sync form state if not dirty/currently editing
        setConfigTimeout(data.status.check_timeout);
        setConfigConcurrency(data.status.check_concurrency);
        setConfigTargetUrl(data.status.test_target_url);
        setConfigAiApiKey(data.status.ai_api_key);
        setConfigAiEndpoint(data.status.ai_endpoint);
        setConfigAiEnabled(!!data.status.ai_enabled);
      }
      setSourceStats(data.sourceStats || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    try {
      const res = await fetch('/api/logs?limit=80');
      const data = await res.json();
      setLogs(data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function triggerScrape() {
    try {
      await fetch('/api/proxies', { method: 'POST', body: JSON.stringify({ action: 'start' }) });
      fetchProxies();
      fetchLogs();
    } catch (e) {
      console.error(e);
    }
  }

  async function stopScrape() {
    try {
      await fetch('/api/proxies', { method: 'POST', body: JSON.stringify({ action: 'stop' }) });
      fetchProxies();
    } catch (e) {
      console.error(e);
    }
  }

  async function resetDatabase() {
    if (!confirm('Apakah Anda yakin ingin mereset semua data proxy, statistik sumber, dan riwayat log?')) return;
    try {
      await fetch('/api/proxies', { method: 'POST', body: JSON.stringify({ action: 'reset' }) });
      fetchProxies();
      fetchLogs();
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_timeout: configTimeout,
          check_concurrency: configConcurrency,
          test_target_url: configTargetUrl,
          ai_api_key: configAiApiKey,
          ai_endpoint: configAiEndpoint,
          ai_enabled: configAiEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Konfigurasi berhasil disimpan!');
        fetchProxies();
      } else {
        alert('Gagal menyimpan konfigurasi: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  }

  async function handleClearLogs() {
    try {
      const res = await fetch('/api/logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  const handleCopyProxy = (ip: string, port: string, index: number) => {
    navigator.clipboard.writeText(`${ip}:${port}`);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  useEffect(() => {
    setMounted(true);
    fetchProxies();
    fetchLogs();
    
    const intervalFast = setInterval(() => {
      fetchProxies();
    }, 3000);

    const intervalSlow = setInterval(() => {
      fetchLogs();
    }, 4000);

    return () => {
      clearInterval(intervalFast);
      clearInterval(intervalSlow);
    };
  }, []);

  // Filter Logic
  const filteredProxies = proxies.filter(p => {
    const matchesIP = p.ip.includes(searchIP) || p.port.includes(searchIP) || (p.isp && p.isp.toLowerCase().includes(searchIP.toLowerCase()));
    const matchesProtocol = filterProtocol === 'All' || p.protocol.toLowerCase() === filterProtocol.toLowerCase();
    const matchesCountry = filterCountry === 'All' || p.country.toUpperCase() === filterCountry.toUpperCase();
    const matchesAnonymity = filterAnonymity === 'All' || p.anonymity.toLowerCase() === filterAnonymity.toLowerCase();
    const matchesLatency = p.latency <= filterMaxLatency;
    return matchesIP && matchesProtocol && matchesCountry && matchesAnonymity && matchesLatency;
  });

  // Calculate unique countries for filter dropdown
  const uniqueCountries = Array.from(new Set(proxies.map(p => p.country))).filter(Boolean).sort();

  // Recharts Calculations
  const protocolCounts = proxies.reduce((acc, p) => {
    acc[p.protocol] = (acc[p.protocol] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const protocolChartData = Object.entries(protocolCounts).map(([name, value]) => ({
    name: name.toUpperCase(),
    value
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#ec4899'];

  const latencyBuckets = [
    { name: '< 200ms', value: 0 },
    { name: '200-500ms', value: 0 },
    { name: '500ms-1s', value: 0 },
    { name: '1s-2s', value: 0 },
    { name: '> 2s', value: 0 }
  ];

  proxies.forEach(p => {
    if (p.latency < 200) latencyBuckets[0].value++;
    else if (p.latency < 500) latencyBuckets[1].value++;
    else if (p.latency < 1000) latencyBuckets[2].value++;
    else if (p.latency < 2000) latencyBuckets[3].value++;
    else latencyBuckets[4].value++;
  });

  const countryCounts = proxies.reduce((acc, p) => {
    acc[p.country] = (acc[p.country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const countryChartData = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const avgLatency = proxies.length > 0
    ? Math.round(proxies.reduce((sum, p) => sum + p.latency, 0) / proxies.length)
    : 0;

  return (
    <main className="min-h-screen bg-[#070b13] text-slate-200 font-sans antialiased bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-950/20 via-[#070b13] to-[#070b13]">
      
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-[#080d16]/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <Shield className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              ProxyPool AI Premium
            </h1>
            <p className="text-xs text-slate-400">Automated Smart Proxy Scraper & Checker</p>
          </div>
        </div>

        {/* Global Controls & Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Navigation Tabs */}
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-1 flex space-x-1">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => setActiveTab('proxies')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'proxies' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Database className="h-3.5 w-3.5" />
              <span>Proxy List</span>
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'logs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Logs ({logs.length})</span>
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'settings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>
          </div>

          <div className="h-6 w-px bg-slate-800"></div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {sysStatus?.is_running ? (
              <button
                onClick={stopScrape}
                className="flex items-center space-x-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-red-500/10 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" />
                <span>Stop Scrape</span>
              </button>
            ) : (
              <button
                onClick={triggerScrape}
                className="flex items-center space-x-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/35 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Force Scrape</span>
              </button>
            )}
            
            <button
              onClick={resetDatabase}
              className="flex items-center justify-center p-2 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/50 rounded-xl transition-colors cursor-pointer"
              title="Reset Database"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* Real-time Processing Banner */}
        {sysStatus && sysStatus.is_running && (
          <div className="bg-emerald-950/20 border border-emerald-500/25 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 backdrop-blur-sm shadow-xl shadow-emerald-950/5 animate-pulse">
            <div className="flex items-center space-x-3">
              <div className="p-1.5 bg-emerald-500/20 rounded-lg">
                <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" />
              </div>
              <div>
                <span className="font-semibold text-sm text-emerald-400">{sysStatus.current_step}</span>
                <p className="text-[10px] text-emerald-500/80">Proses berjalan secara asinkron di server</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-xs bg-slate-950/50 border border-slate-800/40 px-4 py-2 rounded-xl">
              <div>Scanned: <span className="text-emerald-400 font-mono font-bold">{sysStatus.scanned_urls}</span></div>
              <div className="w-px h-3 bg-slate-800"></div>
              <div>Found: <span className="text-emerald-400 font-mono font-bold">{sysStatus.proxies_found}</span></div>
              <div className="w-px h-3 bg-slate-800"></div>
              <div>Live: <span className="text-emerald-400 font-mono font-bold">{sysStatus.verified_live}</span></div>
            </div>
          </div>
        )}

        {/* ================= TAB 1: DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950/40 border border-slate-900/80 p-5 rounded-2xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute right-3 top-3 p-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                  <Database className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-400 mb-1">Total Active Pool</p>
                <h3 className="text-2xl font-bold tracking-tight text-white">{proxies.length} <span className="text-xs font-normal text-slate-500">proxies</span></h3>
              </div>

              <div className="bg-slate-950/40 border border-slate-900/80 p-5 rounded-2xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute right-3 top-3 p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                  <Zap className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-400 mb-1">Elite Anonymity</p>
                <h3 className="text-2xl font-bold tracking-tight text-emerald-400">
                  {proxies.filter(p => p.anonymity === 'Elite').length} 
                  <span className="text-xs font-normal text-slate-500"> ({Math.round((proxies.filter(p => p.anonymity === 'Elite').length / (proxies.length || 1)) * 100)}%)</span>
                </h3>
              </div>

              <div className="bg-slate-950/40 border border-slate-900/80 p-5 rounded-2xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute right-3 top-3 p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400">
                  <Wifi className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-400 mb-1">Avg Latency</p>
                <h3 className="text-2xl font-bold tracking-tight text-amber-400">{avgLatency} <span className="text-xs font-normal text-slate-500">ms</span></h3>
              </div>

              <div className="bg-slate-950/40 border border-slate-900/80 p-5 rounded-2xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute right-3 top-3 p-1.5 bg-teal-500/10 border border-teal-500/20 rounded-lg text-teal-400">
                  <Globe className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-400 mb-1">Regional Coverage</p>
                <h3 className="text-2xl font-bold tracking-tight text-teal-400">{Object.keys(countryCounts).length} <span className="text-xs font-normal text-slate-500">countries</span></h3>
              </div>
            </div>

            {/* Analytics Charts */}
            {mounted && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Protocol Distribution */}
                <div className="bg-slate-950/40 border border-slate-900/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">Protocol Distribution</h4>
                    <p className="text-xs text-slate-400">Sebaran tipe protokol dalam pool</p>
                  </div>
                  <div className="h-56 w-full flex items-center justify-center my-4">
                    {protocolChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={protocolChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {protocolChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#080d16', border: '1px solid #1e293b', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Legend formatter={(val) => <span className="text-xs text-slate-300 font-semibold">{val}</span>} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-500">Tidak ada data visualisasi</div>
                    )}
                  </div>
                </div>

                {/* Latency Buckets */}
                <div className="bg-slate-950/40 border border-slate-900/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">Latency Distribution</h4>
                    <p className="text-xs text-slate-400">Pembagian proxy berdasarkan rentang respons</p>
                  </div>
                  <div className="h-56 w-full my-4">
                    {proxies.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={latencyBuckets}>
                          <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#080d16', border: '1px solid #1e293b', borderRadius: '8px' }}
                            labelClassName="text-xs text-slate-400"
                          />
                          <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-500 h-full flex items-center justify-center">Tidak ada data visualisasi</div>
                    )}
                  </div>
                </div>

                {/* Top Countries */}
                <div className="bg-slate-950/40 border border-slate-900/80 rounded-2xl p-5 backdrop-blur-sm flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200 mb-1">Top Geographies</h4>
                    <p className="text-xs text-slate-400">7 Negara penyumbang proxy terbanyak</p>
                  </div>
                  <div className="h-56 w-full my-4">
                    {countryChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countryChartData} layout="vertical">
                          <XAxis type="number" stroke="#94a3b8" fontSize={9} tickLine={false} />
                          <YAxis dataKey="country" type="category" stroke="#94a3b8" fontSize={9} tickLine={false} width={30} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#080d16', border: '1px solid #1e293b', borderRadius: '8px' }}
                          />
                          <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-xs text-slate-500 h-full flex items-center justify-center">Tidak ada data visualisasi</div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* Source Stats tracing list */}
            <div className="bg-slate-950/40 border border-slate-900/80 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="h-4 w-4 text-indigo-400" />
                <h4 className="text-sm font-bold">Source Tracing Statistics</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto pr-2">
                {sourceStats.map((src, i) => (
                  <div key={i} className="bg-slate-900/40 border border-slate-800/40 rounded-xl p-3.5 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-400 truncate block mb-1.5" title={src.url}>{src.url}</span>
                    <div className="flex justify-between items-center text-xs">
                      <div>Found: <span className="text-slate-200 font-semibold">{src.proxies_found}</span></div>
                      <div>Live: <span className={`font-bold ${src.verified_live > 0 ? 'text-emerald-400' : 'text-amber-500'}`}>{src.verified_live}</span></div>
                    </div>
                  </div>
                ))}
                {sourceStats.length === 0 && (
                  <p className="text-xs text-slate-500 py-4 col-span-3 text-center">Belum ada statistik sumber proxy yang tersimpan.</p>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 2: PROXY LIST ================= */}
        {activeTab === 'proxies' && (
          <div className="space-y-6">
            
            {/* Filter Panel */}
            <div className="bg-slate-950/40 border border-slate-900/80 p-5 rounded-2xl backdrop-blur-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-bold text-slate-200">Advanced Filters</span>
                </div>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="text-slate-400">Total Filtered: </span>
                  <span className="text-emerald-400 font-mono">{filteredProxies.length} / {proxies.length}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                {/* Search */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Search IP / Port / ISP</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                    <input 
                      type="text" 
                      placeholder="e.g. 192.168.1.1..." 
                      value={searchIP}
                      onChange={(e) => setSearchIP(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Protocol */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Protocol</label>
                  <select 
                    value={filterProtocol}
                    onChange={(e) => setFilterProtocol(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="All">All Protocols</option>
                    <option value="HTTP">HTTP</option>
                    <option value="HTTPS">HTTPS</option>
                    <option value="SOCKS4">SOCKS4</option>
                    <option value="SOCKS5">SOCKS5</option>
                  </select>
                </div>

                {/* Anonymity */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Anonymity</label>
                  <select 
                    value={filterAnonymity}
                    onChange={(e) => setFilterAnonymity(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="All">All Anonymity</option>
                    <option value="Elite">Elite</option>
                    <option value="Anonymous">Anonymous</option>
                    <option value="Transparent">Transparent</option>
                  </select>
                </div>

                {/* Country */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Country</label>
                  <select 
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="All">All Countries</option>
                    {uniqueCountries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Max Latency */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Max Latency ({filterMaxLatency}ms)</label>
                  <input 
                    type="range" 
                    min="100" 
                    max="3000" 
                    step="100"
                    value={filterMaxLatency}
                    onChange={(e) => setFilterMaxLatency(parseInt(e.target.value))}
                    className="w-full accent-indigo-500 bg-slate-800 rounded-lg appearance-none h-1.5 mt-3"
                  />
                </div>
              </div>
            </div>

            {/* Export & Download Controls */}
            <div className="flex justify-between items-center flex-wrap gap-4 bg-slate-950/20 border border-slate-900/80 px-6 py-3.5 rounded-2xl">
              <span className="text-xs text-slate-400 font-medium">Export Proxy List:</span>
              <div className="flex gap-2">
                <a 
                  href="/api/export?format=csv"
                  className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs px-3 py-1.5 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>CSV</span>
                </a>
                <a 
                  href="/api/export?format=txt"
                  className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs px-3 py-1.5 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>TXT (IP:Port)</span>
                </a>
                <a 
                  href="/api/export?format=json"
                  className="flex items-center space-x-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs px-3 py-1.5 rounded-xl text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <Database className="h-3.5 w-3.5" />
                  <span>JSON</span>
                </a>
                <a 
                  href="/api/export?format=clash"
                  className="flex items-center space-x-1 bg-indigo-500/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-xs px-3 py-1.5 rounded-xl text-indigo-400 hover:text-white transition-all cursor-pointer"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Clash YAML</span>
                </a>
              </div>
            </div>

            {/* Proxy Table Card */}
            <div className="bg-slate-950/40 border border-slate-900/80 rounded-2xl overflow-hidden backdrop-blur-sm">
              {loading ? (
                <div className="p-12 text-center text-slate-500">Memuat daftar proxy...</div>
              ) : (
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-[#080d16] z-10 border-b border-slate-800/80">
                      <tr className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-4">IP Address</th>
                        <th className="p-4">Port</th>
                        <th className="p-4">Protocol</th>
                        <th className="p-4">Country</th>
                        <th className="p-4">Anonymity</th>
                        <th className="p-4">Latency</th>
                        <th className="p-4">ISP / Network</th>
                        <th className="p-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredProxies.map((p, idx) => (
                        <tr key={p.id || idx} className="hover:bg-slate-900/20 transition-colors">
                          <td className="p-4 font-mono font-medium text-slate-100">{p.ip}</td>
                          <td className="p-4 font-mono text-slate-300">{p.port}</td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              p.protocol === 'socks5' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                              p.protocol === 'socks4' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              p.protocol === 'https' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {p.protocol}
                            </span>
                          </td>
                          <td className="p-4 font-semibold text-slate-300">{p.country || 'Unknown'}</td>
                          <td className="p-4">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              p.anonymity === 'Elite' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              p.anonymity === 'Anonymous' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-slate-500/10 text-slate-400 border border-slate-800'
                            }`}>
                              {p.anonymity}
                            </span>
                          </td>
                          <td className="p-4 font-mono font-semibold text-emerald-400">{p.latency} ms</td>
                          <td className="p-4 max-w-[200px] truncate text-slate-400 font-mono text-[10px]">{p.isp || p.asn || '-'}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleCopyProxy(p.ip, p.port, idx)}
                              className="p-1.5 bg-slate-900 hover:bg-indigo-900/40 text-slate-400 hover:text-indigo-400 border border-slate-800 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                              title="Salin ke Clipboard"
                            >
                              {copiedIndex === idx ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                      {filteredProxies.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-12 text-center text-slate-500">
                            Tidak ada proxy aktif yang cocok dengan filter pencarian.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
          </div>
        )}

        {/* ================= TAB 3: LOGS ================= */}
        {activeTab === 'logs' && (
          <div className="space-y-6">
            
            <div className="bg-slate-950/40 border border-slate-900/80 rounded-2xl p-5 backdrop-blur-sm space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="h-4 w-4 text-indigo-400" />
                  <h4 className="text-sm font-bold text-slate-200">Real-time Activity Logs</h4>
                </div>
                <button 
                  onClick={handleClearLogs}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-900/50 text-xs px-3 py-1.5 rounded-xl transition-all cursor-pointer font-semibold"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Hapus Log</span>
                </button>
              </div>

              {/* Console Viewer */}
              <div className="bg-[#03060a] border border-slate-800 rounded-xl p-4 font-mono text-xs overflow-y-auto h-[500px] flex flex-col-reverse shadow-inner">
                <div className="space-y-2">
                  {logs.map((log) => {
                    let levelColor = 'text-slate-300';
                    if (log.level === 'warn') levelColor = 'text-amber-400';
                    if (log.level === 'error') levelColor = 'text-red-400 font-semibold';
                    
                    return (
                      <div key={log.id} className="border-b border-slate-900/50 pb-1 flex gap-2 items-start">
                        <span className="text-slate-500 select-none">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                        <span className={`text-[10px] font-bold uppercase px-1 rounded bg-slate-900 select-none ${
                          log.level === 'warn' ? 'text-amber-500 border border-amber-500/20' : 
                          log.level === 'error' ? 'text-red-500 border border-red-500/20' : 
                          'text-indigo-400 border border-indigo-500/20'
                        }`}>{log.level}</span>
                        <span className={`${levelColor} break-all`}>{log.message}</span>
                      </div>
                    );
                  })}
                  {logs.length === 0 && (
                    <div className="text-center text-slate-600 py-12">Tidak ada log aktivitas yang tersimpan.</div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ================= TAB 4: SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            
            <form onSubmit={handleSaveConfig} className="bg-slate-950/40 border border-slate-900/80 rounded-2xl p-6 backdrop-blur-sm space-y-6 max-w-3xl mx-auto">
              <div className="flex items-center space-x-2 border-b border-slate-800/80 pb-4">
                <Sliders className="h-5 w-5 text-indigo-400" />
                <div>
                  <h4 className="text-sm font-bold text-slate-200">System Configuration</h4>
                  <p className="text-xs text-slate-400">Atur parameter verifikasi, batasan thread, dan integrasi AI</p>
                </div>
              </div>

              {/* Checker configuration */}
              <div className="space-y-4">
                <h5 className="text-xs font-bold text-indigo-400 border-l-2 border-indigo-500 pl-2 uppercase">Proxy Checker Config</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Test Timeout (ms)</label>
                    <input 
                      type="number" 
                      value={configTimeout}
                      onChange={(e) => setConfigTimeout(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                      min="500"
                      max="10000"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Batas maksimal pengujian respon koneksi proxy (rekomendasi: 3000)</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Thread Concurrency</label>
                    <input 
                      type="number" 
                      value={configConcurrency}
                      onChange={(e) => setConfigConcurrency(parseInt(e.target.value, 10))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
                      required
                      min="10"
                      max="1000"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Jumlah thread bersamaan dalam checking (rekomendasi: 100 - 300)</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">Test Target URL</label>
                  <input 
                    type="url" 
                    value={configTargetUrl}
                    onChange={(e) => setConfigTargetUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">URL tujuan tes. Gunakan default `http://ip-api.com/json` untuk deteksi penuh (Negara/ISP) atau target situs kustom lainnya.</span>
                </div>
              </div>

              {/* AI Extraction configuration */}
              <div className="space-y-4 pt-4 border-t border-slate-800/60">
                <div className="flex justify-between items-center">
                  <h5 className="text-xs font-bold text-indigo-400 border-l-2 border-indigo-500 pl-2 uppercase">AI Extraction (Gemma) Config</h5>
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      id="aiEnabled"
                      checked={configAiEnabled}
                      onChange={(e) => setConfigAiEnabled(e.target.checked)}
                      className="rounded border-slate-850 bg-slate-900 text-indigo-500 focus:ring-indigo-500 h-4 w-4"
                    />
                    <label htmlFor="aiEnabled" className="text-xs text-slate-300 font-bold select-none cursor-pointer">Aktifkan AI</label>
                  </div>
                </div>

                {configAiEnabled && (
                  <div className="grid grid-cols-1 gap-4 bg-slate-900/20 border border-slate-850 p-4 rounded-xl">
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">AI Endpoint URL</label>
                      <input 
                        type="url" 
                        value={configAiEndpoint}
                        onChange={(e) => setConfigAiEndpoint(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                        required={configAiEnabled}
                        placeholder="https://..."
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase">AI API Key (Bearer Token)</label>
                      <input 
                        type="password" 
                        value={configAiApiKey}
                        onChange={(e) => setConfigAiApiKey(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-850 rounded-xl py-2.5 px-3 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
                        required={configAiEnabled}
                        placeholder="sk-..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="submit"
                  className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </main>
  );
}
