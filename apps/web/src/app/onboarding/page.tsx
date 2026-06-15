import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingWizard, type WizardPrefill } from './onboarding-wizard';

export const dynamic = 'force-dynamic';

/**
 * Onboarding gate. Completed users are sent to the dashboard; everyone else gets
 * the wizard, pre-filled from any values already on their profile.
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'onboarded_at, display_name, dob, sex, height_cm, weight_kg, activity_level, primary_goal, target_weight_kg, weekly_rate_kg, diet_profile, exclusions, training_notes, units_pref',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect('/dashboard');

  const prefill: WizardPrefill = {
    display_name: profile?.display_name ?? null,
    dob: profile?.dob ?? null,
    sex: profile?.sex ?? null,
    height_cm: profile?.height_cm ?? null,
    weight_kg: profile?.weight_kg ?? null,
    activity_level: profile?.activity_level ?? null,
    primary_goal: profile?.primary_goal ?? null,
    target_weight_kg: profile?.target_weight_kg ?? null,
    weekly_rate_kg: profile?.weekly_rate_kg ?? null,
    diet_profile: profile?.diet_profile ?? null,
    exclusions: profile?.exclusions ?? [],
    training_notes: profile?.training_notes ?? null,
    units_pref: profile?.units_pref ?? null,
  };

  return <OnboardingWizard prefill={prefill} />;
}
