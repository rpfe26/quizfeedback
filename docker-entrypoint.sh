#!/bin/sh
set -e

# S'assurer que le répertoire de données et les fichiers SQLite appartiennent à l'utilisateur node
mkdir -p /app/data
chown -R node:node /app/data
chmod -R 775 /app/data

exec su-exec node "$@"
