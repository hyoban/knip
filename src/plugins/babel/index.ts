import { compact } from '../../util/array.js';
import { _load } from '../../util/loader.js';
import { timerify } from '../../util/performance.js';
import { resolvePresetName, resolvePluginName } from './helpers.js';
import type { IsPluginEnabledCallback, GenericPluginCallback } from '../../types/plugins.js';
import type { BabelConfig } from './types.js';

// https://babeljs.io/docs/en/configuration

export const CONFIG_FILE_PATTERNS = [
  'babel.config.json',
  'babel.config.js',
  '.babelrc.json',
  '.babelrc.js',
  '.babelrc',
  'package.json',
];

export const isEnabled: IsPluginEnabledCallback = ({ dependencies }) => {
  return (
    dependencies.has('@babel/cli') ||
    dependencies.has('@babel/core') ||
    dependencies.has('@babel/preset-env') ||
    dependencies.has('@babel/register')
  );
};

const api = {
  caller: () => true,
};

type BabelFn = (options: typeof api) => BabelConfig;

const getDependenciesFromConfig = (config: BabelConfig) => {
  const presets =
    config.presets?.map(preset => (typeof preset === 'string' ? preset : preset[0])).map(resolvePresetName) ?? [];
  const plugins =
    config.plugins?.map(plugin => (typeof plugin === 'string' ? plugin : plugin[0])).map(resolvePluginName) ?? [];
  return compact([...presets, ...plugins]);
};

const findBabelDependencies: GenericPluginCallback = async (configFilePath, { manifest }) => {
  let config: BabelConfig | BabelFn = configFilePath.endsWith('package.json')
    ? manifest.babel
    : await _load(configFilePath);
  if (typeof config === 'function') {
    config = config(api);
  }
  return config ? getDependenciesFromConfig(config) : [];
};

export const findDependencies = timerify(findBabelDependencies);