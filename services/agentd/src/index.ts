import { loadAgentdConfig } from "./config";
import { ensureRuntimeLayout } from "./runtime";
import { createAgentdServer } from "./server";

const config = loadAgentdConfig();
ensureRuntimeLayout(config);

const server = createAgentdServer(config);

server.listen(config.port, config.host, () => {
  process.stdout.write(
    `[agentd] listening on http://${config.host}:${config.port} with data dir ${config.dataDir}\n`,
  );
});
