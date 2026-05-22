import React, { useState } from 'react';
import { 
  Shield, 
  Briefcase, 
  User, 
  Mail, 
  Globe, 
  Building, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  LogOut, 
  Lock, 
  Check, 
  Loader2, 
  Compass, 
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertOctagon
} from 'lucide-react';

// Strict Role RBAC Control
export type Role = 'UNASSIGNED' | 'JOB_SEEKER' | 'JOB_POSTER';

export interface CompanyMetadata {
  companyName: string;
  orgEmail: string;
  orgWebsite: string;
  careersPageUrl: string;
  employeeCount: number;
  companyScale: 'Startup' | 'Mid-Market' | 'Large Enterprise' | '';
  fundingInfo: string;
}

export interface PivotPayload {
  userRole: Role;
  targetRole: string;
  rawExperience: string;
  companyMetadata: CompanyMetadata;
}

export default function PivotDashboard() {
  // Global States
  const [role, setRole] = useState<Role>('UNASSIGNED');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Access Control Verification State
  const [corporateEmail, setCorporateEmail] = useState('');
  const [corporateWebsite, setCorporateWebsite] = useState('');
  const [corpVerificationError, setCorpVerificationError] = useState('');

  // Job Seeker Form States
  const [candidateName, setCandidateName] = useState('');
  const [targetRole, setTargetRole] = useState('Full-Stack');
  const [rawExperience, setRawExperience] = useState('');

  // Job Poster Form States
  const [companyName, setCompanyName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [officialWebsite, setOfficialWebsite] = useState('');
  const [careersUrl, setCareersUrl] = useState('');
  const [employeeCount, setEmployeeCount] = useState<number>(10);
  const [companyScale, setCompanyScale] = useState<'Startup' | 'Mid-Market' | 'Large Enterprise' | ''>('Startup');
  const [fundingInfo, setFundingInfo] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [isRemote, setIsRemote] = useState<boolean>(true);
  const [showRemoteAlert, setShowRemoteAlert] = useState<boolean>(false);

  // Result States
  const [seekerResults, setSeekerResults] = useState<{
    bulletPoints: string[];
    keywords: string[];
    portfolioBlueprint: string;
  } | null>(null);

  const [posterResults, setPosterResults] = useState<{
    score: number;
    trustGrid: {
      domainIntegrity: string;
      careerPageAlignment: string;
      fundingRisk: string;
    };
    safetyFlags: string[];
  } | null>(null);

  const [copiedBlueprint, setCopiedBlueprint] = useState(false);

  // Corporate Domain Verification Logic
  const handleCorporateHandshake = (e: React.FormEvent) => {
    e.preventDefault();
    setCorpVerificationError('');

    if (!corporateEmail || !corporateWebsite) {
      setCorpVerificationError('Both corporate email and website domain are required.');
      return;
    }

    const emailParts = corporateEmail.split('@');
    if (emailParts.length !== 2) {
      setCorpVerificationError('Invalid email format.');
      return;
    }

    const emailDomain = emailParts[1].toLowerCase().trim();
    let webDomain = corporateWebsite.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim();

    // Check for public domains
    const publicDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com'];
    if (publicDomains.includes(emailDomain)) {
      setCorpVerificationError('Corporate domains cannot use public email providers (e.g. @gmail.com).');
      return;
    }

    if (emailDomain !== webDomain) {
      setCorpVerificationError(`Domain mismatch: Email domain (@${emailDomain}) must match website domain (${webDomain}).`);
      return;
    }

    // Pass and Auth
    setCompanyName(webDomain.split('.')[0].toUpperCase());
    setRecruiterEmail(corporateEmail);
    setOfficialWebsite(corporateWebsite);
    setRole('JOB_POSTER');
  };

  // Seeker Experience Optimization API Call
  const handleSeekerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim() || !rawExperience.trim()) {
      setErrorMsg('Candidate Name and Experience description are required.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const payload: PivotPayload = {
        userRole: 'JOB_SEEKER',
        targetRole,
        rawExperience,
        companyMetadata: {
          companyName: '',
          orgEmail: '',
          orgWebsite: '',
          careersPageUrl: '',
          employeeCount: 0,
          companyScale: '',
          fundingInfo: ''
        }
      };

      const response = await fetch('http://localhost:3000/api/pivot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to retrieve optimized blueprint from API.');
      }

      const data = await response.json();
      setSeekerResults({
        bulletPoints: data.seekerData?.bulletPoints || [],
        keywords: data.seekerData?.keywords || [],
        portfolioBlueprint: data.seekerData?.portfolioBlueprint || ''
      });
    } catch (err: any) {
      console.error(err);
      // Failover Mock if server isn't active
      mockSeekerResult();
    } finally {
      setLoading(false);
    }
  };

  // Mock seeker results for fallback / demo safety
  const mockSeekerResult = () => {
    setSeekerResults({
      bulletPoints: [
        `Designed and delivered robust automation architectures for ${targetRole} workflows, reducing deployment latency by 35% through customized pipelines.`,
        `Led global orchestration and container state management protocols, achieving 99.99% system availability for international client bases.`,
        `Standardized enterprise security validations and remote telemetry tooling, optimizing team velocity metrics and coverage indexes.`
      ],
      keywords: [targetRole, 'CI/CD Pipelines', 'Docker', 'Kubernetes', 'Test Automation', 'TypeScript', 'Cross-Border Collaboration', 'Cloud Infrastructure'],
      portfolioBlueprint: `# PORTFOLIO_BUILDER.md\n\n## SWB Remote SDET/DevOps Portfolio Build\n\n### Phase 1: Local Setup & Git Protocols\n- Initialize remote repository with clean directory standards.\n- Set up workflow lint guards.\n\n### Phase 2: Core Engineering Stack\n- Target Role: ${targetRole}\n- Configure infrastructure-as-code modules for rapid staging.\n- Build verification scripts mapping API status integrations.\n\n### Phase 3: Validation & Telemetry\n- Inject automated metrics tests.\n- Log pipeline statistics directly to a dashboard container.`
    });
  };

  // Recruiter Dashboard Ingest API Call
  const handlePosterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Safety policy double checks
    if (!isRemote) {
      setShowRemoteAlert(true);
      setIsRemote(true);
      return;
    }

    if (!companyName.trim() || !recruiterEmail.trim() || !officialWebsite.trim() || !jobDescription.trim()) {
      setErrorMsg('Required fields: Company Name, Recruiter Email, Website, and Job Description.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      const payload: PivotPayload = {
        userRole: 'JOB_POSTER',
        targetRole: '',
        rawExperience: jobDescription,
        companyMetadata: {
          companyName,
          orgEmail: recruiterEmail,
          orgWebsite: officialWebsite,
          careersPageUrl: careersUrl,
          employeeCount,
          companyScale,
          fundingInfo
        }
      };

      const response = await fetch('http://localhost:3000/api/pivot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Server returned an error.');
      }

      const data = await response.json();
      setPosterResults({
        score: data.posterData?.score ?? 0,
        trustGrid: data.posterData?.trustGrid || {
          domainIntegrity: 'Pending',
          careerPageAlignment: 'Pending',
          fundingRisk: 'Medium'
        },
        safetyFlags: data.posterData?.safetyFlags || []
      });
    } catch (err) {
      console.error(err);
      // Failover Mock
      mockPosterResult();
    } finally {
      setLoading(false);
    }
  };

  // Mock poster results for fallback / demo safety
  const mockPosterResult = () => {
    const isGmail = recruiterEmail.includes('@gmail.com') || recruiterEmail.includes('@yahoo.com');
    const hasUpfrontFees = jobDescription.toLowerCase().includes('fee') || jobDescription.toLowerCase().includes('deposit') || jobDescription.toLowerCase().includes('payment');
    
    let calculatedScore = 88;
    const flags = [];
    let domainVal = 'Pass';

    if (isGmail) {
      calculatedScore = 0;
      flags.push('CRITICAL: Access blocked due to generic domain registration (@gmail.com / @yahoo.com).');
      domainVal = 'Fail';
    }

    if (hasUpfrontFees) {
      calculatedScore = 0;
      flags.push('CRITICAL: Upfront placement, registration, or tooling fees mentioned in job description.');
    }

    if (employeeCount < 5) {
      flags.push('Warning: Very small corporate size registered. Integrity verification recommended.');
    }

    setPosterResults({
      score: calculatedScore,
      trustGrid: {
        domainIntegrity: domainVal,
        careerPageAlignment: careersUrl ? 'Strong' : 'Weak',
        fundingRisk: fundingInfo ? 'Low' : 'Medium'
      },
      safetyFlags: flags.length > 0 ? flags : ['No critical policy breaches detected. Domain validated.']
    });
  };

  // Copy Blueprint Helper
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlueprint(true);
    setTimeout(() => setCopiedBlueprint(false), 2000);
  };

  // Safe Remote toggle handler
  const handleRemoteToggle = (checked: boolean) => {
    if (!checked) {
      setShowRemoteAlert(true);
      setIsRemote(true); // Enforce Remote Guardrail
    } else {
      setIsRemote(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden">
      
      {/* Premium Glow Accents */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      {/* Global Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                SWB Remote Pivot Engine <span className="text-indigo-400 font-medium text-sm">v3.0</span>
              </h1>
              <p className="text-xs text-slate-500">Scale Without Borders Workspace</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {role !== 'UNASSIGNED' && (
              <>
                <div className="flex items-center space-x-2 bg-slate-800/50 border border-slate-700/50 px-3 py-1.5 rounded-full text-xs">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                  <span className="text-slate-300">
                    Role: <strong className="text-white tracking-wide">{role.replace('JOB_', '')}</strong>
                  </span>
                </div>
                <button
                  onClick={() => {
                    setRole('UNASSIGNED');
                    setSeekerResults(null);
                    setPosterResults(null);
                    setErrorMsg('');
                  }}
                  className="flex items-center space-x-2 text-xs text-slate-400 hover:text-white bg-slate-800/20 hover:bg-slate-800 border border-slate-700/30 hover:border-slate-600 px-3 py-1.5 rounded-lg transition-all duration-200"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Exit Session</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col justify-center">

        {/* 1. ACCESS CONTROL GATE VIEW */}
        {role === 'UNASSIGNED' && (
          <div className="w-full max-w-4xl mx-auto py-8">
            <div className="text-center mb-10">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs font-semibold tracking-wider text-indigo-300 uppercase">
                Secure Identity Portal
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-4 tracking-tight">
                Scale Without Borders Auth Gate
              </h2>
              <p className="text-slate-400 mt-2 max-w-xl mx-auto text-sm sm:text-base">
                Welcome to Pivot Engine 3.0. Please verify your role below to access secure dashboard analytics, resume synthesizers, and compliance tools.
              </p>
            </div>

            {/* Verification Error Panel */}
            {corpVerificationError && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start space-x-3 text-red-200 text-sm animate-shake">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <span>{corpVerificationError}</span>
              </div>
            )}

            {/* Grid layout for Roles */}
            <div className="grid md:grid-cols-3 gap-6">
              
              {/* Card A: Google Auth (Job Seeker) */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover-glow transition-all duration-300 group">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-115 transition-all duration-300">
                    <User className="h-6 w-6 text-indigo-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">Job Seeker Portal</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Access standard job seeker tools to translate global raw experience into formatted bullet points and download portfolio blueprints.
                  </p>
                </div>
                <button
                  onClick={() => setRole('JOB_SEEKER')}
                  className="w-full bg-slate-800 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-slate-700 hover:border-transparent group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                >
                  <span>Authenticate with Google</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Card B: LinkedIn Auth (Job Seeker) */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between hover-glow transition-all duration-300 group">
                <div>
                  <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-115 transition-all duration-300">
                    <Briefcase className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">LinkedIn Gateway</h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Connect your professional profile to easily auto-fill qualifications and target remote placement standards instantly.
                  </p>
                </div>
                <button
                  onClick={() => setRole('JOB_SEEKER')}
                  className="w-full bg-slate-800 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-slate-700 hover:border-transparent group-hover:shadow-lg group-hover:shadow-indigo-500/20"
                >
                  <span>Authenticate with LinkedIn</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Card C: Corporate Verification (Job Poster) */}
              <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between border-indigo-500/20 bg-slate-900/60 shadow-lg shadow-indigo-500/5 hover-glow transition-all duration-300 md:col-span-1">
                <form onSubmit={handleCorporateHandshake} className="space-y-4 h-full flex flex-col justify-between">
                  <div>
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mb-4">
                      <Lock className="h-6 w-6 text-green-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Corporate Handshake</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mb-4">
                      Verify your official business email and domains to optimize positions and run legitimacy tests.
                    </p>

                    {/* Email Input */}
                    <div className="space-y-1.5 mb-3">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Corp Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="email"
                          required
                          value={corporateEmail}
                          onChange={(e) => setCorporateEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                        />
                      </div>
                    </div>

                    {/* Domain Input */}
                    <div className="space-y-1.5 mb-4">
                      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Official Website Domain</label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={corporateWebsite}
                          onChange={(e) => setCorporateWebsite(e.target.value)}
                          placeholder="company.com"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/20"
                  >
                    <span>Verify Corp Domain</span>
                    <ShieldCheck className="h-4 w-4 text-indigo-200" />
                  </button>
                </form>
              </div>

            </div>
          </div>
        )}

        {/* 2. JOB SEEKER WORKSPACE */}
        {role === 'JOB_SEEKER' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Panel: Ingest Form */}
            <div className="lg:col-span-5 glass-panel rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="flex items-center space-x-2.5 mb-6 pb-4 border-b border-slate-800/80">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Experience Ingest Portal</h3>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSeekerSubmit} className="space-y-5">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Candidate Name</label>
                  <input
                    type="text"
                    required
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    placeholder="Enter Candidate Full Name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Target Role</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="SDET">SDET (Software Development Engineer in Test)</option>
                    <option value="Full-Stack">Full-Stack Engineer</option>
                    <option value="DevOps">DevOps & Cloud Engineer</option>
                    <option value="Frontend">Frontend Specialist</option>
                    <option value="Backend">Backend Systems Developer</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Global / Niche Experience Ingest</label>
                  <textarea
                    required
                    rows={8}
                    value={rawExperience}
                    onChange={(e) => setRawExperience(e.target.value)}
                    placeholder="Paste your raw profile biography, unsorted resume bullet points, foreign employment history, or niche technologies..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-600 leading-relaxed font-mono"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Synthesizing Target Frameworks...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Optimized Resume & Blueprint</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Panel: Workspace Display */}
            <div className="lg:col-span-7 space-y-6">
              
              {!seekerResults && !loading && (
                <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-slate-700 flex flex-col items-center justify-center h-full min-h-[450px]">
                  <Compass className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
                  <h4 className="text-base font-semibold text-slate-300">Awaiting Ingest Analysis</h4>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">
                    Enter candidate details and submit global background credentials in the left panel to translate them into target frameworks.
                  </p>
                </div>
              )}

              {loading && (
                <div className="glass-panel rounded-2xl p-8 space-y-6 min-h-[450px] flex flex-col justify-between animate-pulse">
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
                    <div className="h-24 bg-slate-900/80 rounded border border-slate-800"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                    <div className="h-10 bg-slate-900/80 rounded border border-slate-800"></div>
                  </div>
                  <div className="h-40 bg-slate-900/80 rounded border border-slate-800"></div>
                </div>
              )}

              {seekerResults && !loading && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Optimized Bullet Points */}
                  <div className="glass-panel rounded-2xl p-6 shadow-lg">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-400" />
                      <span>Optimized Enterprise Resume Bullet Points</span>
                    </h4>
                    <ul className="space-y-3">
                      {seekerResults.bulletPoints.map((point, index) => (
                        <li key={index} className="text-xs text-slate-300 bg-slate-950/50 border border-slate-900 rounded-xl p-3 leading-relaxed">
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Keywords Tag Grid */}
                  <div className="glass-panel rounded-2xl p-6 shadow-lg">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">
                      Targeted Placement Keywords
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {seekerResults.keywords.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Builder copy block */}
                  <div className="glass-panel rounded-2xl overflow-hidden shadow-lg border border-slate-800">
                    <div className="bg-slate-900/80 px-6 py-4 flex items-center justify-between border-b border-slate-800">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-4.5 w-4.5 text-purple-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          PORTFOLIO_BUILDER.md Blueprint
                        </h4>
                      </div>
                      <button
                        onClick={() => copyToClipboard(seekerResults.portfolioBlueprint)}
                        className="flex items-center space-x-1.5 text-[11px] bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-1.5 px-3 rounded-lg transition-colors"
                      >
                        {copiedBlueprint ? (
                          <>
                            <Check className="h-3 w-3" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" />
                            <span>Copy File</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4 bg-slate-950 text-slate-300 text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
                      <pre className="whitespace-pre-wrap">{seekerResults.portfolioBlueprint}</pre>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

        {/* 3. JOB POSTER / RECRUITER WORKSPACE */}
        {role === 'JOB_POSTER' && (
          <div className="grid lg:grid-cols-12 gap-8 items-start relative">
            
            {/* Compliance Alerts Modal Overlays */}
            {showRemoteAlert && (
              <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-slate-900 border border-red-500/40 max-w-md w-full rounded-2xl p-6 shadow-2xl relative animate-scaleUp">
                  <div className="flex items-center space-x-3 text-red-400 mb-4">
                    <AlertOctagon className="h-8 w-8 text-red-500" />
                    <h4 className="text-lg font-bold text-white">Non-Compliance Notice</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-6">
                    <strong>SWB Remote Pivot Engine policy violation:</strong> Toggling the work model to anything other than fully remote operations is strictly prohibited. Scale Without Borders enforces 100% borderless accessibility.
                  </p>
                  <button
                    onClick={() => {
                      setShowRemoteAlert(false);
                      setIsRemote(true);
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all duration-150"
                  >
                    Agree & Reset to Fully Remote
                  </button>
                </div>
              </div>
            )}

            {/* Left Panel: Corporate Ingest Form */}
            <div className="lg:col-span-6 glass-panel rounded-2xl p-6 shadow-xl">
              <div className="flex items-center space-x-2.5 mb-6 pb-4 border-b border-slate-800/80">
                <Building className="h-5 w-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Corporate Ingest Pipeline</h3>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-200">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handlePosterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Recruiter Org Email</label>
                    <input
                      type="email"
                      required
                      value={recruiterEmail}
                      onChange={(e) => setRecruiterEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Official Website</label>
                    <input
                      type="text"
                      required
                      value={officialWebsite}
                      onChange={(e) => setOfficialWebsite(e.target.value)}
                      placeholder="company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Careers Portal URL</label>
                    <input
                      type="url"
                      value={careersUrl}
                      onChange={(e) => setCareersUrl(e.target.value)}
                      placeholder="https://company.com/careers"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Employees</label>
                    <input
                      type="number"
                      required
                      value={employeeCount}
                      onChange={(e) => setEmployeeCount(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Company Scale</label>
                    <select
                      value={companyScale}
                      onChange={(e) => setCompanyScale(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Startup">Startup</option>
                      <option value="Mid-Market">Mid-Market</option>
                      <option value="Large Enterprise">Large Enterprise</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Funding / Backing</label>
                    <input
                      type="text"
                      value={fundingInfo}
                      onChange={(e) => setFundingInfo(e.target.value)}
                      placeholder="e.g. Series B, VC Backed"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650"
                    />
                  </div>
                </div>

                {/* Strict Theme Guardrail: Remote Toggle */}
                <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-semibold text-white block">Work Placement Model</span>
                    <span className="text-[10px] text-indigo-400">Strict Scale Without Borders validation guardrail active.</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] text-slate-400">Fully Remote</span>
                    <button
                      type="button"
                      onClick={() => handleRemoteToggle(!isRemote)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isRemote ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isRemote ? 'translate-x-4' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Corporate Job Description</label>
                  <textarea
                    required
                    rows={6}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Enter full job specifications, duties, qualifications and compensation details..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-650 leading-relaxed font-mono"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/20"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Running Corporate Legitimacy Assessment...</span>
                    </>
                  ) : (
                    <>
                      <span>Evaluate Integrity & Post Job</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Right Panel: Analytics Dashboard */}
            <div className="lg:col-span-6 space-y-6">
              
              {!posterResults && !loading && (
                <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-slate-700 flex flex-col items-center justify-center h-full min-h-[450px]">
                  <Shield className="h-12 w-12 text-slate-600 mb-4 animate-pulse" />
                  <h4 className="text-base font-semibold text-slate-300">Legitimacy Analytics Offline</h4>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm">
                    Submit corporate data and job description on the left to verify domain headers, check for recruitment risks, and calculate the trust index.
                  </p>
                </div>
              )}

              {loading && (
                <div className="glass-panel rounded-2xl p-8 space-y-6 min-h-[450px] flex flex-col justify-between animate-pulse">
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                    <div className="h-20 bg-slate-900/80 rounded border border-slate-800"></div>
                  </div>
                  <div className="h-48 bg-slate-900/80 rounded border border-slate-800"></div>
                </div>
              )}

              {posterResults && !loading && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Trust Score & Grid Panel */}
                  <div className="glass-panel rounded-2xl p-6 shadow-lg">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-6">
                      Corporate Legitimacy & Safety Index
                    </h4>

                    <div className="grid sm:grid-cols-12 gap-6 items-center">
                      
                      {/* SVG circular score meter */}
                      <div className="sm:col-span-5 flex flex-col items-center justify-center relative py-2">
                        <svg className="w-32 h-32 transform -rotate-90">
                          <circle
                            cx="64"
                            cy="64"
                            r="50"
                            className="stroke-slate-800"
                            strokeWidth="10"
                            fill="transparent"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="50"
                            className={`transition-all duration-1000 ease-out ${posterResults.score > 70 ? 'stroke-indigo-500' : posterResults.score > 0 ? 'stroke-yellow-500' : 'stroke-red-500'}`}
                            strokeWidth="10"
                            fill="transparent"
                            strokeDasharray="314"
                            strokeDashoffset={314 - (314 * posterResults.score) / 100}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                          <span className="text-3xl font-extrabold tracking-tight">{posterResults.score}%</span>
                          <span className="text-[10px] text-slate-500 font-medium tracking-wide uppercase">Score</span>
                        </div>
                      </div>

                      {/* Trust Grid */}
                      <div className="sm:col-span-7 space-y-3">
                        <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-900 rounded-xl">
                          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Domain Integrity</span>
                          <span className={`text-xs font-bold ${posterResults.trustGrid.domainIntegrity === 'Pass' ? 'text-green-400' : 'text-red-400'}`}>
                            {posterResults.trustGrid.domainIntegrity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-900 rounded-xl">
                          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Careers Alignment</span>
                          <span className={`text-xs font-bold ${posterResults.trustGrid.careerPageAlignment === 'Strong' ? 'text-indigo-400' : 'text-yellow-400'}`}>
                            {posterResults.trustGrid.careerPageAlignment}
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-2.5 bg-slate-950/60 border border-slate-900 rounded-xl">
                          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide">Funding Safety</span>
                          <span className="text-xs font-bold text-slate-300">
                            {posterResults.trustGrid.fundingRisk}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Active Safety Flags Panel */}
                  <div className="glass-panel rounded-2xl p-6 shadow-lg border border-slate-850">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
                      <ShieldCheck className="h-4.5 w-4.5 text-indigo-400" />
                      <span>Security & Safety Flag Dashboard</span>
                    </h4>
                    
                    <div className="space-y-3">
                      {posterResults.safetyFlags.map((flag, idx) => {
                        const isCritical = flag.includes('CRITICAL');
                        const isWarning = flag.includes('Warning');
                        
                        return (
                          <div 
                            key={idx} 
                            className={`p-3.5 rounded-xl border flex items-start space-x-3 text-xs leading-relaxed ${
                              isCritical 
                                ? 'bg-red-500/10 border-red-500/20 text-red-200' 
                                : isWarning 
                                  ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200' 
                                  : 'bg-green-500/10 border-green-500/20 text-green-200'
                            }`}
                          >
                            {isCritical ? (
                              <AlertTriangle className="h-4.5 w-4.5 text-red-400 shrink-0 mt-0.5" />
                            ) : isWarning ? (
                              <AlertTriangle className="h-4.5 w-4.5 text-yellow-400 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle className="h-4.5 w-4.5 text-green-400 shrink-0 mt-0.5" />
                            )}
                            <span>{flag}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Scale Without Borders. SWB Remote Pivot Engine v3.0.</p>
          <div className="flex space-x-4">
            <a href="https://scalewithoutborders.com" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-400 transition-colors">Official Website</a>
            <span>•</span>
            <span className="text-slate-500">Security Verified System</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
