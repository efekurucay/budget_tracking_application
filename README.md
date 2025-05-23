# G15 Finance Genius App

G15 is an advanced AI-powered budget management application built with Next.js, React, and Supabase. The name "G15" stands for Goals, Groups, and Genius - the three core pillars of the app.

## Features

### 🔐 User Authentication and Profile Management
- Secure user registration, login, and profile management
- JWT-based authentication with Supabase
- Pro subscription system with Stripe integration
- Role-based access control

### 💰 Budget Management
- Create and manage budget categories
- Track expenses and income
- Visualize spending patterns
- Set spending limits

### 🎯 Goals and Badges System
- Set financial goals with progress tracking
- Earn badges for achieving financial milestones
- Accumulate points for discounts on Pro subscription

### 👥 Group Management
- Create or join financial groups (family, team, business)
- Collaborate on shared budgets and goals
- Group achievements appear in public showcase

### 🤖 AI-Powered Assistant (Pro Feature)
- Get personalized budget recommendations
- Ask questions about financial data
- Receive advice on spending habits and saving opportunities
- Powered by Google's Gemini API

### 🏆 Public Showcase
- Public feed of user achievements
- Celebrate financial milestones with the community

### 📊 Comprehensive Dashboard
- View financial overview at a glance
- Interactive charts and reports
- Transaction history and insights

## Technology Stack

- **Frontend**: React, TailwindCSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Authentication, Storage)
- **AI Integration**: Google Gemini API
- **State Management**: TanStack Query (React Query)
- **Form Handling**: React Hook Form
- **Validation**: Zod
- **Routing**: React Router

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file with Supabase URL and key
   - Add Gemini API key for AI features
4. Set up Supabase:
   - Create tables according to the schema
   - Set up authentication
   - Deploy edge functions
5. Start the development server:
   ```
   npm run dev
   ```

## Database Schema

The application uses a PostgreSQL database with the following key tables:
- `profiles`: Extended user data
- `goals`: Financial goals
- `transactions`: Income and expense records
- `budget_categories`: Budget planning
- `badges`: Achievement recognitions 
- `user_badges`: User earned badges
- `groups`: Collaborative financial groups
- `group_members`: Group membership data
- `showcase`: Public achievement feed
- `subscriptions`: Pro user subscription data

## Contributing

Contributions to G15 are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
