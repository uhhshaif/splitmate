# 💸 Splitmate — AI-Powered Smart Expense Splitter

**Splitmate** is a modern, premium web application built for peer groups, roommates, and travel companions to easily log, track, and settle shared expenses. Designed with a particular focus on Malaysian students and peer groups, the app streamlines billing by parsing receipts with AI, simplifying complex group debts, and integrating local payment methods (such as DuitNow, Touch 'n Go, and MAE).

Splitmate operates in two sync modes: **Production Mode** (synced with Supabase authentication and database) and an **Offline Sandbox Mode** (a local state store utilizing browser storage), making it completely plug-and-play for offline evaluations.

---

## 🌟 Key Features

### 1. 🤖 AI-Powered Receipt Scanner
* Upload a receipt or capture it on a webcam.
* The backend API uses **Gemini / Claude LLM integration** to extract the merchant title, total amount, line items, service tax (SST), and service charge percentage.
* **API Resilience**: If no API keys are provided or rate limits are reached, the system automatically falls back to a mock simulation mode that reads context from file names (e.g., matching "grab" with ride fares or "hotel" with lodging rates) so the feature remains fully demoable.

### 2. 🗣️ NLP Quick-Parse Assistant
* Type a natural conversational sentence (e.g., *"I paid RM45 for Nasi Lemak dinner split equally with Marcus and Jessica"*) to log an expense instantly.
* The NLP parser extracts the description, category, payer, total amount, and splits the shares among the mentioned group members.
* Includes a robust local regex-heuristic parser fallback for offline execution.

### 3. 🕸️ Smart Debt Simplification Algorithm
* Reduces transaction friction by calculating the absolute net balance of each user in a group.
* Employs a network flow graph algorithm that simplifies debts (e.g., if User A owes B RM10, and B owes C RM10, A is instructed to pay C RM10 directly), minimizing transfer counts.

### 4. 📱 Mobile Web Companion (Real-time Sync)
* Synchronizes desktop and mobile browsers through a real-time QR link sequence.
* Scan the desktop link on your phone to open a mobile-optimized camera frame, snap a receipt photo, and watch it upload and populate the desktop expense form in real time.

### 5. 💳 Integrated Payment Settlement
* Paid settlement cards include payment methods tailored for Malaysian users (DuitNow type/ID, TNG Phone, MAE Account, PayPal, and Venmo).
* Clicking a creditor profile triggers a zoomable lightbox overlay displaying their payment QR code for seamless scanning.

### 6. 🎨 Premium UI/UX & Themes
* Dynamic interactive charts showing spending breakdowns by category (Food, Housing, Transport, Utilities, Lodging, Entertainment, and General).
* Responsive layout with animations (Framer Motion style), light/dark mode toggling, custom Radix UI Dialog modals, and premium empty onboarding states.

---

## 🛠️ Technology Stack & Architecture

* **Frontend**: Next.js (App Router, Turbopack, Client Components), React, TailwindCSS
* **State Management**: Zustand (with localStorage persistence)
* **Charts & Visuals**: Recharts (Pie/Ring Spending Breakdowns with center hover-state overlays), Lucide Icons
* **Database & Auth**: Supabase (PostgreSQL tables, Row-Level Security, Auth session management)
* **AI Engine**: Google Gemini Developer API & Anthropic API (via Next.js edge-friendly fetch routing)

---

## 🧩 Technical Approach & Challenges Faced

### 1. Next.js SSR Hydration & Zustand Persist
* **The Challenge**: Using persisted Zustand store variables directly on initial client rendering triggers hydration errors because the server has no access to the browser's `localStorage` state.
* **The Solution**: Designed a client-side `StoreInitializer` component that safely mounts on the client first and triggers the store hydration sequence, ensuring zero React mismatch warnings.

### 2. Preventing HTTP 431 Headers (Foreign Cookies Cleanup)
* **The Challenge**: When running multiple Next.js apps connected to different Supabase instances on `localhost`, cookies named `sb-[ref]-auth-token` accumulate and exceed the browser header size limits, resulting in `HTTP 431 Request Header Fields Too Large` server rejections.
* **The Solution**: Programmed a cookie-clearing hook during the store initialization that scans `document.cookie`, identifies any cookies belonging to foreign Supabase projects, and purges them dynamically on mount.

### 3. Graceful LLM Rate Limiting & Offline Compatibility
* **The Challenge**: Third-party AI APIs are susceptible to quota limits, cold starts, and missing environment variables during evaluations.
* **The Solution**: Formulated a cascading API structure. Edge fetch requests fall back from `gemini-2.5-flash` to `gemini-3.5-flash` on failure, and catch blocks execute a fallback system returning smart mock structures.

---

## 🚀 How to Run locally

### 1. Clone & Install
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

## 🧪 Running Integration Tests
Splitmate includes a Node-based integration test script to verify endpoint functionality. Ensure the development server is running on port 3000, then execute:
```bash
node run_integration_tests.js
```
The script tests:
1. Debt calculation routing.
2. Natural language parsing API structures.
3. Mobile companion real-time session flow.
