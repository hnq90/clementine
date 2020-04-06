'use strict'

const { db, sql } = require('../persistence')

module.exports.up = async function(next) {
  await db.query(sql`
    CREATE TABLE IF NOT EXISTS traces (
      id uuid PRIMARY KEY,
      "graphId" uuid REFERENCES graphs (id) ON DELETE CASCADE NOT NULL,
      key text NOT NULL,
      "operationId" uuid NOT NULL,
      duration float NOT NULL,
      "startTime" timestamp with time zone NOT NULL,
      "endTime" timestamp with time zone NOT NULL,
      root jsonb NOT NULL,
      "clientName" text,
      "clientVersion" text,
      "schemaTag" text,
      "details" jsonb,
      "createdAt" timestamp with time zone default (now() at time zone 'utc') NOT NULL,
      "hasErrors" boolean NOT NULL
    );


  `)

  await db.query(sql`
    CREATE FUNCTION date_round(base_date timestamptz, round_interval interval)
      RETURNS timestamptz AS $BODY$
  SELECT '1970-01-01'::timestamptz
      + (EXTRACT(epoch FROM $1)::integer + EXTRACT(epoch FROM $2)::integer / 2)
      / EXTRACT(epoch FROM $2)::integer
      * EXTRACT(epoch FROM $2)::integer * interval '1 second';
  $BODY$ LANGUAGE SQL STABLE;
  `)

  // await db.query(sql`
  // CREATE INDEX "tracesGraphId" on traces ("graphId");
  // `)
  // await db.query(sql`
  // CREATE INDEX "tracesKey" on traces (key);
  // `)
  // await db.query(sql`
  // CREATE INDEX "tracesClientName" on traces ("clientName");
  // `)

  next()
}

module.exports.down = async function(next) {
  await db.query(sql`
    DROP TABLE traces;
  `)

  next()
}
