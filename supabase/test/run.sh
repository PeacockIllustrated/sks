#!/usr/bin/env bash
#
# Runs the migrations and the RLS assertions against a throwaway Postgres.
#
#   PGHOST=/tmp PGPORT=5433 PGUSER=postgres ./supabase/test/run.sh
#
# Needs a plain Postgres 15+. The shim recreates just enough of Supabase
# (the auth schema, auth.uid(), the anon and authenticated roles) for the real
# policies to run unchanged.

set -euo pipefail

DB="${TEST_DB:-sks_test}"
PSQL="psql -v ON_ERROR_STOP=1 -q"

echo "Creating $DB"
$PSQL -d postgres -c "drop database if exists $DB;" -c "create database $DB;" >/dev/null

echo "Applying shim"
$PSQL -d "$DB" -f supabase/test/00_supabase_shim.sql 2>&1 | grep -v NOTICE || true

for file in supabase/migrations/*.sql; do
  echo "Applying $file"
  $PSQL -d "$DB" -f "$file" 2>&1 | grep -v NOTICE || true
done

for file in supabase/test/0[1-9]*.sql; do
  echo "Running $file"
  $PSQL -d "$DB" -f "$file" 2>&1 | sed 's/^psql.*NOTICE:  //'
done

echo "All assertions passed"
