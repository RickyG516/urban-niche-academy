# Urban Niche Academy — Deployment & Go-Live Guide

## Quick Start (5 minutes to live)

### Option A: GitHub Pages (Free, Recommended)

1. **Create a GitHub account** at github.com (if you don't have one)
2. **Create a new repository** named `urban-niche-academy`
3. **Upload `index.html`** to the repository root
4. **Go to Settings → Pages**
5. **Source:** Deploy from a branch → `main` → `/ (root)` → Save
6. **Your app will be live** at: `https://yourusername.github.io/urban-niche-academy/`

### Option B: Custom Domain (Optional)

After GitHub Pages is set up:
1. Go to Settings → Pages → Custom domain
2. Enter: `academy.urbannicheco.com` (or whatever subdomain you want)
3. In your domain registrar (GoDaddy, Namecheap, etc.), add a CNAME record:
   - Name: `academy`
   - Value: `yourusername.github.io`
4. Wait 15-30 minutes for DNS propagation
5. Check "Enforce HTTPS" in GitHub Pages settings

---

## Google Apps Script Backend Setup

### Step 1: Create the Google Sheet

1. Go to sheets.google.com → Create new spreadsheet
2. Name it: **Urban Niche Academy**
3. Copy the Sheet ID from the URL (the long string between `/d/` and `/edit`)

### Step 2: Set Up Apps Script

1. Go to script.google.com → New Project
2. Name it: **Urban Niche Academy Backend**
3. Delete the default code and paste the contents of `google-apps-script-backend.js`
4. Replace `YOUR_SPREADSHEET_ID_HERE` with your Sheet ID
5. Click **Run → setupSheets** (this creates all your tabs with headers)
6. Authorize when prompted (it will ask for Sheets + Gmail permissions)

### Step 3: Deploy as Web App

1. Click **Deploy → New deployment**
2. Type: **Web app**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Click **Deploy**
6. Copy the Web App URL
7. In `index.html`, find `YOUR_GOOGLE_APPS_SCRIPT_URL` and replace with this URL

### Step 4: Test the Backend

Open this URL in your browser (replace with your actual URL):
```
YOUR_APPS_SCRIPT_URL?action=getCandidates
```
You should see: `{"success":true,"candidates":[]}`

---

## WPForms Application Setup

### Create the Application Form

In WordPress → WPForms → Add New:

**Fields to add:**
- Full Name (required)
- Email Address (required)
- Phone Number
- "Why do you want to join Urban Niche Co.?" (Paragraph text)
- "Previous sales experience" (Dropdown: None, 1-2 years, 3-5 years, 5+ years)
- "How did you hear about us?" (Dropdown: Social Media, Referral, Job Board, Google Search, Other)

**Embed on your careers page:** urbannicheco.com/careers

---

## Zapier Automations

### Zap 1: WPForms → Google Sheets

- **Trigger:** WPForms → New Form Entry
- **Action:** Google Sheets → Create Spreadsheet Row
- **Mapping:**
  - Column A (ID): Leave blank (Apps Script generates it) OR use Zapier formatter to create one
  - Column B (Name): {{Full Name}}
  - Column C (Email): {{Email Address}}
  - Column D (Phone): {{Phone Number}}
  - Column F (Stage): Set to "Applied" (static text)

### Zap 2: New Candidate → Confirmation Email

- **Trigger:** Google Sheets → New Row in Candidates tab
- **Action:** Gmail → Send Email
- **To:** {{Column C}} (email)
- **Subject:** Welcome to Urban Niche Academy — Your Application is Received
- **Body:**
```
Hi {{Column B}},

Thank you for applying to join the Urban Niche Co. sales team!

Next Steps:
1. You'll receive an assessment link within 24 hours
2. The assessment includes a software knowledge test and communication scenarios
3. Score 70% or higher to advance to the interview stage

We're looking for driven, coachable people. If that's you, we'll see you on the other side.

— Urban Niche Co. Team
```

---

## Google Calendar Interview Scheduling

1. Go to **calendar.google.com**
2. Click **Settings (gear) → Appointment Schedules** (or create via the + button)
3. Create new schedule:
   - **Title:** Urban Niche Co. — Sales Team Interview
   - **Duration:** 30 minutes
   - **Available hours:** Your preferred times (e.g., 10 AM - 4 PM CT)
   - **Available days:** Mon-Fri
   - **Location:** Google Meet (auto-generates link)
   - **Buffer time:** 15 minutes between appointments
4. **Copy the booking page link**
5. In `index.html`, find `CALENDAR_BOOKING_URL` and replace with your booking link

---

## Go-Live Checklist

### Before Launch
- [ ] GitHub Pages is live and loading correctly
- [ ] Custom domain configured (optional)
- [ ] Google Sheet created with all 4 tabs (Candidates, Assessments, Training, Config)
- [ ] Apps Script deployed and URL updated in index.html
- [ ] WPForms application form created and embedded on /careers
- [ ] Zapier Zap 1 active (WPForms → Sheets)
- [ ] Zapier Zap 2 active (Sheets → Gmail)
- [ ] Google Calendar appointment schedule created
- [ ] Calendar booking URL updated in index.html
- [ ] Test: Submit a test application through WPForms
- [ ] Test: Verify it appears in Google Sheet
- [ ] Test: Verify confirmation email was sent
- [ ] Test: Walk through assessment in the app
- [ ] Test: Check score displays correctly
- [ ] Test: Open candidate modal and test interview scheduler

### After Launch
- [ ] Share careers page link on social media
- [ ] Post job listing on Indeed/LinkedIn with link to urbannicheco.com/careers
- [ ] Monitor Google Sheet for incoming applications
- [ ] Review first batch of assessment scores
- [ ] Conduct first interviews via Google Meet
- [ ] Begin onboarding first reps through Training Hub
- [ ] Add video content to training modules (YouTube/Loom URLs)

---

## File Reference

| File | Purpose |
|------|---------|
| `index.html` | The complete Urban Niche Academy web app (single file, self-contained) |
| `candidate.html` | Candidate-facing assessment portal (unique link per applicant) |
| `google-apps-script-backend.js` | Backend code for Google Apps Script (paste into script.google.com) |
| `DEPLOYMENT-GUIDE.md` | This guide |

---

## Architecture Overview

```
[Candidate] → urbannicheco.com/careers (WPForms)
                     ↓
              [Zapier] → Google Sheets (Candidates tab)
                     ↓
              [Zapier] → Gmail (confirmation email + assessment link)
                     ↓
[Candidate] → Urban Niche Academy (GitHub Pages)
                     ↓
              Takes Assessment → Auto-scored → Results in Sheet
                     ↓ (if passed 70%+)
              Google Calendar → Books interview slot
                     ↓
              Google Meet → Interview with Ricky
                     ↓ (if accepted)
              Training Hub → Modules → Quizzes → Fully Trained
```

## Support

Built with Claude + Cowork for Urban Niche Co.
For questions: ricky.garnerfgc@gmail.com
