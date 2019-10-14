#!/usr/bin/env ash

set -u   # crash on missing env variables
set -e   # stop on any error

npx sequelize-cli db:migrate