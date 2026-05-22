import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// MongoDB Connection & Transaction Schema
// ----------------------------------------------------
let MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/swb-pivot';
if (process.env.TEST_DB_PASSWORD) {
  MONGODB_URI = MONGODB_URI
    .replace('<TEST_DB_PASSWORD>', process.env.TEST_DB_PASSWORD)
    .replace('<db_password>', process.env.TEST_DB_PASSWORD);
}

let dbConnected = false;

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB successfully connected.');
    dbConnected = true;
  })
  .catch((err) => {
    console.warn('\n⚠️ WARNING: Could not connect to MongoDB database:', err.message);
    console.warn('Running server with local transaction logging fallback enabled.\n');
  });

const PivotTransactionSchema = new mongoose.Schema({
  userRole: { type: String, required: true },
  targetRole: String,
  rawExperience: String,
  companyMetadata: {
    companyName: String,
    orgEmail: String,
    orgWebsite: String,
    careersPageUrl: String,
    employeeCount: Number,
    companyScale: String,
    fundingInfo: String
  },
  seekerData: {
    bulletPoints: [String],
    keywords: [String],
    portfolioBlueprint: String
  },
  posterData: {
    score: Number,
    trustGrid: {
      domainIntegrity: String,
      careerPageAlignment: String,
      fundingRisk: String
    },
    safetyFlags: [String]
  },
  timestamp: { type: Date, default: Date.now }
});

const PivotTransaction = mongoose.model('PivotTransaction', PivotTransactionSchema);

// Memory database for logging fallback if Mongo isn't running
const memoryDbLog = [];

// Initialize OpenAI Client (supporting both OpenAI and Gemini keys via OpenAI-compatible endpoint)
const useGemini = !!process.env.GEMINI_API_KEY;
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || 'MOCK_KEY',
  baseURL: useGemini ? 'https://generativelanguage.googleapis.com/v1beta/openai/' : undefined
});
const MODEL_NAME = useGemini ? 'gemini-1.5-flash' : 'gpt-4o-mini';

// ----------------------------------------------------
// SYSTEM PROMPTS (A & B)
// ----------------------------------------------------

const SYSTEM_PROMPT_PART_A = `
You are an expert talent optimization engine matching qualifications with international remote recruitment standards.
You will receive raw experience text and a target engineering role.
Generate:
1. Three optimized, metrics-driven resume bullet points starting with strong action verbs.
2. A list of 6-10 targeted engineering keywords relevant to the role.
3. A copyable markdown blueprint called "PORTFOLIO_BUILDER.md" guiding the candidate to build projects that validate their remote capability.

Return a JSON object matches this format:
{
  "bulletPoints": ["point 1", "point 2", "point 3"],
  "keywords": ["kw1", "kw2", ...],
  "portfolioBlueprint": "# PORTFOLIO_BUILDER.md\\n\\n..."
}
`;

const SYSTEM_PROMPT_PART_B = `
You are a corporate integrity and remote placement safety auditor.
Assess corporate legitimacy based on metadata and job details. Return an integrity index score from 0-100.
Evaluate domains, career portal alignment, employee scale, funding stages, and security warning signs.

Note:
- Gmail, Yahoo, or generic public email domains trigger circuit breakers: score drops to 0% immediately.
- Requests for upfront registration, tooling, device purchasing, or placement fees trigger circuit breakers: score drops to 0% immediately.

Return a JSON object matching this format:
{
  "score": 85,
  "trustGrid": {
    "domainIntegrity": "Pass" | "Fail",
    "careerPageAlignment": "Strong" | "Muted" | "Weak",
    "fundingRisk": "Low" | "Medium" | "High"
  },
  "safetyFlags": ["flag 1", "flag 2"]
}
`;

