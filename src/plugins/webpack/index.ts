import { compact } from '../../util/array.js';
import { _load } from '../../util/loader.js';
import { timerify } from '../../util/performance.js';
import type { IsPluginEnabledCallback, GenericPluginCallback } from '../../types/plugins.js';
import type { Configuration, RuleSetRule, RuleSetUseItem } from 'webpack';

// https://webpack.js.org/configuration/

export const CONFIG_FILE_PATTERNS = ['webpack.config*.js'];

export const ENTRY_FILE_PATTERNS = ['webpack.config*.js'];

export const isEnabled: IsPluginEnabledCallback = ({ dependencies }) => dependencies.has('webpack');

const resolveRuleSetLoaders = (rule: RuleSetRule | '...') => {
  if (!rule || typeof rule === 'string') return [];
  if (typeof rule.use === 'string') return [rule.use];
  if (Array.isArray(rule.use)) return rule.use.flatMap(resolveUseItemLoader);
  return rule.use && typeof rule.use !== 'function' ? resolveUseItemLoader(rule.use) : [];
};

const resolveUseItemLoader = (use: RuleSetUseItem) => {
  if (!use) return [];
  if (typeof use === 'string') return [use];
  if ('loader' in use && typeof use.loader === 'string') return [use.loader];
  return [];
};

const findWebpackDependencies: GenericPluginCallback = async (configFilePath, { manifest }) => {
  const config: Configuration = await _load(configFilePath);

  const loaders = (config.module?.rules?.flatMap(resolveRuleSetLoaders) ?? [])
    .map(loader => loader.replace(/\?.*/, ''))
    .filter(loader => !loader.startsWith('/'));

  const scripts = Object.values(manifest.scripts ?? {});
  const webpackCLI = scripts.some(script => script?.includes('webpack ')) ? ['webpack-cli'] : [];
  const webpackDevServer = scripts.some(script => script?.includes('webpack serve')) ? ['webpack-dev-server'] : [];

  return compact([...loaders, ...webpackCLI, ...webpackDevServer]);
};

export const findDependencies = timerify(findWebpackDependencies);