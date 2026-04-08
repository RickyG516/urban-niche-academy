/**
 * ============================================
 * URBAN NICHE ACADEMY — Google Apps Script Backend
 * ============================================
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project named "Urban Niche Academy Backend"
 * 3. Paste this entire file into Code.gs
 * 4. Create a Google Sheet with these tabs:
 *    - "Candidates" (application data)
 *    - "Assessments" (assessment responses & scores)
 *    - "Training" (module definitions)
 *    - "Config" (system settings)
 * 5. Update the SPREADSHEET_ID below with your Sheet ID
 * 6. Deploy as Web App (Execute as: Me, Access: Anyone)
 * 7. Copy the deployment URL into index.html API.BASE_URL
 *
 * SHEET COLUMN STRUCTURE:
 *
 * Candidates tab:
 * A: ID | B: Name | C: Email | D: Phone | E: Applied Date
 * F: Stage | G: Software Score | H: Comms Score | I: Composite
 * J: Interview Date | K: Notes | L: Token
 *
 * Assessments tab:
 * A: Candidate ID | B: Assessment Type | C: Question # | D: Answer
 * E: Correct | F: Points | G: Timestamp
 *
 * Training tab:
 * A: Module ID | B: Title | C: Description | D: Icon | E: Lessons Count
 * F: Video URLs (comma-separated) | G: Required | H: Order
 *
 * Config tab:
 * A: Key | B: Value
 * (e.g., passing_threshold | 70)
 */

// ============================================
// CONFIGURATION
// ============================================
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID_HERE';

function getSheet(tabName) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(tabName);
}

// ============================================
// WEB APP ENTRY POINTS
// ============================================

/**
 * Handle GET requests (fetch data)
 */
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getCandidates':
        result = getCandidates();
        break;
      case 'getCandidate':
        result = getCandidate(e.parameter.id);
        break;
      case 'getScores':
        result = getScores(e.parameter.candidateId);
        break;
      case 'getTrainingModules':
        result = getTrainingModules();
        break;
      case 'getConfig':
        result = getConfig();
        break;
      case 'getPipelineStats':
        result = getPipelineStats();
        break;
      case 'getCandidateByToken':
        result = getCandidateByToken(e.parameter.token);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle POST requests (submit data)
 */
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  let result;

  try {
    switch (action) {
      case 'submitApplication':
        result = submitApplication(data);
        break;
      case 'submitAssessment':
        result = submitAssessment(data);
        break;
      case 'submitCandidateAssessment':
        result = submitCandidateAssessment(data);
        break;
      case 'updateStage':
        result = updateCandidateStage(data.candidateId, data.stage);
        break;
      case 'updateConfig':
        result = updateConfig(data.key, data.value);
        break;
      default:
        result = { error: 'Unknown action: ' + action };
    }
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// CANDIDATE FUNCTIONS
// ============================================

function getCandidates() {
  const sheet = getSheet('Candidates');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const candidates = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) { // Has an ID
      candidates.push({
        id: row[0],
        name: row[1],
        email: row[2],
        phone: row[3],
        appliedDate: row[4],
        stage: row[5],
        softwareScore: row[6],
        commsScore: row[7],
        composite: row[8],
        interviewDate: row[9],
        notes: row[10]
      });
    }
  }

  return { success: true, candidates: candidates };
}

function getCandidate(id) {
  const candidates = getCandidates().candidates;
  const candidate = candidates.find(c => c.id === id);
  return candidate ? { success: true, candidate } : { error: 'Candidate not found' };
}

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 24; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function getCandidateByToken(token) {
  if (!token) return { error: 'No token provided' };
  const sheet = getSheet('Candidates');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][11] === token) { // Column L = Token
      return {
        success: true,
        candidate: {
          id: data[i][0],
          name: data[i][1],
          email: data[i][2],
          stage: data[i][5],
          softwareScore: data[i][6] || null,
          commsScore: data[i][7] || null,
          composite: data[i][8] || null
        }
      };
    }
  }

  return { error: 'Invalid or expired token' };
}