// ----------------------------------------------------
// UNIFIED POST ENDPOINT
// ----------------------------------------------------
app.post('/api/pivot', async (req, res) => {
  try {
    const { userRole, targetRole, rawExperience, companyMetadata } = req.body;

    if (!userRole) {
      return res.status(400).json({ error: 'Missing userRole configuration.' });
    }

    let seekerData = null;
    let posterData = null;

    const useRealLLM = (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'MOCK_KEY') || !!process.env.GEMINI_API_KEY;

    if (userRole === 'JOB_SEEKER') {
      // ------------------------------------------------
      // PART A: Resume Translation Pipeline
      // ------------------------------------------------
      if (useRealLLM) {
        try {
          const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT_PART_A },
              { role: 'user', content: `Target Role: ${targetRole}\nRaw Experience:\n${rawExperience}` }
            ],
            response_format: { type: 'json_object' }
          });
          seekerData = JSON.parse(completion.choices[0].message.content);
        } catch (openaiErr) {
          console.error('OpenAI Part A failed, using local rules generator fallback:', openaiErr);
          seekerData = generateLocalSeekerFallback(targetRole, rawExperience);
        }
      } else {
        seekerData = generateLocalSeekerFallback(targetRole, rawExperience);
      }

    } else if (userRole === 'JOB_POSTER') {
      // ------------------------------------------------
      // PART B: Recruiter Legitimacy Assessment
      // ------------------------------------------------
      const { companyName, orgEmail, orgWebsite, careersPageUrl, employeeCount, companyScale, fundingInfo } = companyMetadata || {};

      // Local Circuit Breaker Check Rules
      const publicEmailDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com'];
      const feeKeywords = ['fee', 'deposit', 'upfront', 'payment', 'buy equipment', 'training cost', 'application fee', 'upfront fee', 'charge'];

      const emailDomain = orgEmail ? orgEmail.split('@')[1]?.toLowerCase().trim() : '';
      const websiteDomain = orgWebsite ? orgWebsite.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].trim() : '';

      const isGmail = publicEmailDomains.includes(emailDomain);
      const hasUpfrontFees = feeKeywords.some(keyword => 
        (rawExperience || '').toLowerCase().includes(keyword) || 
        (companyName || '').toLowerCase().includes(keyword)
      );

      let finalScore = 95;
      let domainIntegrity = 'Pass';
      let careerPageAlignment = careersPageUrl ? 'Strong' : 'Weak';
      let fundingRisk = fundingInfo ? 'Low' : 'Medium';
      const safetyFlags = [];

      // Circuit Breakers
      if (isGmail) {
        finalScore = 0;
        domainIntegrity = 'Fail';
        safetyFlags.push('CRITICAL: Access blocked due to generic domain registration (@gmail.com / @yahoo.com).');
      }

      if (hasUpfrontFees) {
        finalScore = 0;
        safetyFlags.push('CRITICAL: High-risk security breach. Upfront placement, registration, or tooling fees mentioned.');
      }

      // Check alignment
      if (emailDomain && websiteDomain && emailDomain !== websiteDomain) {
        safetyFlags.push(`Warning: Recruiter domain (@${emailDomain}) does not align with website domain (${websiteDomain}).`);
        domainIntegrity = 'Fail';
        if (finalScore > 0) finalScore -= 25;
      }

      if (employeeCount < 5) {
        safetyFlags.push('Warning: Registered employee count is extremely low. Registry audit recommended.');
        if (finalScore > 0) finalScore -= 10;
      }

      if (!careersPageUrl) {
        if (finalScore > 0) finalScore -= 15;
      }

      if (!fundingInfo) {
        if (finalScore > 0) finalScore -= 10;
      }

      if (finalScore < 0) finalScore = 0;

      if (useRealLLM && finalScore > 0) {
        try {
          const completion = await openai.chat.completions.create({
            model: MODEL_NAME,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT_PART_B },
              { role: 'user', content: `Company: ${companyName}\nEmail: ${orgEmail}\nWebsite: ${orgWebsite}\nCareers: ${careersPageUrl}\nSize: ${employeeCount}\nScale: ${companyScale}\nFunding: ${fundingInfo}\nJob description:\n${rawExperience}` }
            ],
            response_format: { type: 'json_object' }
          });
          const llmAssessment = JSON.parse(completion.choices[0].message.content);
          
          // Merge LLM score and grids with local circuit breakers
          posterData = {
            score: llmAssessment.score !== undefined ? Math.min(llmAssessment.score, finalScore) : finalScore,
            trustGrid: {
              domainIntegrity: domainIntegrity === 'Fail' ? 'Fail' : (llmAssessment.trustGrid?.domainIntegrity || 'Pass'),
              careerPageAlignment: llmAssessment.trustGrid?.careerPageAlignment || careerPageAlignment,
              fundingRisk: llmAssessment.trustGrid?.fundingRisk || fundingRisk
            },
            safetyFlags: [...new Set([...safetyFlags, ...(llmAssessment.safetyFlags || [])])]
          };
        } catch (openaiErr) {
          console.error('OpenAI Part B failed, using local rules generator fallback:', openaiErr);
          posterData = {
            score: finalScore,
            trustGrid: { domainIntegrity, careerPageAlignment, fundingRisk },
            safetyFlags: safetyFlags.length > 0 ? safetyFlags : ['No critical safety flags detected. Domain validated.']
          };
        }
      } else {
        posterData = {
          score: finalScore,
          trustGrid: { domainIntegrity, careerPageAlignment, fundingRisk },
          safetyFlags: safetyFlags.length > 0 ? safetyFlags : ['No critical safety flags detected. Domain validated.']
        };
      }
    }

    // ------------------------------------------------
    // Logging Transactions (MongoDB / local fallback)
    // ------------------------------------------------
    const transactionRecord = {
      userRole,
      targetRole,
      rawExperience,
      companyMetadata,
      seekerData,
      posterData,
      timestamp: new Date()
    };

    if (dbConnected) {
      try {
        await PivotTransaction.create(transactionRecord);
      } catch (logErr) {
        console.error('Failed logging transaction to MongoDB:', logErr);
      }
    } else {
      memoryDbLog.push(transactionRecord);
      console.log(`[Logged to Local Memory] Transaction recorded for role: ${userRole}. Total stored logs: ${memoryDbLog.length}`);
    }

    // Return combined result payload
    return res.status(200).json({
      success: true,
      seekerData,
      posterData
    });

  } catch (err) {
    console.error('Express gateway pipeline exception:', err);
    return res.status(500).json({ error: 'Server gateway error. Please try again.' });
  }
});

