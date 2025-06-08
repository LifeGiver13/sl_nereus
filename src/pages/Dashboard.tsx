import React from 'react';
import AdminLayout from '../components/AdminLayout';
import JobsCalendar from '../components/JobsCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, FileText, Building2, Briefcase } from 'lucide-react';

const Dashboard = () => {
  const stats = [
    {
      title: 'Total Applications',
      value: '1,247',
      description: '+12% from last month',
      icon: FileText,
      color: 'text-[#712B71]',
      bgColor: 'bg-[#712B71]/10',
    },
    {
      title: 'Active Candidates',
      value: '892',
      description: '+8% from last month',
      icon: Users,
      color: 'text-[#45f0df]',
      bgColor: 'bg-[#45f0df]/10',
    },
    {
      title: 'Client Companies',
      value: '156',
      description: '+3 new this month',
      icon: Building2,
      color: 'text-[#712B71]',
      bgColor: 'bg-[#712B71]/10',
    },
    {
      title: 'Open Positions',
      value: '73',
      description: '+15 posted this week',
      icon: Briefcase,
      color: 'text-[#45f0df]',
      bgColor: 'bg-[#45f0df]/10',
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#000009]">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome to your Nereus admin panel</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bgColor}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-[#000009]">{stat.value}</div>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions and Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Recent Activity</CardTitle>
              <CardDescription>Latest updates from your platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#45f0df] rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#000009]">New application received</p>
                    <p className="text-xs text-gray-500">John Doe applied for Software Developer position</p>
                  </div>
                  <span className="text-xs text-gray-400">2 min ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#712B71] rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#000009]">Client meeting scheduled</p>
                    <p className="text-xs text-gray-500">TechCorp wants to discuss new requirements</p>
                  </div>
                  <span className="text-xs text-gray-400">1 hour ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#45f0df] rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#000009]">Candidate placement confirmed</p>
                    <p className="text-xs text-gray-500">Sarah Smith started at DataFlow Ltd</p>
                  </div>
                  <span className="text-xs text-gray-400">3 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#000009]">Quick Actions</CardTitle>
              <CardDescription>Frequently used tasks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 border border-[#712B71] rounded-lg hover:bg-[#712B71]/10 transition-colors text-center">
                  <FileText className="h-6 w-6 text-[#712B71] mx-auto mb-2" />
                  <span className="text-sm font-medium text-[#000009]">New Application</span>
                </button>
                <button className="p-4 border border-[#45f0df] rounded-lg hover:bg-[#45f0df]/10 transition-colors text-center">
                  <Users className="h-6 w-6 text-[#45f0df] mx-auto mb-2" />
                  <span className="text-sm font-medium text-[#000009]">Add Candidate</span>
                </button>
                <button className="p-4 border border-[#712B71] rounded-lg hover:bg-[#712B71]/10 transition-colors text-center">
                  <Building2 className="h-6 w-6 text-[#712B71] mx-auto mb-2" />
                  <span className="text-sm font-medium text-[#000009]">New Client</span>
                </button>
                <button className="p-4 border border-[#45f0df] rounded-lg hover:bg-[#45f0df]/10 transition-colors text-center">
                  <Briefcase className="h-6 w-6 text-[#45f0df] mx-auto mb-2" />
                  <span className="text-sm font-medium text-[#000009]">Post Job</span>
                </button>
              </div>
            </CardContent>
          </Card>

          <JobsCalendar />
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