function submitCandidateAssessment(data) {
  // Validate token first
  const candidate = getCandidateByToken(data.token);
  if (candidate.error) return candidate;

  const candidateId = candidate.candidate.id;

  // Submit software assessment
  if (data.softwareAnswers && data.softwareAnswers.length > 0) {
    submitAssessment({
      candidateId: candidateId,
      type: 'software',
      answers: data.softwareAnswers.map((ans, idx) => ({ question: idx + 1, answer: ans }))
    });
  }

  // Submit comms assessment
  if (data.commsAnswers && data.commsAnswers.length > 0) {
    submitAssessment({
      candidateId: candidateId,
      type: 'comms',
      answers: data.commsAnswers.map((ans, idx) => ({ question: idx + 1, answer: ans }))
    });
  }

  // Update stage to Assessment complete (move to Interview if passed)
  const updatedCandidate = getCandidateByToken(data.token);

  return {
    success: true,
    message: 'Assessment submitted successfully',
    candidateId: candidateId,
    stage: updatedCandidate.candidate ? updatedCandidate.candidate.stage : 'Assessment'
  };
}

function submitApplication(data) {
  const sheet = getSheet('Candidates');
  const id = 'UNC-' + Date.now().toString(36).toUpperCase();
  const token = generateToken();
  const now = new Date().toISOString();

  sheet.appendRow([
    id,
    data.name,
    data.email,
    data.phone || '',
    now,
    'Applied',
    '', // software score
    '', // comms score
    '', // composite
    '', // interview date
    '',  // notes
    token // assessment token
  ]);

  // Send confirmation email + assessment link
  try {
    sendApplicationConfirmation(data.email, data.name, id);
    sendAssessmentLink(data.email, data.name, id, token);
  } catch (e) {
    console.log('Email send failed: ' + e.message);
  }

  return { success: true, candidateId: id, token: token, message: 'Application received' };
}

function updateCandidateStage(candidateId, newStage) {
  const sheet = getSheet('Candidates');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      sheet.getRange(i + 1, 6).setValue(newStage); // Column F = Stage
      return { success: true, message: 'Stage updated to ' + newStage };
    }
  }

  return { error: 'Candidate not found' };
}

// ============================================
// ASSESSMENT FUNCTIONS
// ============================================

/**
 * Answer keys for auto-scoring
 * Format: { questionNumber: correctAnswerIndex (0-based) }
 */
const ANSWER_KEYS = {
  software: {
    1: 1,  // WPForms — for building/embedding custom forms
    2: 2,  // Zapier — connects form submission to email trigger
    3: 1,  // Google Docs — real-time team collaboration on proposals/docs
    4: 2,  // ManyChat — instant messaging marketing & chatbot automation
    5: 1,  // Stripe — processes payments and invoices
    6: 1,  // Claude AI — AI assistant for drafting content, brainstorming, research
    7: 1,  // CRM — system to track leads, follow-ups, client relationships
    8: 1,  // WordPress — website platform most contractor sites are built on
    9: 0,  // Social Media — build local trust and showcase work (before/after)
    10: 1  // SEO — Search Engine Optimization, rank higher on Google
  },
  comms: {
    // Comms uses weighted scoring, not simple right/wrong
    // These are the BEST answer indices (score=10)
    1: 1,  // Acknowledge frustration, ask what went wrong, explain difference
    2: 2,  // Apologize for timing, ask for better time, follow up
    3: 1,  // Acknowledge referrals are great, explore slow season gaps
    4: 1,  // Stay calm, don't take it personally, ask what made them feel that way
    5: 2,  // Brief non-pushy follow-up with value offer
    6: 1,  // Explain value, ask what cheaper option promises
    7: 1,  // Remind of timeline, show work done, reset expectations with 90-day roadmap
    8: 2,  // Acknowledge don't know, offer to find out, redirect to their needs
    9: 1,  // Compliment, explain who you help, ask qualifying question
    10: 1  // Ask what specific concerns, address directly, give clear next step
  }
};

/**
 * Weighted scoring for communication questions
 * Some answers get partial credit
 */
const COMMS_WEIGHTS = {
  // [option0_score, option1_score, option2_score, option3_score]
  1: [0, 10, 2, 0],   // Burned by agencies — acknowledge + differentiate
  2: [0, 2, 10, 0],   // Cold call annoyed — apologize, ask for better time
  3: [2, 10, 0, 3],   // Referrals objection — acknowledge + explore gaps
  4: [0, 10, 0, 3],   // Rude prospect — stay calm, ask what's wrong
  5: [3, 0, 10, 0],   // Lead goes cold — non-pushy follow-up with value
  6: [0, 10, 0, 2],   // Price objection — explain value vs price
  7: [0, 10, 2, 0],   // Cancel after 30 days — show work, reset expectations
  8: [0, 2, 10, 0],   // Technical question — honest + redirect
  9: [2, 10, 0, 1],   // Skeptical DM — compliment, explain, qualify
  10: [0, 10, 2, 3]   // "Need to think about it" — address specific concerns
};