// ----------------------------------------------------
// LOCAL FALLBACK BUILDERS
// ----------------------------------------------------
function generateLocalSeekerFallback(targetRole, rawExperience) {
  const cleanExp = rawExperience.substring(0, 150).replace(/[\r\n]+/g, ' ');
  return {
    bulletPoints: [
      `Designed and deployed modular automation components tailored for ${targetRole} ecosystems, incorporating insights from background experience: "${cleanExp}..."`,
      `Engineered scalable telemetry protocols and container state integrations, reducing testing deployment downtime by 30%.`,
      `Optimized continuous integration pipelines (CI/CD) and remote coordination hooks, standardizing team performance across distributed timezones.`
    ],
    keywords: [
      targetRole,
      'Continuous Integration',
      'Docker Containers',
      'Kubernetes',
      'Test Orchestration',
      'TypeScript/JavaScript',
      'Global Remote Operations',
      'API Security Validation'
    ],
    portfolioBlueprint: `# PORTFOLIO_BUILDER.md\n\n## Autonomous Engineering Blueprint - ${targetRole}\n\n### Objective\nValidate engineering capabilities for remote placement platforms through automated testing & environment orchestration.\n\n### Section 1: Git and Standards Setup\n- Create a public git repository.\n- Configure strict TypeScript standards and linter checks.\n\n### Section 2: Environment Mocking & Routing\n- Build a RESTful mock service simulating remote backend payloads.\n- Inject automated test suites to validate boundary limits.\n\n### Section 3: Telemetry & Orchestration\n- Dockerize the application stack.\n- Configure a GitHub actions pipeline to compile and run tests on every repository check-in.`
  };
}

// ----------------------------------------------------
// START SERVER
// ----------------------------------------------------
app.listen(PORT, () => {
  console.log(`----------------------------------------------------`);
  console.log(`SWB Remote Pivot Engine 3.0 server running on port ${PORT}`);
  console.log(`API Endpoint ready at: http://localhost:${PORT}/api/pivot`);
  console.log(`----------------------------------------------------`);
});
