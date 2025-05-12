---
description: 
globs: 
alwaysApply: true
---

**You are an expert in TypeScript, Next.js, React, Supabase (PostgreSQL), Tailwind CSS, and Stripe. Your task is to help develop an advanced, AI-powered budget management application called "G15". You will follow these principles and guidelines carefully.**

---

### 🚀 **Core Principles:**

* Write clean, maintainable TypeScript code using functional components and React hooks.
* Use Supabase for secure user authentication, database interactions, and role-based access control.
* Implement Tailwind CSS for UI styling, following a mobile-first design approach.
* Use Stripe for subscription management with secure payment handling.
* Prioritize security, performance, and scalability in all aspects of the application.
* Use environment variables for sensitive data (e.g., API keys, database credentials).
* Follow Next.js best practices for SSR, ISR, and API routes.

---

### 🌐 **User Authentication and Profile Management:**

* Implement secure user registration, login, and profile management using Supabase.
* Use JWT-based authentication with Supabase for secure API requests.
* Provide role-based access control:

  * **Standard Users (Free Plan)**: Can manage their own budgets, goals, and expenses.
  * **Pro Users (Subscription Plan)**: Can access AI-powered recommendations, intelligent chatbot, and public showcase.
  * **Admin (Application Developers)**: Can manage all user accounts, including deletion, activation, and showcase management.

---

### 👥 **User Management and Roles:**

* Use Supabase RLS (Row Level Security) for user data isolation.
* Standard Users:

  * Manage their own budgets, incomes, expenses, and goals.
  * Join or create group budgets.
* Pro Users:

  * Access AI-powered budget recommendations (Gemini API).
  * Use an intelligent chatbot for financial guidance.
  * Access the public showcase area (leaderboard).
  * Earn points through badge achievements for discounts on Pro subscription.
* Admin Users:

  * Manage all user accounts.
  * Modify or delete any public showcase item.
  * Toggle user activation status.

---

### 🤖 **Intelligent Chatbot:**

* Implement an AI-powered chatbot (Gemini API) available only for Pro Users.
* The chatbot can:

  * Answer user questions about their budget, goals, or expenses.
  * Add, update, and delete budget items, categories, goals, and expenses.
  * Suggest personalized budget plans using AI.
  * Require double confirmation for critical actions (e.g., delete actions).
* Use clear, context-aware conversational responses.

---

### 🎖️ **Goals and Badges System:**

* Allow users to set financial goals (e.g., save \$1000).
* Assign default badges:

  * "First Goal Achieved"
  * "Super Saver"
  * "Goal Master"
  * "Consistency King"
* Award points for earning badges, which can be redeemed for Pro subscription discounts.
* Ensure badge achievements are stored in the database with timestamps.

---

### 🌟 **Public Showcase Area:**

* Display a live, auto-updating feed of user achievements.
* Only public achievements are displayed (e.g., "User1 earned the 'Super Saver' badge").
* Allow Admin users to delete any public showcase item.
* Use Supabase real-time capabilities for live updates.

---

### 👨‍👩‍👧‍👦 **Group Management:**

* Allow users to create or join groups (e.g., family, team).
* Provide collaborative budget management within groups.
* Implement role management within groups (Owner, Member).
* Display group achievements in the public showcase.

---

### 🚀 **Personalized Onboarding:**

* Implement an interactive onboarding experience:

  * Greet users with a conversational setup (AI-powered).
  * Allow users to set initial goals, budgets, and categories.
  * Automatically set up user dashboards based on their input.

---

### 📊 **Comprehensive Dashboard:**

* Display user financial information, including:

  * Total Balance, Monthly Income, Monthly Expenses.
  * Recent Expenses and Incomes.
  * Progress bars for Goals.
  * Smart Insights (Pro Users).
* Optimize the dashboard for performance and accessibility.

---

### 🔐 **Security Best Practices:**

* Use Supabase JWT for secure authentication.
* Implement HTTPS for all API requests.
* Secure password hashing (bcrypt) for user passwords.
* Require two-step confirmation for critical actions (e.g., deleting data).
* Use environment variables for sensitive information.

---

### 💡 **AI-Powered Smart Features:**

* Use Gemini API for personalized budget recommendations.
* Allow Pro Users to access a conversational chatbot for budget management.
* Use AI to dynamically suggest new goals and budget plans.
* Provide real-time spending alerts (Pro Users).

---

### 🌐 **Database Design (Supabase - PostgreSQL):**

* Use a relational database schema optimized for financial data.
* Separate user, goal, badge, income, expense, and group tables.
* Implement RLS policies to ensure data security and user isolation.
* Optimize database indexing for performance.

---

### 📊 **Public Showcase Feed:**

* Display a public feed of user achievements.
* Use Supabase subscriptions for real-time updates.
* Allow Admin users to delete any showcase item.

---

### 💸 **Pro Subscription Management:**

* Integrate Stripe for secure Pro subscription payments.
* Offer users the ability to earn discounts via badge points.
* Use Stripe webhooks to manage subscription status in real-time.
* Display Pro subscription status and benefits clearly in the user profile.

---

### ✅ **Testing and Quality Assurance:**

* Write unit and integration tests for all core features.
* Use React Testing Library and Jest for frontend tests.
* Use Supabase CLI for automated testing of database interactions.
* Regularly test Stripe integration for subscription management.

---

### 🚀 **Performance Optimization:**

* Use Next.js ISR (Incremental Static Regeneration) for static pages.
* Optimize all images (WebP, lazy loading).
* Use React Suspense and React Query for efficient data fetching.
* Implement client-side caching for frequently accessed data.

---

### 🌐 **Responsive Design:**

* Implement mobile-first design using Tailwind CSS.
* Use responsive grid layouts for the dashboard.
* Optimize for both desktop and mobile experiences.


