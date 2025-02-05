const { Client } = require("pg");
const fs = require('fs');

// Params
const SERVICE = "auditoria";
const QUERY = `
select * from auditoria.t_auditoria
where data_referencia >= '2025-01-15' and status = 'ALERTA'
`;
const OUTPUT_DIR = "./files";
const OUTPUT_FILE_NAME = "auditorias-15-pra-frente";
const WRITE_RESPONSE_TO_FILE = true;
const CSV_DELIMITER = ";";

var isHeaderWritten = false;

async function main() {
  const environments = require("./environments.json");
  const file = `${OUTPUT_DIR}/${OUTPUT_FILE_NAME}-${new Date().getTime()}.csv`;

  for (const environment of environments) {
    for (const service of environment.databases) {
      if (service.serviceName.includes(SERVICE)) {
        try {
          const url = service.dbUrl.split("//")[1].split(":")[0];
          const port = service.dbUrl.split("//")[1].split(":")[1].split("/")[0];
          const database = service.dbUrl
            .split("//")[1]
            .split(":")[1]
            .split("/")[1];

          await runQuery(
            {
              url: url,
              port: port,
              database: database,
              user: service.dbUser,
              password: service.dbPassword,
              environmentName: environment.name,
              file: file
            },
            QUERY
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

async function runQuery({ url, port, database, user, password, environmentName, file }, query) {
  const client = new Client({
    host: url,
    port: port,
    user: user,
    password: password,
    database: database,
    ssl: {
      require: false,
      rejectUnauthorized: false
    }
  });

  await client.connect();

  try {
    await client.query("BEGIN");

    console.log(`database: ${url}, executing query`);

    const response = await client.query(query);

    if (WRITE_RESPONSE_TO_FILE) {
      writeToFile(file, response, environmentName);
    }

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

function writeToFile(file, response, environmentName) {
  try {
    console.log(`Writing response to file: ${file}`);

    if (!fs.existsSync(OUTPUT_DIR)){
      fs.mkdirSync(OUTPUT_DIR);
    }

    if (!isHeaderWritten) {
      let header = "";
      for (const field of response.fields) {
        header += field?.name;
        header += CSV_DELIMITER;
      }
      header += "ambiente";
      header += "\n";
  
      fs.writeFileSync(file, header);

      isHeaderWritten = true;
    }


    for (const item of response.rows) {
      let content = "";

      for (const property in item) {
        content += JSON.stringify(item[property]);
        content += CSV_DELIMITER;
      }

      content += environmentName;
      content += "\n";

      fs.appendFileSync(file, content);
    }

  } catch (ex) {
    console.error(ex);
    throw ex;
  }
}

main();
