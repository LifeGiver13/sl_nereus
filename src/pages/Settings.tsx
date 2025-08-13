
import React, { useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import DepartmentManagement from '../components/DepartmentManagement';
import ViewManagement from '../components/ViewManagement';
import ApplicationFormsManager from '../components/ApplicationFormsManager';

const Settings = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#000009]">Settings</h1>
          <p className="text-gray-600 mt-1">Configure your Nereus admin panel</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">System Settings</CardTitle>
            <CardDescription>Manage your application preferences and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="departments">
                <AccordionTrigger className="text-lg font-semibold">
                  Department Management
                </AccordionTrigger>
                <AccordionContent>
                  <DepartmentManagement />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="view-management">
                <AccordionTrigger className="text-lg font-semibold">
                  View Management
                </AccordionTrigger>
                <AccordionContent>
                  <ViewManagement />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="application-forms">
                <AccordionTrigger className="text-lg font-semibold">
                  Application Forms Manager
                </AccordionTrigger>
                <AccordionContent>
                  <ApplicationFormsManager />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default Settings;
