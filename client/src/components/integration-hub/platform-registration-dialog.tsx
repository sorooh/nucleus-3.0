/**
 * ═══════════════════════════════════════════════════════════
 * Platform Registration Dialog
 * ═══════════════════════════════════════════════════════════
 * Phase 4: Platform Registration Form
 * Cyberpunk 2050 UI - Neon + Glassmorphism
 * ZERO TOLERANCE for mock data - only real database inserts
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Plus, Loader2 } from 'lucide-react';

// Validation schema (matches backend)
const platformSchema = z.object({
  platformId: z
    .string()
    .min(2, 'Platform ID must be at least 2 characters')
    .max(50, 'Platform ID must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Platform ID must be lowercase alphanumeric with hyphens only'),
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(100, 'Display name must be less than 100 characters'),
  arabicName: z.string().optional(),
  platformType: z.string().min(2, 'Platform type is required'),
  description: z.string().optional(),
  authMode: z.enum(['INTERNAL_JWT', 'ENHANCED']).default('INTERNAL_JWT'),
  ownerTeam: z.string().optional(),
  rateLimitRPM: z.coerce.number().int().min(1).max(10000).default(100),
});

type PlatformFormData = z.infer<typeof platformSchema>;

const platformTypes = [
  'CORE_NUCLEUS',
  'FEDERATION',
  'ACADEMY',
  'MAILHUB',
  'CUSTOMER_SERVICE',
  'CHAT_PLATFORM',
  'DOCS',
  'B2B',
  'B2C',
  'ACCOUNTING',
  'CE',
  'SECRETARY',
  'WALLET',
  'MULTIBOT',
  'INTEGRATION_GATEWAY',
  'INTELLIGENCE_FEED',
  'OTHER',
];

export function PlatformRegistrationDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<PlatformFormData>({
    resolver: zodResolver(platformSchema),
    defaultValues: {
      platformId: '',
      displayName: '',
      arabicName: '',
      platformType: '',
      description: '',
      authMode: 'INTERNAL_JWT',
      ownerTeam: '',
      rateLimitRPM: 100,
    },
  });

  const registerPlatform = useMutation({
    mutationFn: async (data: PlatformFormData) => {
      const res = await apiRequest('/api/integration-hub/platforms', 'POST', data);
      return res.json();
    },
    onSuccess: (response: any) => {
      console.log('[Registration] ✅ Platform registered:', response.data);
      
      // Invalidate platforms cache to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/platforms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/integration-hub/stats'] });
      
      toast({
        title: 'Platform Registered',
        description: `${response.data.displayName} has been added successfully.`,
        variant: 'default',
      });
      
      // Close dialog and reset form
      setOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error('[Registration] ❌ Error:', error);
      
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register platform',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PlatformFormData) => {
    console.log('[Registration] 📤 Submitting:', data);
    registerPlatform.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          data-testid="button-add-platform"
          className="gap-2 bg-primary/20 border border-primary/30 hover-elevate active-elevate-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Platform</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            Register New Platform
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Add a new platform to the Integration Hub. All fields marked with * are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Platform ID */}
            <FormField
              control={form.control}
              name="platformId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform ID *</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-platform-id"
                      placeholder="e.g., senorbit, platform-x"
                      {...field}
                      className="bg-background/50 border-primary/20"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Unique identifier (lowercase, alphanumeric, hyphens only)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display Name */}
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name *</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-display-name"
                      placeholder="e.g., Senorbit - The Thinking Orbit"
                      {...field}
                      className="bg-background/50 border-primary/20"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Human-readable name for the platform
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Arabic Name */}
            <FormField
              control={form.control}
              name="arabicName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Arabic Name (اسم عربي)</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-arabic-name"
                      placeholder="e.g., سينوربت - المدار المفكر"
                      {...field}
                      className="bg-background/50 border-primary/20 text-right"
                      dir="rtl"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Optional Arabic name
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform Type */}
            <FormField
              control={form.control}
              name="platformType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform Type *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger
                        data-testid="select-platform-type"
                        className="bg-background/50 border-primary/20"
                      >
                        <SelectValue placeholder="Select platform type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {platformTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Auth Mode */}
            <FormField
              control={form.control}
              name="authMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Authentication Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger
                        data-testid="select-auth-mode"
                        className="bg-background/50 border-primary/20"
                      >
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="INTERNAL_JWT">Internal JWT</SelectItem>
                      <SelectItem value="ENHANCED">Enhanced (JWT + HMAC)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-xs text-muted-foreground">
                    Security authentication protocol
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      data-testid="input-description"
                      placeholder="Brief description of the platform..."
                      {...field}
                      className="bg-background/50 border-primary/20 min-h-[80px]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Owner Team */}
            <FormField
              control={form.control}
              name="ownerTeam"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner Team</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-owner-team"
                      placeholder="e.g., AI Development Team"
                      {...field}
                      className="bg-background/50 border-primary/20"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Rate Limit */}
            <FormField
              control={form.control}
              name="rateLimitRPM"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate Limit (RPM)</FormLabel>
                  <FormControl>
                    <Input
                      data-testid="input-rate-limit"
                      type="number"
                      placeholder="100"
                      {...field}
                      className="bg-background/50 border-primary/20"
                    />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">
                    Requests per minute (1-10000)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={registerPlatform.isPending}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={registerPlatform.isPending}
                data-testid="button-submit"
                className="gap-2"
              >
                {registerPlatform.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Register Platform</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
