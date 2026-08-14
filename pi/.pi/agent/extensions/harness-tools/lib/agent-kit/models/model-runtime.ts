import type { Api, Model } from "@earendil-works/pi-ai";
import {
  CredentialSynchronizationError,
  type ModelRegistry,
  ModelRuntime,
} from "@earendil-works/pi-coding-agent";

type CreateModelRuntime = typeof ModelRuntime.create;

export async function createSubagentModelRuntime(
  registry: ModelRegistry,
  model: Model<Api>,
  createRuntime: CreateModelRuntime = ModelRuntime.create,
): Promise<ModelRuntime> {
  const runtime = await createRuntime();
  const providerConfig = registry.getRegisteredProviderConfig(model.provider);
  if (providerConfig) runtime.registerProvider(model.provider, providerConfig);
  const apiKey = await registry.getApiKeyForProvider(model.provider);
  if (apiKey && !registry.isUsingOAuth(model)) {
    try {
      await runtime.setRuntimeApiKey(model.provider, apiKey);
    } catch (error) {
      if (!(error instanceof CredentialSynchronizationError)) throw error;
    }
  }
  return runtime;
}
