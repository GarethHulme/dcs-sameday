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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

const STEPS = ["Personal Info", "Vehicle Details", "Availability & Regions", "Compliance & Terms"];

export default function RegisterPoolPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    region: "NW",
    multiDropCapable: false,
    singleDropCapable: true,
    hasOwnVehicle: false,
    vehicleType: "van",
    availableDays: [] as string[],
    experienceNotes: "",
    acceptTerms: false,
    acceptNonSolicitation: false,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/pool/register", data),
    onSuccess: async (res) => {
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Registration failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/pool"] });
      toast({ title: "Application submitted!", description: "We'll review your application and get back to you." });
      navigate("/");
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: "Error", description: err.message });
    },
  });

  function handleChange(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function handleSubmit() {
    if (!form.acceptTerms || !form.acceptNonSolicitation) {
      toast({ variant: "destructive", title: "Please accept all terms" });
      return;
    }
    mutation.mutate(form);
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back
        </Button>
        <h1 className="text-2xl font-semibold">Join Ad-Hoc Pool</h1>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/20 text-primary border border-primary" : "bg-muted text-muted-foreground"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-6 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{STEPS[step]}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {step === 0 && (
            <>
              <p className="text-sm text-muted-foreground">Confirm your details below. These will be used for your pool registration.</p>
              <div className="space-y-2">
                <Label>Your Name</Label>
                <Input value={user?.name ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div className="space-y-2">
                <Label>Primary Region *</Label>
                <Select value={form.region} onValueChange={v => handleChange("region", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NW">NW — North West</SelectItem>
                    <SelectItem value="SCO">SCO — Scotland</SelectItem>
                    <SelectItem value="E">E — East</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                <Select value={form.vehicleType} onValueChange={v => handleChange("vehicleType", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="bike">Bike / Moped</SelectItem>
                    <SelectItem value="cargo_bike">Cargo Bike</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="ownVehicle" checked={form.hasOwnVehicle} onCheckedChange={v => handleChange("hasOwnVehicle", !!v)} />
                <Label htmlFor="ownVehicle">I have my own vehicle</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="multiDrop" checked={form.multiDropCapable} onCheckedChange={v => handleChange("multiDropCapable", !!v)} />
                <Label htmlFor="multiDrop">I can do multi-drop routes</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="singleDrop" checked={form.singleDropCapable} onCheckedChange={v => handleChange("singleDropCapable", !!v)} />
                <Label htmlFor="singleDrop">I can do single-drop routes</Label>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Available Days (select all that apply)</Label>
                <div className="grid grid-cols-2 gap-2">
                  {days.map(day => (
                    <div key={day} className="flex items-center gap-2">
                      <Checkbox
                        id={day}
                        checked={form.availableDays.includes(day)}
                        onCheckedChange={checked => {
                          const d = checked
                            ? [...form.availableDays, day]
                            : form.availableDays.filter(x => x !== day);
                          handleChange("availableDays", d);
                        }}
                      />
                      <Label htmlFor={day} className="text-sm">{day}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Experience Notes (optional)</Label>
                <Textarea
                  value={form.experienceNotes}
                  onChange={e => handleChange("experienceNotes", e.target.value)}
                  placeholder="Tell us about your delivery experience..."
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4 text-sm space-y-2 text-muted-foreground max-h-48 overflow-y-auto">
                <p className="font-semibold text-foreground">Terms & Conditions</p>
                <p>By joining the DCS Same Day Ad-Hoc Pool, you agree to:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Maintain valid insurance, driving licence and right to work documentation</li>
                  <li>Complete accepted jobs professionally and punctually</li>
                  <li>Comply with all applicable road traffic laws</li>
                  <li>Provide accurate information during registration</li>
                  <li>Allow DCS to verify your compliance documents</li>
                </ul>
              </div>

              <div className="rounded-lg border border-amber-500/30 p-4 text-sm">
                <p className="font-semibold mb-2">Non-Solicitation Clause</p>
                <p className="text-muted-foreground text-xs">You agree not to approach or solicit delivery work directly from any DCS client for a period of 12 months following any ad-hoc engagement, bypassing DCS Command Suite.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" checked={form.acceptTerms} onCheckedChange={v => handleChange("acceptTerms", !!v)} />
                  <Label htmlFor="terms" className="text-sm leading-snug cursor-pointer">I accept the Terms & Conditions and understand my obligations as an ad-hoc pool driver</Label>
                </div>
                <div className="flex items-start gap-3">
                  <Checkbox id="nonsol" checked={form.acceptNonSolicitation} onCheckedChange={v => handleChange("acceptNonSolicitation", !!v)} />
                  <Label htmlFor="nonsol" className="text-sm leading-snug cursor-pointer">I accept the Non-Solicitation Clause</Label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        {step > 0 ? (
          <Button variant="outline" onClick={() => setStep(s => s - 1)}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        ) : (
          <div />
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)}>Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
        ) : (
          <Button onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Submit Application
          </Button>
        )}
      </div>
    </div>
  );
}
