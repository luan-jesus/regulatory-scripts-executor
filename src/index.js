const { Client } = require("pg");

async function main() {
  const environments = require("./environments.json");

  for (const environment of environments) {
    for (const service of environment.databases) {
      if (service.serviceName.includes("autenticacao")) {
        const url = service.dbUrl.split("//")[1].split(":")[0];
        const port = service.dbUrl.split("//")[1].split(":")[1].split("/")[0];
        const database = service.dbUrl
          .split("//")[1]
          .split(":")[1]
          .split("/")[1];

        const query = `
        DO $$
        DECLARE
          qtd INT = 0;
          begin
            SELECT count(*) INTO qtd FROM autenticacao.t_usuario WHERE email = 'juliano.santos@izatta.tech';
            IF qtd <= 0 THEN
              INSERT INTO autenticacao.t_usuario (nome, email, login, valor_senha, reset_token_senha, tentativas_erro_senha, data_ultima_alteracao_senha, status, id_usuario_atualizacao, data_atualizacao, "version")
              VALUES('Juliano Santos', 'juliano.santos@izatta.tech', 'juliano.santos', null, 'reset-token$2020-juliano.santos', 0, null, 'PENDENTE'::character varying, 0, null, 0);
              
              INSERT INTO autenticacao.t_usuario_grupo (id_usuario, id_grupo) 
              VALUES ((SELECT id FROM autenticacao.t_usuario WHERE login = 'juliano.santos'), 5);
          END IF;
        END $$;
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
