# Splitmate - AI-Powered Smart Expense Splitter

Splitmate is a modern, premium web application built for peer groups, roommates, and travel companions to easily log, track, and settle shared expenses. Designed with a particular focus on Malaysian student cohorts and peer groups, the application streamlines billing by parsing receipts with artificial intelligence, simplifying complex group debts, and integrating local payment methods (such as DuitNow, Touch 'n Go, and MAE).

Splitmate operates in two synchronization modes: **Production Mode** (synced with Supabase authentication and database) and an **Offline Sandbox Mode** (a local state store utilizing browser storage), making it completely plug-and-play for offline evaluations.

---

## 🎥 Demo Video

Watch the full Splitmate walkthrough and AI Receipt Scanner in action:
👉 **[Watch Demo Video on Google Drive](https://drive.google.com/drive/folders/1ifSJgxK8SOiGTEnVhk7TJeRLYyTHul4x?usp=drive_link)**

---

## Live Deployment

Experience Splitmate live on Vercel:
👉 **[https://splitmate-gray.vercel.app/](https://splitmate-gray.vercel.app/)**

### Test Accounts for Reviewers
To explore the app with pre-populated data (groups, expenses, and settlements), simply navigate to the live deployment link, click **Sign In**, and use either of the following test accounts:

**Account 1:**
- **Email:** `test1@gmail.com`
- **Password:** `Test12345`

**Account 2:**
- **Email:** `shaif@gmail.com`
- **Password:** `Shaif12345`

---


## How to Use the App

1. **Sign Up / Login**: Create a new account or log in with your existing credentials.
2. **Create a Group**: From your dashboard, click "Manage Groups" or "Create Group" to start a new shared workspace.
3. **Invite Members**: Add your friends or roommates to the group using their email addresses.
4. **Log Expenses**: Use the "Add Expense" button to manually enter a bill, or use the "Scan Receipt" feature to let the AI automatically extract line items and amounts.
5. **Track Balances**: View your dashboard to see your net balance across all groups, who you owe, and who owes you.
6. **Settle Up**: Review the simplified debts in your group. You can view uploaded DuitNow/QR payment codes directly on member profiles to easily transfer funds.

---
## Core Features

### 1. AI-Powered Receipt Scanner
* **File Upload & Laptop Webcam Capture**: Users can upload a receipt image or capture one directly using their laptop's built-in webcam.
* **Line Item Extraction**: The backend API uses Google Gemini or Anthropic Claude LLM integration to extract the merchant name, total transaction amount, line items, service tax (SST), and service charge percentage.
* **API Resilience & Dual-Key Fallback**: The system supports primary and secondary API keys (`GEMINI_API_KEY_2`) to automatically failover if rate limits or 503 High Demand errors occur. If all APIs fail, it falls back to a smart mock simulation mode.

### 2. NLP Quick-Parse Assistant
* **Natural Language Inputs**: Paste a natural conversational sentence (e.g., *"I paid RM60 for groceries split equally with Marcus and Jessica"*) to log an expense instantly.
* **Auto-Split Calculation**: The Natural Language Processing parser extracts the description, category, payer, total amount, and splits the shares among the mentioned group members.
* **Fallback parser**: Includes a local regex-heuristic parser fallback for offline execution.

### 3. Smart Debt Simplification Algorithm
* **Minimizing Transactions**: Reduces transaction friction by calculating the absolute net balance of each user in a group.
* **Robust Settlement Flow**: Paying back debts includes a strict "Pending" state where the recipient must "Confirm" or "Decline" the payment before balances are cleared. It includes robust local cache cleanup to prevent "ghost settlements" during database sync failures.
* **Graph Optimization**: Employs a network flow graph algorithm that simplifies debts (e.g., if User A owes B RM10, and B owes C RM10, A is instructed to pay C RM10 directly), minimizing the total number of payment transfers.

### 4. Shared Member Payment QR Codes
* **Profile QR Display**: Users can upload their payment QR codes (such as DuitNow, Touch 'n Go, or MAE QRs) directly in their profile settings.
* **Groups QR View**: Group members can view each other's uploaded payment QR codes directly under the members tab of the group page, with support for a zoomable lightbox overlay for instant scanning.

### 5. Premium UI/UX and Themes
* **Interactive Spending Analytics**: Category-based pie charts showing spending breakdowns (Food, Housing, Transport, Utilities, Lodging, Entertainment, and General) with interactive hover overlays.
* **Chronological Timestamps**: The expense timeline is perfectly sorted by exact insertion time (`created_at`) rather than manual dates, rendering precise, beautifully formatted timestamps (e.g., `Jun 2, 2026, 2:58 PM`) for absolute clarity.
* **Modern Interface**: Responsive layout with smooth transitions, light/dark mode toggling, custom Radix UI Dialog modals, and custom empty onboarding states.

---

## Technology Stack and Architecture

* **Frontend**: Next.js (App Router, Turbopack, Client Components), React, TailwindCSS
* **State Management**: Zustand (with localStorage persistence)
* **Charts and Visuals**: Recharts (Pie/Ring Spending Breakdowns with center hover-state overlays), Lucide Icons
* **Database and Authentication**: Supabase (PostgreSQL tables, Row-Level Security, Auth session management)
* **AI Engine**: Google Gemini Developer API & Anthropic API (via Next.js edge-friendly fetch routing)

---

## Technical Approach and Challenges Faced

### 1. Next.js SSR Hydration and Zustand Persist
* **The Challenge**: Using persisted Zustand store variables directly on initial client rendering triggers hydration errors because the server has no access to the browser's `localStorage` state.
* **The Solution**: Designed a client-side `StoreInitializer` component that safely mounts on the client first and triggers the store hydration sequence, ensuring zero React mismatch warnings.

### 2. Preventing HTTP 431 Headers (Foreign Cookies Cleanup)
* **The Challenge**: When running multiple Next.js apps connected to different Supabase instances on `localhost`, cookies named `sb-[ref]-auth-token` accumulate and exceed the browser header size limits, resulting in `HTTP 431 Request Header Fields Too Large` server rejections.
* **The Solution**: Programmed a cookie-clearing hook during the store initialization that scans `document.cookie`, identifies any cookies belonging to foreign Supabase projects, and purges them dynamically on mount.

### 3. Graceful LLM Rate Limiting and Offline Compatibility
* **The Challenge**: Third-party AI APIs are susceptible to quota limits, cold starts, and missing environment variables during evaluations.
* **The Solution**: Formulated a cascading API structure. Edge fetch requests fall back from `gemini-2.5-flash` to `gemini-3.5-flash` on failure, and catch blocks execute a fallback system returning smart mock structures.

---

## How to Run Locally

### 1. Clone and Install
```bash
# Clone the repository
git clone https://github.com/uhhshaif/splitmate.git
cd splitmate

# Install dependencies
npm install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# (Optional) For Supabase Database Integration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# (Optional) For Live AI Scan & NLP Parsing
GEMINI_API_KEY=your_gemini_developer_key
ANTHROPIC_API_KEY=your_anthropic_api_key
```
*Note: If no env file or keys are provided, Splitmate will automatically run in Sandbox Mock Mode, providing mock data for receipt scanning, natural language parsing, and database transactions.*

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser.

### 4. Build Production Bundle
```bash
npm run build
```

---

## Running Integration Tests
Splitmate includes a Node-based integration test script to verify endpoint functionality. Ensure the development server is running on port 3000, then execute:
```bash
node run_integration_tests.js
```
The script tests:
1. Debt calculation routing.
2. Natural language parsing API structures.
3. Mobile companion real-time session flow.
