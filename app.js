const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "covid19India.db");

const app = express();
app.use(express.json());
let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("connection started successfully");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeDBAndServer();

//let's start

const convertDbObjToResponse = (obj) => {
  return {
    stateId: obj.state_id,
    stateName: obj.state_name,
    population: obj.population,
  };
};

const convertDistrictObjToResponse = (obj) => {
  return {
    districtId: obj.district_id,
    districtName: obj.district_name,
    stateId: obj.state_id,
    cases: obj.cases,
    cured: obj.cured,
    active: obj.active,
    deaths: obj.deaths,
  };
};

//GET STATES API
app.get("/states/", async (request, response) => {
  const getStatesQuery = `
    select
        *
    from
        state`;
  const statesArray = await db.all(getStatesQuery);
  response.send(
    statesArray.map((eachState) => convertDbObjToResponse(eachState))
  );
});

//GET STATE API
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    select 
        *
    from
        state
    where
        state_id = ${stateId}`;
  const stateArray = await db.get(getStateQuery);
  response.send(convertDbObjToResponse(stateArray));
});

//GET DISTRICT API
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    select 
        *
    from
        district
    where
        district_id = ${districtId}`;
  const districtArray = await db.get(getDistrictQuery);
  response.send(convertDistrictObjToResponse(districtArray));
});

//ADD DISTRICT
app.post("/districts/", async (request, response) => {
  const { stateId, districtName, cases, cured, active, deaths } = request.body;
  const addDistrictQuery = `
    insert
        into
    district (state_id, district_name, cases, cured, active, deaths)
    values
        (${stateId}, '${districtName}', ${cases}, ${cured}, ${active}, ${deaths})`;
  await db.run(addDistrictQuery);
  response.send("District Successfully Added");
});
//DELETE DISTRICT
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteDistrictQuery = `
    delete
        from
    district
        where
            district_id = ${districtId}`;
  await db.run(deleteDistrictQuery);
  response.send("District Removed");
});

//UPDATE DISTRICT
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;

  const updateDistrictQuery = `
    update district
    set
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    where district_id = ${districtId};`;
  await db.run(updateDistrictQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
    select
        SUM(cases),
        SUM(cured),
        SUM(active),
        SUM(deaths)
    from 
        district
    where
        state_id = ${stateId};`;
  const stats = await db.get(getStatsQuery);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});
// GET DISTRICT DETAILS
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getStateNameQuery = `
    SELECT
      state_name
    FROM
      district
      NATURAL JOIN state
    WHERE 
      district_id=${districtId};`;
  const state = await db.get(getStateNameQuery);
  response.send({ stateName: state.state_name });
});

module.exports = app;
