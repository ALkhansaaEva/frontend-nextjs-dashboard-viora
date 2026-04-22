'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { configsService } from '@/services';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  value?: string;
  description?: string;
}

interface SystemConfig {
  game?: Record<string, unknown>;
  rewards?: Record<string, unknown>;
  economy?: Record<string, unknown>;
  room?: Record<string, unknown>;
}

export default function SettingsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [configs, setConfigs] = useState<SystemConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'flags' | 'configs'>('flags');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [flagsData, configsData] = await Promise.all([
        configsService.getFeatureFlags(),
        configsService.getConfigs(),
      ]);
      setFlags(flagsData);
      setConfigs(configsData);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setError('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
    setIsSaving(true);
    try {
      await configsService.setFeatureFlag(key, !currentEnabled);
      setFlags(flags.map(f => 
        f.key === key ? { ...f, enabled: !currentEnabled } : f
      ));
    } catch (err) {
      console.error('Failed to update flag:', err);
      setError('Failed to update flag');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefreshConfigs = async () => {
    setIsSaving(true);
    try {
      await configsService.refreshConfigs();
      await fetchData();
    } catch (err) {
      console.error('Failed to refresh configs:', err);
      setError('Failed to refresh configs');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefreshConfigs} disabled={isSaving}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isSaving ? 'animate-spin' : ''}`} />
            Refresh Configs
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('flags')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'flags'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          Feature Flags
        </button>
        <button
          onClick={() => setActiveTab('configs')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'configs'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          System Configs
        </button>
      </div>

      {activeTab === 'flags' && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {flags.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No feature flags configured</p>
              ) : (
                flags.map((flag) => (
                  <div
                    key={flag.key}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{flag.key}</p>
                      {flag.description && (
                        <p className="text-sm text-gray-500">{flag.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                      disabled={isSaving}
                      className="flex items-center"
                    >
                      {flag.enabled ? (
                        <ToggleRight className="w-8 h-8 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-400" />
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'configs' && (
        <Card>
          <CardHeader>
            <CardTitle>System Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {configs?.game && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Game Config</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {JSON.stringify(configs.game, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {configs?.rewards && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Rewards Config</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {JSON.stringify(configs.rewards, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {configs?.economy && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Economy Config</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {JSON.stringify(configs.economy, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              {configs?.room && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">Room Config</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {JSON.stringify(configs.room, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}