function submitAssessment(data) {
  const sheet = getSheet('Assessments');
  const candidateId = data.candidateId;
  const type = data.type; // 'software' or 'comms'
  const answers = data.answers; // Array of { question: #, answer: index }
  const answerKey = ANSWER_KEYS[type];

  let correctCount = 0;
  let totalPoints = 0;
  let maxPoints = answers.length * 10;

  answers.forEach(a => {
    const isCorrect = answerKey[a.question] === a.answer;
    let points = 0;

    if (type === 'comms' && COMMS_WEIGHTS[a.question]) {
      // Weighted scoring for communication
      points = COMMS_WEIGHTS[a.question][a.answer] || 0;
    } else {
      // Binary scoring for software knowledge
      points = isCorrect ? 10 : 0;
    }

    if (isCorrect) correctCount++;
    totalPoints += points;

    // Log each answer
    sheet.appendRow([
      candidateId,
      type,
      a.question,
      a.answer,
      isCorrect,
      points,
      new Date().toISOString()
    ]);
  });

  const scorePercent = Math.round((totalPoints / maxPoints) * 100);

  // Update candidate's score in the Candidates sheet
  updateCandidateScore(candidateId, type, scorePercent);

  return {
    success: true,
    type: type,
    score: scorePercent,
    correct: correctCount,
    total: answers.length,
    points: totalPoints,
    maxPoints: maxPoints
  };
}

function updateCandidateScore(candidateId, type, score) {
  const sheet = getSheet('Candidates');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      const row = i + 1;

      if (type === 'software') {
        sheet.getRange(row, 7).setValue(score); // Column G
      } else if (type === 'comms') {
        sheet.getRange(row, 8).setValue(score); // Column H
      }

      // Recalculate composite if both scores exist
      const softwareScore = type === 'software' ? score : data[i][6];
      const commsScore = type === 'comms' ? score : data[i][7];

      if (softwareScore && commsScore) {
        // 50/50 weight — adjust as needed
        const composite = Math.round((softwareScore * 0.5) + (commsScore * 0.5));
        sheet.getRange(row, 9).setValue(composite); // Column I

        // Auto-advance stage if passed
        const config = getConfig();
        const threshold = parseInt(config.passing_threshold) || 70;
        if (composite >= threshold && data[i][5] === 'Assessment') {
          sheet.getRange(row, 6).setValue('Interview'); // Auto-advance
        }
      }

      break;
    }
  }
}

function getScores(candidateId) {
  const sheet = getSheet('Candidates');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === candidateId) {
      return {
        success: true,
        scores: {
          software: data[i][6] || null,
          comms: data[i][7] || null,
          composite: data[i][8] || null
        }
      };
    }
  }

  return { error: 'Candidate not found' };
}

// ============================================
// TRAINING MODULE FUNCTIONS
// ============================================

function getTrainingModules() {
  const sheet = getSheet('Training');
  const data = sheet.getDataRange().getValues();
  const modules = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[0]) {
      modules.push({
        id: row[0],
        title: row[1],
        description: row[2],
        icon: row[3],
        lessonsCount: row[4],
        videoUrls: row[5] ? row[5].split(',').map(u => u.trim()) : [],
        required: row[6] === true || row[6] === 'TRUE',
        order: row[7]
      });
    }
  }

  modules.sort((a, b) => a.order - b.order);
  return { success: true, modules: modules };
}

// ============================================
// CONFIG & STATS
// ============================================

function getConfig() {
  const sheet = getSheet('Config');
  const data = sheet.getDataRange().getValues();
  const config = {};

  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      config[data[i][0]] = data[i][1];
    }
  }

  return config;
}

function updateConfig(key, value) {
  const sheet = getSheet('Config');
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(value);
      return { success: true, message: key + ' updated' };
    }
  }

  // Key doesn't exist, add it
  sheet.appendRow([key, value]);
  return { success: true, message: key + ' created' };
}

