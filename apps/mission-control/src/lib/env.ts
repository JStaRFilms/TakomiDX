import {
  missionControlPublicEnvSchema,
  sharedRuntimeEnvSchema,
} from "@takomi/contracts";

export function resolveMissionControlEnv() {
  const shared = sharedRuntimeEnvSchema.parse({
    TAKOMI_APP_NAME: process.env.TAKOMI_APP_NAME,
    TAKOMI_DATA_DIR: process.env.TAKOMI_DATA_DIR,
    TAKOMI_PREVIEW_DOMAIN: process.env.TAKOMI_PREVIEW_DOMAIN,
    TAKOMI_RUNTIME_BACKEND: process.env.TAKOMI_RUNTIME_BACKEND,
    TAKOMI_EDITOR_TARGET: process.env.TAKOMI_EDITOR_TARGET,
  });

  const publicEnv = missionControlPublicEnvSchema.parse({
    NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL:
      process.env.NEXT_PUBLIC_TAKOMI_AGENTD_BASE_URL,
    NEXT_PUBLIC_TAKOMI_PREVIEW_DOMAIN:
      process.env.NEXT_PUBLIC_TAKOMI_PREVIEW_DOMAIN,
  });

  return {
    public: publicEnv,
    shared,
  };
}
