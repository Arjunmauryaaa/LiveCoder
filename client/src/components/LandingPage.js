import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const LandingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const features = [
    {
      icon: '🚀',
      title: 'Real-time Collaboration',
      description: 'Code together with your team in real-time with live cursor tracking and instant updates.'
    },
    {
      icon: '⚡',
      title: 'Instant Code Execution',
      description: 'Run your code instantly with support for multiple programming languages and real-time feedback.'
    },
    {
      icon: '🏆',
      title: 'Competitive Challenges',
      description: 'Participate in coding competitions with leaderboards, achievements, and skill tracking.'
    },
    {
      icon: '📚',
      title: 'Curated Question Bank',
      description: 'Access 1000+ carefully curated coding questions across all difficulty levels and topics.'
    },
    {
      icon: '🎯',
      title: 'Personalized Learning',
      description: 'Track your progress, identify skill gaps, and get personalized recommendations.'
    },
    {
      icon: '🌍',
      title: 'Global Community',
      description: 'Connect with developers worldwide, share solutions, and learn from peers.'
    }
  ];

  const stats = [
    { number: '10,000+', label: 'Active Users' },
    { number: '1,000+', label: 'Coding Questions' },
    { number: '50+', label: 'Programming Languages' },
    { number: '24/7', label: 'Availability' }
  ];

  const handleGetStarted = () => {
    setIsLoading(true);
    // Simulate loading
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Navigation */}
      <nav className="bg-black bg-opacity-20 backdrop-blur-sm border-b border-white border-opacity-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <img
                src="/images/codecast.png"
                alt="LiveCoder"
                className="h-8 w-auto"
              />
              <span className="ml-2 text-white text-xl font-bold">LiveCoder</span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-white hover:text-blue-300 transition-colors"
              >
                Login
              </button>
              <button
                onClick={handleGetStarted}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Loading...' : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Code Together,
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              {' '}Learn Together
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
            The ultimate platform for real-time coding collaboration, competitive programming, 
            and skill development. Join thousands of developers worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGetStarted}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Start Coding Now'}
            </button>
            <button className="border border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
              Watch Demo
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-black bg-opacity-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Why Choose LiveCoder?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white bg-opacity-5 backdrop-blur-sm border border-white border-opacity-10 rounded-xl p-6 hover:bg-opacity-10 transition-all duration-300"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-300">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-black bg-opacity-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Level Up Your Coding Skills?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of developers who are already improving their skills with LiveCoder.
          </p>
          <button
            onClick={handleGetStarted}
            disabled={isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-10 py-4 rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Get Started Free'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black bg-opacity-40 border-t border-white border-opacity-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <img
                  src="/images/codecast.png"
                  alt="LiveCoder"
                  className="h-6 w-auto"
                />
                <span className="ml-2 text-white font-bold">LiveCoder</span>
              </div>
              <p className="text-gray-300">
                The ultimate platform for real-time coding collaboration and skill development.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-300">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white border-opacity-10 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 LiveCoder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage; 