import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Building, Users, Star, MessageSquare, TrendingUp } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <img src="/menaxa-main.png" alt="Anonn Logo" className="h-8 w-8" />
              <span className="text-2xl font-bold text-gray-900">Anonn</span>
            </div>
            <Button 
              onClick={() => window.location.href = '/auth'}
              className="bg-reddit-orange hover:bg-reddit-orange/90 text-white"
            >
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Professional Community & Reviews
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Share honest workplace experiences, connect with professionals in Bowls, 
            and build your reputation through community engagement.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/auth'}
            className="bg-reddit-orange hover:bg-reddit-orange/90 text-white px-8 py-3 text-lg"
          >
            Join Anonn
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="w-12 h-12 bg-positive/10 rounded-lg flex items-center justify-center mb-4">
                <Building className="h-6 w-6 text-positive" />
              </div>
              <CardTitle>Organization Reviews</CardTitle>
              <CardDescription>
                Share authentic workplace experiences with sentiment-based reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Anonymous posting available</li>
                <li>• Positive, Neutral, Negative ratings</li>
                <li>• File attachments supported</li>
                <li>• Earn karma for contributions</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="w-12 h-12 bg-professional-blue/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-professional-blue" />
              </div>
              <CardTitle>Professional Bowls</CardTitle>
              <CardDescription>
                Join communities focused on career topics and industry discussions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Industry-specific communities</li>
                <li>• Career advice and networking</li>
                <li>• Anonymous discussions</li>
                <li>• Upvote/downvote system</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="w-12 h-12 bg-neutral/10 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-neutral" />
              </div>
              <CardTitle>Karma System</CardTitle>
              <CardDescription>
                Build reputation through quality contributions and community engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• +5 karma for reviews</li>
                <li>• +2 karma per upvote</li>
                <li>• -2 karma per downvote</li>
                <li>• Public reputation scores</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-reddit-orange mb-2">10K+</div>
              <div className="text-gray-600 dark:text-gray-300">Professional Reviews</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-professional-blue mb-2">50+</div>
              <div className="text-gray-600 dark:text-gray-300">Active Bowls</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-positive mb-2">5K+</div>
              <div className="text-gray-600 dark:text-gray-300">Community Members</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-neutral mb-2">500+</div>
              <div className="text-gray-600 dark:text-gray-300">Organizations</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to share your professional story?
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            Join thousands of professionals building a transparent workplace community.
          </p>
          <Button 
            size="lg"
            onClick={() => window.location.href = '/auth'}
            className="bg-reddit-orange hover:bg-reddit-orange/90 text-white px-8 py-3 text-lg"
          >
            Get Started Now
          </Button>
        </div>
      </div>
    </div>
  );
}
