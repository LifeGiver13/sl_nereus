import React from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SkillCategoriesManagement from "../components/SkillCategoriesManagement";
import CandidateSkillsManagement from "../components/CandidateSkillsManagement";

const SkillsManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "skills" ? "skills" : "categories";

  const setTab = (value: string) => {
    setSearchParams(value === "skills" ? { tab: "skills" } : { tab: "categories" }, { replace: true });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-[#000009]">Skills management</h1>
          <p className="text-gray-600 mt-1">
            Maintain skill categories (name and order) and individual candidate skills.
          </p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-muted/60">
            <TabsTrigger value="categories" className="data-[state=active]:bg-[#712B71] data-[state=active]:text-white">
              Category management
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-[#712B71] data-[state=active]:text-white">
              Skills management
            </TabsTrigger>
          </TabsList>
          <TabsContent value="categories" className="mt-6 focus-visible:outline-none">
            <SkillCategoriesManagement />
          </TabsContent>
          <TabsContent value="skills" className="mt-6 focus-visible:outline-none">
            <CandidateSkillsManagement />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default SkillsManagement;
