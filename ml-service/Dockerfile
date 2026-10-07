# Usa uma imagem Python enxuta para executar o serviço de ML.
FROM python:3.11-slim

# Evita arquivos de bytecode e saída em buffer e desativa o cache do pip.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Define a pasta de trabalho dentro do container.
WORKDIR /app

# Instala as bibliotecas declaradas pelo serviço.
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copia o código e os dados necessários para a imagem.
COPY app ./app
COPY artifacts ./artifacts
COPY data ./data
COPY scripts ./scripts

# Executa o processo com um usuário sem privilégios de administrador.
RUN useradd --create-home appuser && chown -R appuser /app
USER appuser

# Informa a porta e verifica periodicamente se a API responde.
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Inicia a API pelo servidor Uvicorn.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]