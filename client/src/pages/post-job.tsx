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
import { ArrowLeft, Loader2, MapPin, Plus, Trash2 } from "lucide-react";

type BookingStop = {
  addressLine1: string; addressLine2: string; city: string; postcode: string;
  recipientName: string; recipientPhone: string; instructions: string;
  parcelCount: string; windowStart: string; windowEnd: string;
};

const emptyStop = (): BookingStop => ({
  addressLine1: "", addressLine2: "", city: "", postcode: "", recipientName: "", recipientPhone: "",
  instructions: "", parcelCount: "", windowStart: "", windowEnd: "",
});

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
  const [stops, setStops] = useState<BookingStop[]>([emptyStop()]);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/jobs", data),
    onSuccess: async (res) => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to post job");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Booking created", description: "A contract draft has been created automatically." });
      navigate(user?.role === "client" ? "/client-portal" : "/dispatch");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  function handleChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function updateStop(index: number, field: keyof BookingStop, value: string) {
    setStops(current => current.map((stop, i) => i === index ? { ...stop, [field]: value } : stop));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const bookingStops = form.jobType === "single_drop" ? stops.slice(0, 1) : stops;
    mutation.mutate({
      ...form,
      estimatedStops: bookingStops.length,
      estimatedParcels: bookingStops.some(stop => stop.parcelCount !== "")
        ? bookingStops.reduce((total, stop) => total + (Number(stop.parcelCount) || 0), 0)
        : (form.estimatedParcels ? parseInt(form.estimatedParcels) : null),
      estimatedHours: form.estimatedHours ? parseFloat(form.estimatedHours) : null,
      payRate: form.payRate ? parseFloat(form.payRate) : null,
      postcodes: bookingStops.map(stop => stop.postcode.trim().toUpperCase()).filter(Boolean).join(", "),
      stops: bookingStops.map(stop => ({
        ...stop,
        postcode: stop.postcode.trim().toUpperCase(),
        parcelCount: stop.parcelCount === "" ? null : Number(stop.parcelCount),
      })),
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
        <h1 className="text-2xl font-semibold">New booking</h1>
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
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => handleChange("description", e.target.value)} placeholder="Additional details about the job..." rows={3} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-4 w-4 text-primary" />Stops</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Add each delivery address in the order you expect the driver to visit. Route optimization is not available yet.</p>
            </div>
            {form.jobType === "multi_drop" && <Button type="button" variant="outline" size="sm" onClick={() => setStops(current => [...current, emptyStop()])}>
              <Plus className="mr-1 h-4 w-4" /> Add stop
            </Button>}
          </CardHeader>
          <CardContent className="space-y-4">
            {stops.slice(0, form.jobType === "single_drop" ? 1 : stops.length).map((stop, index) => (
              <div key={index} className="rounded-lg border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium">Stop {index + 1}</p>
                  {form.jobType === "multi_drop" && stops.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove stop ${index + 1}`} onClick={() => setStops(current => current.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Address line 1 *</Label><Input value={stop.addressLine1} onChange={e => updateStop(index, "addressLine1", e.target.value)} placeholder="Building and street" required /></div>
                  <div className="space-y-2"><Label>Address line 2</Label><Input value={stop.addressLine2} onChange={e => updateStop(index, "addressLine2", e.target.value)} placeholder="Unit, floor or area" /></div>
                  <div className="space-y-2"><Label>Town or city *</Label><Input value={stop.city} onChange={e => updateStop(index, "city", e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Postcode *</Label><Input value={stop.postcode} onChange={e => updateStop(index, "postcode", e.target.value)} autoCapitalize="characters" required /></div>
                  <div className="space-y-2"><Label>Recipient</Label><Input value={stop.recipientName} onChange={e => updateStop(index, "recipientName", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Contact number</Label><Input type="tel" value={stop.recipientPhone} onChange={e => updateStop(index, "recipientPhone", e.target.value)} /></div>
                  <div className="space-y-2"><Label>Parcels at stop</Label><Input type="number" min="0" step="1" value={stop.parcelCount} onChange={e => updateStop(index, "parcelCount", e.target.value)} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2"><Label>Window from</Label><Input type="time" value={stop.windowStart} onChange={e => updateStop(index, "windowStart", e.target.value)} /></div>
                    <div className="space-y-2"><Label>Window to</Label><Input type="time" value={stop.windowEnd} onChange={e => updateStop(index, "windowEnd", e.target.value)} /></div>
                  </div>
                  <div className="space-y-2 sm:col-span-2"><Label>Driver instructions</Label><Textarea value={stop.instructions} onChange={e => updateStop(index, "instructions", e.target.value)} placeholder="Access details, safe place or delivery notes" rows={2} /></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Estimates & Pay</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Parcels (estimate)</Label>
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
            Create booking
          </Button>
        </div>
      </form>
    </div>
  );
}
