
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Logo from "@/components/Logo";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-g15-primary/10 to-white">
      <div className="container mx-auto px-4 py-12">
        <header className="flex justify-between items-center mb-16">
          <Logo />
          <div className="flex gap-4">
            {!isAuthenticated ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/signin")}
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => navigate("/signup")}
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <Button 
                onClick={() => navigate("/dashboard")}
              >
                Go to Dashboard
              </Button>
            )}
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <h1 className="text-5xl font-bold tracking-tight text-gray-900">
              Take Control of Your <span className="text-g15-primary">Financial Future</span>
            </h1>
            <p className="text-xl text-gray-600">
              Set your financial goals, manage your budget, and track your progress toward financial freedom with G15.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button 
                size="lg"
                className="bg-g15-primary hover:bg-g15-primary/90"
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/signup")}
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started"}
              </Button>
              {!isAuthenticated && (
                <Button 
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/upgrade")}
                >
                  Explore Pro Features
                </Button>
              )}
            </div>

            <div className="flex items-center gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-g15-primary">10K+</div>
                <div className="text-sm text-gray-500">Active Users</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-g15-primary">$500M+</div>
                <div className="text-sm text-gray-500">Assets Managed</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-g15-primary">95%</div>
                <div className="text-sm text-gray-500">Satisfaction Rate</div>
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block">
            <img 
              src="/placeholder.svg" 
              alt="G15 Financial Management" 
              className="rounded-lg shadow-xl"
              width={600}
              height={400}
            />
          </div>
        </main>

        <div className="mt-24 py-12 px-8 bg-gray-50 rounded-xl">
          <h2 className="text-3xl font-bold text-center mb-12">What We Offer</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-g15-primary/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-g15-primary">
                  <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Budget Management</h3>
              <p className="text-gray-600">
                Categorize your expenses, set budget limits, and improve your financial habits.
              </p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-g15-primary/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-g15-primary">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Goal Tracking</h3>
              <p className="text-gray-600">
                Set your financial goals and track your progress step by step to achieve them.
              </p>
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 rounded-full bg-g15-primary/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-g15-primary">
                  <path d="M3 3v18h18"></path>
                  <path d="m19 9-5 5-4-4-3 3"></path>
                </svg>
              </div>
              <h3 className="text-xl font-medium mb-2">Financial Analytics</h3>
              <p className="text-gray-600">
                Understand your income and expense trends, use detailed reports to make financial decisions.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-6 bg-white rounded-lg shadow border">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-g15-accent/30 flex items-center justify-center mr-3">
                    <span className="text-g15-accent font-medium">
                      {["AY", "MK", "EC"][i - 1]}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">
                      {["Alice Y.", "Michael K.", "Emma C."][i - 1]}
                    </h4>
                    <div className="flex text-g15-accent">
                      {"★★★★★".split("").map((star, idx) => (
                        <span key={idx}>{star}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600">
                  {[
                    "With G15, I reach my financial goals much more easily. Being able to track my budget has changed my life!",
                    "This is the app I've been looking for. Now I can keep all my expenses under control.",
                    "The Pro features are really worth it. The AI assistant provides personalized advice that helps me make better financial decisions."
                  ][i - 1]}
                </p>
              </div>
            ))}
          </div>
        </div>

        <footer className="mt-24 pt-12 border-t">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
              <Logo />
              <p className="mt-4 text-gray-600">
                We're with you on the path to financial freedom.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Features</li>
                <li>Pricing</li>
                <li>Pro Plan</li>
                <li>Partners</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li>About Us</li>
                <li>Careers</li>
                <li>Blog</li>
                <li>Contact</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-600">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Security</li>
              </ul>
            </div>
          </div>
          
          <div className="py-6 border-t text-center text-gray-600">
            <p>© {new Date().getFullYear()} G15 Finance. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
