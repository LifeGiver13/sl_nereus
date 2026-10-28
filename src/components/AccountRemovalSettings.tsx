import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE_URL } from "@/config/env";


interface AccountRemovalPolicy {
    title: string;
    description: string;
    message: string;
}



const AccountRemovalSettings = () => {

    const { toast } = useToast();
    const { token } = useAuth();


    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);


    const [policy, setPolicy] = useState<AccountRemovalPolicy>({
        title: "",
        description: "",
        message: "",
    });


    useEffect(() => {
        fetchPolicy();
    }, []);



    const fetchPolicy = async () => {

        try {

            setLoading(true);

            const response = await fetch(
                `${API_BASE_URL}/auth/account-removal`
            );


            const data = await response.json();


            if (!response.ok) {
                throw new Error(data.message);
            }


            setPolicy({
                title: data.title || "",
                description: data.description || "",
                message: data.message || "",
            });


        } catch (error: any) {

            toast({
                title: "Error",
                description:
                    error.message || "Failed loading account removal settings",
                variant: "destructive",
            });

        } finally {
            setLoading(false);
        }

    };



    const updatePolicy = async () => {

        try {

            setSaving(true);

            const getHeaders = () => ({
                "Content-Type": "application/json",
                "X-SERVICE-USER": token ?? "",
            });

            const response = await fetch(
                `${API_BASE_URL}/auth/account-removal`,
                {
                    method: "PUT",
                    headers: getHeaders(),

                    body: JSON.stringify(policy),
                }
            );


            const data = await response.json();


            if (!response.ok) {
                throw new Error(data.message);
            }


            toast({
                title: "Success",
                description:
                    "Account removal content updated successfully",
            });


        } catch (error: any) {

            toast({
                title: "Error",
                description:
                    error.message || "Failed updating settings",
                variant: "destructive",
            });


        } finally {
            setSaving(false);
        }

    };



    if (loading) {

        return (
            <div className="text-sm text-muted-foreground">
                Loading account removal settings...
            </div>
        );

    }



    return (

        <div className="space-y-5 border rounded-md p-5">


            <div>
                <h3 className="font-semibold text-lg">
                    Account Removal Content
                </h3>

                <p className="text-sm text-muted-foreground">
                    Manage the message displayed when employees request account removal.
                </p>
            </div>



            <div className="space-y-2">

                <label className="text-sm font-medium">
                    Title
                </label>


                <Input
                    value={policy.title}
                    onChange={(e) =>
                        setPolicy(prev => ({
                            ...prev,
                            title: e.target.value
                        }))
                    }
                />

            </div>




            <div className="space-y-2">

                <label className="text-sm font-medium">
                    Description
                </label>


                <Textarea
                    rows={3}
                    value={policy.description}
                    onChange={(e) =>
                        setPolicy(prev => ({
                            ...prev,
                            description: e.target.value
                        }))
                    }
                />

            </div>




            <div className="space-y-2">

                <label className="text-sm font-medium">
                    Main Message
                </label>


                <Textarea
                    rows={6}
                    value={policy.message}
                    onChange={(e) =>
                        setPolicy(prev => ({
                            ...prev,
                            message: e.target.value
                        }))
                    }
                />

            </div>




            <Button
                onClick={updatePolicy}
                disabled={saving}
            >

                {
                    saving
                        ? "Saving..."
                        : "Save Changes"
                }

            </Button>


        </div>

    );
};


export default AccountRemovalSettings;