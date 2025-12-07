import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { useToast } from '../contexts/ToastContext';

export default function Settings() {
  const { user, updateUser, loadUser } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({ firstName: '', lastName: '', phoneNumber: '' });
  const [settings, setSettings] = useState({
    notifications: { email: true, push: true },
    language: 'en',
    timezone: 'Asia/Kolkata',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  const languages = useMemo(() => ([
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'Hindi' },
    { value: 'kn', label: 'Kannada' },
    { value: 'ta', label: 'Tamil' }
  ]), []);

  const timezones = useMemo(() => ([
    'UTC',
    'Asia/Kolkata',
    'Asia/Dubai',
    'Asia/Singapore',
    'Europe/London',
  ]), []);

  useEffect(() => {
    if (!user) return;
    const p = user.profile || {};
    setProfile({
      firstName: p.firstName || '',
      lastName: p.lastName || '',
      phoneNumber: p.phoneNumber || ''
    });
    setSettings({
      notifications: {
        email: user.settings?.notifications?.email ?? true,
        push: user.settings?.notifications?.push ?? true,
      },
      language: user.settings?.language || 'en',
      timezone: user.settings?.timezone || 'Asia/Kolkata',
    });
  }, [user]);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    // Basic validation
    const phone = String(profile.phoneNumber || '').replace(/\D/g, '');
    if (!/^\d{10}$/.test(phone)) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      setSavingProfile(true);
      const payload = {
        'profile.firstName': profile.firstName.trim(),
        'profile.lastName': profile.lastName.trim(),
        'profile.phoneNumber': phone,
      };
      const res = await updateUser(payload);
      if (res.success) {
        toast.success('Profile updated');
        await loadUser();
      } else {
        toast.error(res.error || 'Failed to update profile');
      }
    } catch (err) {
      toast.error(err.message || 'Error updating profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSettingsSave = async (e) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      const payload = {
        settings: {
          notifications: {
            email: Boolean(settings.notifications.email),
            push: Boolean(settings.notifications.push),
          },
          language: settings.language,
          timezone: settings.timezone,
        }
      };
      const res = await updateUser(payload);
      if (res.success) {
        toast.success('Settings saved');
        await loadUser();
      } else {
        toast.error(res.error || 'Failed to save settings');
      }
    } catch (err) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.next) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (passwordForm.next.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      const resp = await api.changePassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next });
      if (resp.success) {
        toast.success('Password changed successfully');
        setPasswordForm({ current: '', next: '', confirm: '' });
      } else {
        toast.error(resp.message || 'Failed to change password');
      }
    } catch (err) {
      toast.error(err.message || 'Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Manage your profile, preferences, and security.</p>
      </div>

      {/* Profile */}
      <section className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Update your personal information. Email and username are managed by administrators.</p>
        <form onSubmit={handleProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">First name</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Last name</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Phone number</label>
            <input
              type="tel"
              placeholder="10-digit number"
              value={profile.phoneNumber}
              onChange={(e) => setProfile((p) => ({ ...p, phoneNumber: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div className="opacity-70">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input type="email" value={user?.email || ''} disabled className="mt-1 block w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 px-3 py-2" />
          </div>
          <div className="opacity-70">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Username</label>
            <input type="text" value={user?.username || ''} disabled className="mt-1 block w-full rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 px-3 py-2" />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <button type="button" onClick={() => loadUser()} className="btn-secondary">Reset</button>
            <button type="submit" className="btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Preferences */}
      <section className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Preferences</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Notification and localization settings.</p>
        <form onSubmit={handleSettingsSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</label>
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={settings.notifications.email} onChange={(e) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, email: e.target.checked } }))} />
                Email
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input type="checkbox" checked={settings.notifications.push} onChange={(e) => setSettings((s) => ({ ...s, notifications: { ...s.notifications, push: e.target.checked } }))} />
                Push
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Language</label>
            <select
              value={settings.language}
              onChange={(e) => setSettings((s) => ({ ...s, language: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              {languages.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Timezone</label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 mt-2">
            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Saving...' : 'Save preferences'}
            </button>
          </div>
        </form>
      </section>

      {/* Security */}
      <section className="card p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Security</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Change your password regularly to keep your account secure.</p>
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Current password</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New password</label>
            <input
              type="password"
              value={passwordForm.next}
              onChange={(e) => setPasswordForm((f) => ({ ...f, next: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Confirm new password</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          <div className="md:col-span-3 flex justify-end gap-3 mt-2">
            <button type="submit" className="btn-primary" disabled={changingPassword}>
              {changingPassword ? 'Changing...' : 'Change password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