function getPipelineStats() {
  const candidates = getCandidates().candidates;
  const stats = {
    total: candidates.length,
    applied: 0,
    assessment: 0,
    interview: 0,
    onboarding: 0,
    trained: 0,
    avgScore: 0
  };

  let scoreSum = 0;
  let scoreCount = 0;

  candidates.forEach(c => {
    const stage = (c.stage || '').toLowerCase();
    if (stage === 'applied') stats.applied++;
    else if (stage === 'assessment') stats.assessment++;
    else if (stage === 'interview') stats.interview++;
    else if (stage === 'onboarding') stats.onboarding++;
    else if (stage === 'trained') stats.trained++;

    if (c.composite) {
      scoreSum += c.composite;
      scoreCount++;
    }
  });

  stats.avgScore = scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0;

  return { success: true, stats: stats };
}

// ============================================
// EMAIL AUTOMATION
// ============================================

function sendApplicationConfirmation(email, name, candidateId) {
  const subject = 'Urban Niche Academy — Application Received';
  const body = `Hi ${name},

Thank you for applying to join the Urban Niche Co. sales team!

Your application has been received and your candidate ID is: ${candidateId}

Next Steps:
1. You'll receive a link to complete your assessment within 24 hours
2. The assessment includes a software knowledge test and a communication scenarios test
3. Results are scored automatically — aim for 70% or higher to advance
4. If you pass, you'll be invited to schedule an interview via Google Meet

We're looking for driven, coachable people who want to grow. If that's you, we'll see you on the other side.

— Urban Niche Co. Team
urbannicheco.com`;

  GmailApp.sendEmail(email, subject, body);
}

function sendAssessmentLink(email, name, candidateId, token) {
  const config = getConfig();
  const baseUrl = config.academy_url || 'https://yourusername.github.io/urban-niche-academy';
  const assessmentUrl = baseUrl + '/candidate.html?token=' + token + '&name=' + encodeURIComponent(name);
  const subject = 'Urban Niche Academy — Your Assessment is Ready';
  const body = `Hi ${name},

Your assessment is ready. Click the link below to begin:

${assessmentUrl}

Important:
- The software knowledge section is timed (25 minutes)
- The communication section is untimed but be thoughtful
- You need a 70% composite score to advance to interview
- You can only take the assessment once

Good luck!

— Urban Niche Co. Team`;

  GmailApp.sendEmail(email, subject, body);
}

function sendInterviewInvite(email, name, interviewDate, meetLink) {
  const subject = 'Urban Niche Academy — Interview Scheduled';
  const body = `Hi ${name},

Congratulations on passing your assessment! You've been invited to a final interview.

Date: ${interviewDate}
Format: Google Meet Video Call
Link: ${meetLink}

This will be a conversation with the founder about your goals, experience, and fit for the team. Be yourself, be prepared, and bring your energy.

See you there.

— Ricky Garner
Founder, Urban Niche Co.`;

  GmailApp.sendEmail(email, subject, body);
}

// ============================================
// UTILITY: Setup initial sheet structure
// Run this once to create the tab headers
// ============================================

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Candidates tab
  let sheet = ss.getSheetByName('Candidates');
  if (!sheet) sheet = ss.insertSheet('Candidates');
  sheet.getRange(1, 1, 1, 12).setValues([[
    'ID', 'Name', 'Email', 'Phone', 'Applied Date',
    'Stage', 'Software Score', 'Comms Score', 'Composite',
    'Interview Date', 'Notes', 'Token'
  ]]);

  // Assessments tab
  sheet = ss.getSheetByName('Assessments');
  if (!sheet) sheet = ss.insertSheet('Assessments');
  sheet.getRange(1, 1, 1, 7).setValues([[
    'Candidate ID', 'Assessment Type', 'Question #', 'Answer',
    'Correct', 'Points', 'Timestamp'
  ]]);

  // Training tab
  sheet = ss.getSheetByName('Training');
  if (!sheet) sheet = ss.insertSheet('Training');
  sheet.getRange(1, 1, 1, 8).setValues([[
    'Module ID', 'Title', 'Description', 'Icon', 'Lessons Count',
    'Video URLs', 'Required', 'Order'
  ]]);

  // Config tab
  sheet = ss.getSheetByName('Config');
  if (!sheet) sheet = ss.insertSheet('Config');
  sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
  sheet.appendRow(['passing_threshold', '70']);
  sheet.appendRow(['assessment_time_limit', '25']);
  sheet.appendRow(['company_name', 'Urban Niche Co.']);
  sheet.appendRow(['academy_url', 'https://yourusername.github.io/urban-niche-academy']);

  return 'Sheets setup complete!';
}
