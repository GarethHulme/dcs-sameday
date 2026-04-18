import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";

export default function PostJobPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    title: "",
    description: "",
    jobType: "multi_drop",
    region: "NW",
    date: new Date().toISOString().split("T")[0],
    departureTime: "07:30",
    estimatedStops: "",
    estimatedParcels: "",
    estimatedHours: "",
    payRate: "",
    additionalPayNotes: "",
    postcodes: "",
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/jobs", data),
    onSuccess: async (res) => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to post job");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job posted!", description: "A contract draft has been created automatically." });
      navigate("/jobs");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  function handleChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate({
      ...form,
      estimatedStops: form.estimatedStops ? parseInt(form.estimatedStops) : null,
      estimatedParcels: form.estimatedParcels ? parseInt(form.estimatedParcels) : null,
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
      payRate: form.payRate ? parseFloat(form.payRate) : null,
    });
  }

  if (user?.role === "driver") {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Drivers cannot post jobs.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-semibold">Post a Job</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input value={form.title} onChange={e => handleChange("title", e.target.value)} placeholder="e.g. DPD Liverpool Multi-Drop" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select value={form.jobType} onValueChange={v => handleChange("jobType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="multi_drop">Multi Drop</SelectItem>
                    <SelectItem value="single_drop">Single Drop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Region *</Label>
                <Select value={form.region} onValueChange={v => handleChange("region", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NW">NW — North West</SelectItem>
                    <SelectItem value="SCO">SCO — Scotland</SelectItem>
                    <SelectItem value="E">E — East</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => handleChange("date", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Departure Time</Label>
                <Input type="time" value={form.departureTime} onChange={e => handleChange("departureTime", e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Postcodes (comma separated)</Label>
              <Input value={form.postcodes} onChange={e => handleChange("postcodes", e.target.value)} placeholder="L1, L2, L3..." />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} placeholder="Additional details about the job..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Estimates & Pay</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Est. Stops</Label>
                <Input type="number" value={form.estimatedStops} onChange={e => handleChange("estimatedStops", e.target.value)} placeholder="85" min="0" />
              </div>
              <div className="space-y-2">
                <Label>Est. Parcels</Label>
                <Input type="number" value={form.estimatedParcels} onChange={e => handleChange("estimatedParcels", e.target.value)} placeholder="120" min="0" />
              </div>
              <div className="space-y-2">
                <Label>Est. Hours</Label>
                <Input type="number" step="0.5" value={form.estimatedHours} onChange={e => handleChange("estimatedHours", e.target.value)} placeholder="8" min="0" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pay Rate (£/day)</Label>
                <Input type="number" step="0.01" value={form.payRate} onChange={e => handleChange("payRate", e.target.value)} placeholder="145.00" min="0" />
              </div>
              <div className="space-y-2">
                <Label>Additional Pay Notes</Label>
                <Input value={form.additionalPayNotes} onChange={e => handleChange("additionalPayNotes", e.target.value)} placeholder="e.g. + £10 fuel allowance" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/jobs")}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending} className="flex-1">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Post Job
          </Button>
        </div>
      </form>
    </div>
  );
}
