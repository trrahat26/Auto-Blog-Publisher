import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetSettings, useUpdateSettings, useGetSchedulerStatus, useRunSchedulerNow, getGetSettingsQueryKey, getGetSchedulerStatusQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Settings as SettingsIcon, Save, Play, RefreshCw, Server, ImageIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

const NICHES = [
  { id: "motivation", label: "Motivation & Success" },
  { id: "ai", label: "Artificial Intelligence" },
  { id: "money", label: "Wealth & Finance" },
  { id: "facts", label: "Interesting Facts" },
  { id: "tech", label: "Technology Trends" },
];

const formSchema = z.object({
  postsPerDay: z.coerce.number().min(1).max(2),
  schedulerEnabled: z.boolean(),
  imagesPerPost: z.coerce.number().min(0).max(3),
  pexelsApiKey: z.string().optional(),
  niches: z.array(z.string()).min(1, "Select at least one niche"),
});

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading: isLoadingSettings } = useGetSettings();
  const { data: scheduler } = useGetSchedulerStatus();
  
  const { mutate: updateSettings, isPending: isUpdating } = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast({ title: "Configuration Updated", description: "System parameters saved successfully." });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSchedulerStatusQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Configuration Error", description: err.message || "Failed to save settings.", variant: "destructive" });
      }
    }
  });

  const { mutate: runScheduler, isPending: isRunningScheduler } = useRunSchedulerNow({
    mutation: {
      onSuccess: () => {
        toast({ title: "Scheduler Triggered", description: "Chron sequence initiated manually." });
      }
    }
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      postsPerDay: 1,
      schedulerEnabled: false,
      imagesPerPost: 1,
      pexelsApiKey: "",
      niches: ["motivation"],
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        postsPerDay: settings.postsPerDay,
        schedulerEnabled: settings.schedulerEnabled,
        imagesPerPost: settings.imagesPerPost,
        pexelsApiKey: settings.pexelsApiKey || "",
        niches: settings.niches,
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    updateSettings({ data: values });
  };

  if (isLoadingSettings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-primary" />
            System Configuration
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Adjust generation and scheduling parameters</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Core Settings */}
            <Card className="border-border bg-card/50 backdrop-blur">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-lg font-mono flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-primary" /> Automation Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <FormField
                  control={form.control}
                  name="schedulerEnabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border p-4 bg-secondary/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base font-mono">Master Toggle</FormLabel>
                        <FormDescription className="font-mono text-xs">
                          Enable automatic chron job publishing
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="data-[state=checked]:bg-primary"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postsPerDay"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <FormLabel className="font-mono">Velocity (Posts / Day)</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(val) => field.onChange(parseInt(val, 10))}
                          value={field.value.toString()}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0 border border-border p-3 rounded-md bg-secondary/10 flex-1 cursor-pointer hover:bg-secondary/30 transition-colors">
                            <FormControl>
                              <RadioGroupItem value="1" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer w-full font-mono">1 Post</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0 border border-border p-3 rounded-md bg-secondary/10 flex-1 cursor-pointer hover:bg-secondary/30 transition-colors">
                            <FormControl>
                              <RadioGroupItem value="2" />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer w-full font-mono">2 Posts</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="pt-4 border-t border-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-sm text-muted-foreground">Chron Status:</span>
                    {scheduler?.isRunning ? (
                      <span className="font-mono text-sm text-primary animate-pulse">Running...</span>
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground">Idle</span>
                    )}
                  </div>
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="w-full font-mono"
                    onClick={() => runScheduler()}
                    disabled={isRunningScheduler || scheduler?.isRunning}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Force Run Chron Job Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Content Rules */}
            <div className="space-y-6">
              <Card className="border-border bg-card/50 backdrop-blur">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg font-mono flex items-center gap-2">
                    <Server className="w-4 h-4 text-primary" /> Target Niches
                  </CardTitle>
                  <CardDescription className="font-mono text-xs">Categories for content generation</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <FormField
                    control={form.control}
                    name="niches"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {NICHES.map((niche) => (
                            <FormField
                              key={niche.id}
                              control={form.control}
                              name="niches"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={niche.id}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-border p-3 hover:bg-secondary/20 transition-colors"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(niche.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, niche.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== niche.id
                                                )
                                              )
                                        }}
                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                                      />
                                    </FormControl>
                                    <FormLabel className="font-mono text-sm font-normal cursor-pointer leading-snug">
                                      {niche.label}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage className="pt-2 font-mono text-xs" />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="border-border bg-card/50 backdrop-blur">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-lg font-mono flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Media Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="imagesPerPost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono">Images Per Post</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={3} {...field} className="font-mono bg-background/50 border-border" />
                        </FormControl>
                        <FormDescription className="font-mono text-xs">Max 3 images per post</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="pexelsApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono">Pexels API Key</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="Optional: for stock images" 
                            {...field} 
                            value={field.value || ""}
                            className="font-mono bg-background/50 border-border" 
                          />
                        </FormControl>
                        <FormDescription className="font-mono text-xs">Required for image generation</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              size="lg" 
              className="font-mono min-w-[150px] shadow-lg shadow-primary/10"
              disabled={isUpdating}
            >
              {isUpdating ? "Saving..." : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}