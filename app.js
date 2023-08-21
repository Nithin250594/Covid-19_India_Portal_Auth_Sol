const express = require("express");
const app = express();
module.exports = app;

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

app.use(express.json());

const dbPath = path.join(__dirname, "covid19IndiaPortal.db");

let db = null;

const initializationDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000);
  } catch (e) {
    console.log(`DB-error:${e.message}`);
    process.exit(1);
  }
};

initializationDBAndServer();

// Middleware function

function AuthenticationToken(request, response, next) {
  let jwtToken;
  const authHeaders = request.headers["authorization"];
  if (authHeaders !== undefined) {
    jwtToken = authHeaders.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "The_secret_code", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
}

// API 1
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUsernameQuery = `SELECT * FROM user WHERE username='${request.body.username}';`;
  const checkUsername = await db.get(checkUsernameQuery);
  if (checkUsername === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkPassword = await bcrypt.compare(
      request.body.password,
      checkUsername.password
    );
    if (checkPassword === true) {
      const payload = { username: checkUsername.username };
      const jwtToken = jwt.sign(payload, "The_secret_code");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 2

app.get("/states/", AuthenticationToken, async (request, response) => {
  const getStatesListQuery = `SELECT state_id AS stateId, state_name AS stateName, population FROM state;`;
  const getStatesList = await db.all(getStatesListQuery);
  response.send(getStatesList);
});

// API 3

app.get("/states/:stateId/", AuthenticationToken, async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT state_id as stateId, state_name as stateName, population FROM state WHERE state_id=${stateId};`;
  const getState = await db.get(getStateQuery);
  response.send(getState);
});

// API 4

app.post("/districts/", AuthenticationToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const insertDistrictQuery = `
    INSERT INTO district(district_name,state_id,
        cases,cured,active,deaths)
        VALUES (
            '${districtName}',
            ${stateId},
            ${cases},
            ${cured},
            ${active},
            ${deaths});`;
  const insertDistrict = await db.run(insertDistrictQuery);
  response.send("District Successfully Added");
});

// API 5

app.get(
  "/districts/:districtId/",
  AuthenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getDistrictQuery = `
    SELECT district_id AS districtId, district_name AS districtName,
    state_id AS stateId, cases,cured,active,deaths FROM district
    WHERE district_id=${districtId};`;
    const getDistrict = await db.get(getDistrictQuery);
    response.send(getDistrict);
  }
);

//API 6

app.delete(
  "/districts/:districtId/",
  AuthenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteDistrictQuery = `
    DELETE FROM district WHERE district_id=${districtId};`;
    const deleteDistrict = await db.run(deleteDistrictQuery);

    response.send("District Removed");
  }
);

// API 7
app.put(
  "/districts/:districtId/",
  AuthenticationToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;

    const updateDistrictQuery = `
    UPDATE district
    SET district_name= '${districtName}',
        state_id= ${stateId},
        cases=${cases},
        cured=${cured},
        active=${active},
        deaths=${deaths}
    WHERE district_id= ${districtId};`;
    const updateDistrict = await db.run(updateDistrictQuery);

    response.send("District Details Updated");
  }
);

// API 8
app.get(
  "/states/:stateId/stats/",
  AuthenticationToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getStatsQuery = `
    SELECT SUM(cases) AS totalCases, SUM(cured) AS totalCured,
    SUM(active) AS totalActive, SUM(deaths) AS totalDeaths FROM district
    WHERE state_id=${stateId};`;
    const getStats = await db.get(getStatsQuery);
    console.log(getStats);

    response.send(getStats);
  }
);
