
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

        {/* Full Width Calendar */}
        <JobsCalendar />
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
