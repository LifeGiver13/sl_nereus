import React from "react";
import AdminLayout from "../components/AdminLayout";
import PageManagersPanel from "../components/PageManagersPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ContentPages: React.FC = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#000009]">Pages</h1>
          <p className="text-gray-600 mt-1">
            Edit the Landing and Start pages (fixed keys). Missing records are created automatically.
          </p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-[#000009]">Page managers</CardTitle>
            <CardDescription>
              Two fixed pages: landing and start. Each row opens a visual editor for its content.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PageManagersPanel />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default ContentPages;
