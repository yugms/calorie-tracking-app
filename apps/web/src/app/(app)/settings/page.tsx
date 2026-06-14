import { getProfile } from '@/lib/data/queries';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const profile = await getProfile();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>Settings</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
          Your stats set your daily calorie goal automatically.
        </p>
      </div>
      <SettingsForm profile={profile} />
    </div>
  );
}
