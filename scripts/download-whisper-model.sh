#!/usr/bin/env bash
# Baixa um modelo ggml do Whisper com o script oficial do whisper.cpp (de dentro da imagem Docker)
# para docker/whisper/models. O script oficial pula o download se o arquivo já existir.
# Uso: scripts/download-whisper-model.sh [large-v3-turbo|large-v3|medium|...]
set -e
cd "$(dirname "$0")/.."
docker compose run --rm --no-deps whisper "./models/download-ggml-model.sh ${1:-large-v3-turbo} /models"
