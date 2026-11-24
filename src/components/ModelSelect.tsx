import { useEffect, useState } from 'react';
import { aiSettingsApi, type AiModel, type AiProvider } from '../api/aiSettingsApi';

// AI-13: one model list for every prompt (ai-writing and ai-prompts): the enabled text models of every provider in
// "הגדרות AI", grouped by provider (OpenAI next to Claude). A model whose provider is off or has no key is still listed,
// marked, so it can be picked for a test once the provider is turned on.

export interface ModelChoice { model: AiModel; provider: AiProvider | undefined }

let cache: Promise<ModelChoice[]> | null = null;
export const textModelChoices = () => {
  cache ??= aiSettingsApi.get().then(({ data }) => data.models
    .filter((m) => m.enabled && m.capabilities.includes('text'))
    .map((m) => ({ model: m, provider: data.providers.find((p) => p.key === m.providerKey) })))
    .catch((e) => { cache = null; throw e; });
  return cache;
};
/** Tests only. */
export const resetModelChoices = () => { cache = null; };

const PROVIDER_NAMES: Record<string, string> = { openai: 'OpenAI', anthropic: 'Claude (Anthropic)', gemini: 'Gemini' };

export function providerNote(p: AiProvider | undefined): string {
  if (!p) return '';
  if (!p.enabled) return ' · הספק כבוי';
  if (!p.credentialsConfigured) return ' · אין מפתח';
  return '';
}

interface Props {
  value: string;
  onChange: (model: string) => void;
  /** The empty option's text: '' means the group's / the default model. */
  emptyLabel: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}

export default function ModelSelect({ value, onChange, emptyLabel, ariaLabel, style }: Props) {
  const [choices, setChoices] = useState<ModelChoice[]>([]);
  useEffect(() => { void textModelChoices().then(setChoices).catch(() => setChoices([])); }, []);
  const providers = [...new Set(choices.map((c) => c.model.providerKey))];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={ariaLabel} style={style}>
      <option value="">{emptyLabel}</option>
      {providers.map((key) => (
        <optgroup key={key} label={PROVIDER_NAMES[key] ?? key}>
          {choices.filter((c) => c.model.providerKey === key).map(({ model, provider }) => (
            <option key={model.modelKey} value={model.modelKey}>{model.displayName} ({model.modelKey}){providerNote(provider)}</option>
          ))}
        </optgroup>
      ))}
      {value && !choices.some((c) => c.model.modelKey === value) && <option value={value}>{value} (לא ברשימה)</option>}
    </select>
  );
}
