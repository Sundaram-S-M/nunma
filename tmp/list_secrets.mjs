import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
const client = new SecretManagerServiceClient();

async function run() {
  const projectId = 'nunma-by-cursor';
  try {
    const [secrets] = await client.listSecrets({parent: 'projects/' + projectId});
    const result = {};
    for (const secret of secrets) {
      const [versions] = await client.listSecretVersions({parent: secret.name});
      result[secret.name] = versions.map(v => ({ state: v.state, name: v.name, createTime: v.createTime }));
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(e);
  }
}

run();
