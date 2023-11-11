const { Client } = require("pg");

async function main() {
  const environments = require("./environments.json");

  for (const environment of environments) {
    for (const service of environment.databases) {
      if (service.serviceName.includes("rotina")) {
        try {
          const url = service.dbUrl.split("//")[1].split(":")[0];
          const port = service.dbUrl.split("//")[1].split(":")[1].split("/")[0];
          const database = service.dbUrl
            .split("//")[1]
            .split(":")[1]
            .split("/")[1];

          const query = `
          CREATE INDEX IF NOT EXISTS t_detalhamento_rotina_id_rotina_idx ON rotina.t_detalhamento_rotina (id_rotina);

          CREATE INDEX IF NOT EXISTS t_rotina_tipo_idx ON rotina.t_rotina (tipo,status);
          `;

          await runQuery(
            {
              url: url,
              port: port,
              database: database,
              user: service.dbUser,
              password: service.dbPassword,
            },
            query
          );
        } catch (ex) {
          if (ex instanceof Error) {
            console.error(ex.message);
          }
        }
      }
    }
  }
}

async function runQuery({ url, port, database, user, password }, query) {
  const client = new Client({
    host: url,
    port: port,
    user: user,
    password: password,
    database: database,
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    console.log(`database: ${url}, executing query`);

    await client.query(query);

    console.log(`query executed successfully, committing.`);
    await client.query("COMMIT");
  } catch (ex) {
    console.error("Error during transaction, rolling back.");
    await client.query("ROLLBACK");
    throw ex;
  } finally {
    await client.end();
  }
}

main();
